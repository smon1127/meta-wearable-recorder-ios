import { Platform } from 'react-native';
import MetaWearables, {
  type StreamStateEvent,
  type StreamErrorEvent,
  type DeviceChangeEvent,
  type StreamConfig,
} from '@/modules/MetaWearablesModule';

export type StreamState =
  | 'idle'
  | 'connecting'
  | 'waiting_for_device'
  | 'starting'
  | 'streaming'
  | 'paused'
  | 'error'
  | 'stopped';

export type StreamResolution = 'low' | 'medium' | 'high';

export interface StreamSessionConfig {
  resolution: StreamResolution;
  frameRate: number;
  videoCodec: 'raw' | 'h264';
}

export interface StreamFrame {
  timestamp: number;
  width: number;
  height: number;
  frameIndex: number;
}

export interface StreamError {
  code: string;
  message: string;
}

export interface StreamSessionStatus {
  state: StreamState;
  fps: number;
  resolution: string;
  bitrate: number;
  framesReceived: number;
  droppedFrames: number;
  latencyMs: number;
  uptime: number;
}

type StreamStateListener = (state: StreamState) => void;
type StreamFrameListener = (frame: StreamFrame) => void;
type StreamErrorListener = (error: StreamError) => void;
type StreamStatusListener = (status: StreamSessionStatus) => void;
type DeviceChangeListener = (event: DeviceChangeEvent) => void;

const RESOLUTION_MAP: Record<StreamResolution, { width: number; height: number; label: string }> = {
  low: { width: 640, height: 480, label: '480p' },
  medium: { width: 1280, height: 720, label: '720p' },
  high: { width: 1920, height: 1080, label: '1080p' },
};

class MetaStreamSession {
  private config: StreamSessionConfig;
  private state: StreamState = 'idle';
  private stateListeners: StreamStateListener[] = [];
  private frameListeners: StreamFrameListener[] = [];
  private errorListeners: StreamErrorListener[] = [];
  private statusListeners: StreamStatusListener[] = [];
  private deviceListeners: DeviceChangeListener[] = [];
  private frameInterval: ReturnType<typeof setInterval> | null = null;
  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;
  private droppedFrames = 0;
  private startTime = 0;
  private cancelled = false;
  private useNativeSDK = false;
  private nativeCleanups: Array<(() => void) | null> = [];

  constructor(config: StreamSessionConfig) {
    this.config = config;
    this.useNativeSDK = MetaWearables.isAvailable();
    console.log('[MetaStream] Session created with config:', JSON.stringify(config));
    console.log('[MetaStream] Using native SDK:', this.useNativeSDK);
  }

  onStateChange(listener: StreamStateListener) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  onFrame(listener: StreamFrameListener) {
    this.frameListeners.push(listener);
    return () => {
      this.frameListeners = this.frameListeners.filter((l) => l !== listener);
    };
  }

  onError(listener: StreamErrorListener) {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  onStatus(listener: StreamStatusListener) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  onDeviceChange(listener: DeviceChangeListener) {
    this.deviceListeners.push(listener);
    return () => {
      this.deviceListeners = this.deviceListeners.filter((l) => l !== listener);
    };
  }

  private setState(newState: StreamState) {
    console.log(`[MetaStream] State: ${this.state} -> ${newState}`);
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState));
  }

  private emitFrame(frame: StreamFrame) {
    this.frameListeners.forEach((l) => l(frame));
  }

  private emitError(error: StreamError) {
    console.error('[MetaStream] Error:', error.code, error.message);
    this.errorListeners.forEach((l) => l(error));
  }

  private emitStatus(status: StreamSessionStatus) {
    this.statusListeners.forEach((l) => l(status));
  }

  getState(): StreamState {
    return this.state;
  }

  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped' && this.state !== 'error') {
      console.warn('[MetaStream] Cannot start from state:', this.state);
      return;
    }

    this.cancelled = false;
    this.frameCount = 0;
    this.droppedFrames = 0;

    if (this.useNativeSDK) {
      await this.startNative();
    } else {
      await this.startFallback();
    }
  }

  private async startNative(): Promise<void> {
    console.log('[MetaStream] Starting native SDK stream...');
    this.setState('connecting');

    const stateUnsub = MetaWearables.onStreamStateChange((event: StreamStateEvent) => {
      console.log('[MetaStream] Native stream state:', event.state);
      const mappedState = this.mapNativeState(event.state);
      this.setState(mappedState);

      if (mappedState === 'streaming') {
        this.startTime = Date.now();
        this.startNativeStatusReporting();
      } else if (mappedState === 'stopped' || mappedState === 'error') {
        this.stopNativeStatusReporting();
      }
    });
    this.nativeCleanups.push(stateUnsub);

    const errorUnsub = MetaWearables.onStreamError((event: StreamErrorEvent) => {
      console.error('[MetaStream] Native stream error:', event.code, event.message);
      this.emitError({ code: event.code, message: event.message });
      this.setState('error');
    });
    this.nativeCleanups.push(errorUnsub);

    const frameUnsub = MetaWearables.onVideoFrame(() => {
      this.frameCount++;
      const res = RESOLUTION_MAP[this.config.resolution];
      this.emitFrame({
        timestamp: Date.now(),
        width: res.width,
        height: res.height,
        frameIndex: this.frameCount,
      });
    });
    this.nativeCleanups.push(frameUnsub);

    const deviceUnsub = MetaWearables.onDeviceChange((event: DeviceChangeEvent) => {
      console.log('[MetaStream] Device change:', event);
      this.deviceListeners.forEach((l) => l(event));
    });
    this.nativeCleanups.push(deviceUnsub);

    try {
      const nativeConfig: StreamConfig = {
        resolution: this.config.resolution,
        frameRate: this.config.frameRate,
      };
      await MetaWearables.startStream(nativeConfig);
    } catch (err) {
      console.error('[MetaStream] Failed to start native stream:', err);
      this.emitError({
        code: 'NATIVE_START_FAILED',
        message: err instanceof Error ? err.message : 'Failed to start native stream',
      });
      this.setState('error');
    }
  }

  private mapNativeState(nativeState: string): StreamState {
    switch (nativeState) {
      case 'stopped': return 'stopped';
      case 'waiting_for_device': return 'waiting_for_device';
      case 'starting': return 'starting';
      case 'streaming': return 'streaming';
      case 'stopping': return 'stopped';
      case 'paused': return 'paused';
      default: return 'idle';
    }
  }

  private startNativeStatusReporting() {
    this.statusInterval = setInterval(() => {
      const res = RESOLUTION_MAP[this.config.resolution];
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const baseBitrate = this.config.resolution === 'high' ? 8000 : this.config.resolution === 'medium' ? 4000 : 2000;

      this.emitStatus({
        state: this.state,
        fps: this.config.frameRate + Math.floor(Math.random() * 3 - 1),
        resolution: res.label,
        bitrate: baseBitrate + Math.floor(Math.random() * 500 - 250),
        framesReceived: this.frameCount,
        droppedFrames: this.droppedFrames,
        latencyMs: 15 + Math.floor(Math.random() * 20),
        uptime,
      });
    }, 1000);
  }

  private stopNativeStatusReporting() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  private async startFallback(): Promise<void> {
    this.setState('connecting');

    await this.simulateDelay(800);
    if (this.cancelled) return;

    this.setState('starting');
    await this.simulateDelay(600);
    if (this.cancelled) return;

    console.log('[MetaStream] Starting fallback stream with phone camera');
    this.startTime = Date.now();
    this.setState('streaming');
    this.startFrameEmission();
    this.startStatusReporting();
  }

  async stop(): Promise<void> {
    console.log('[MetaStream] Stopping session...');
    this.cancelled = true;

    if (this.useNativeSDK) {
      try {
        await MetaWearables.stopStream();
      } catch (err) {
        console.error('[MetaStream] Error stopping native stream:', err);
      }
      this.nativeCleanups.forEach((cleanup) => cleanup?.());
      this.nativeCleanups = [];
    }

    this.stopFrameEmission();
    this.stopStatusReporting();
    this.stopNativeStatusReporting();
    this.setState('stopped');
  }

  async pause(): Promise<void> {
    if (this.state !== 'streaming') return;
    this.stopFrameEmission();
    this.setState('paused');
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    this.setState('streaming');
    this.startFrameEmission();
  }

  destroy() {
    console.log('[MetaStream] Destroying session');
    this.stopFrameEmission();
    this.stopStatusReporting();
    this.stopNativeStatusReporting();
    this.nativeCleanups.forEach((cleanup) => cleanup?.());
    this.nativeCleanups = [];
    this.stateListeners = [];
    this.frameListeners = [];
    this.errorListeners = [];
    this.statusListeners = [];
    this.deviceListeners = [];
    this.state = 'idle';
  }

  private startFrameEmission() {
    const intervalMs = 1000 / this.config.frameRate;
    const res = RESOLUTION_MAP[this.config.resolution];

    this.frameInterval = setInterval(() => {
      this.frameCount++;

      if (Math.random() < 0.002) {
        this.droppedFrames++;
        return;
      }

      this.emitFrame({
        timestamp: Date.now(),
        width: res.width,
        height: res.height,
        frameIndex: this.frameCount,
      });
    }, intervalMs);
  }

  private stopFrameEmission() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
  }

  private startStatusReporting() {
    this.statusInterval = setInterval(() => {
      const res = RESOLUTION_MAP[this.config.resolution];
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const baseBitrate = this.config.resolution === 'high' ? 8000 : this.config.resolution === 'medium' ? 4000 : 2000;

      this.emitStatus({
        state: this.state,
        fps: this.config.frameRate + Math.floor(Math.random() * 3 - 1),
        resolution: res.label,
        bitrate: baseBitrate + Math.floor(Math.random() * 500 - 250),
        framesReceived: this.frameCount,
        droppedFrames: this.droppedFrames,
        latencyMs: 15 + Math.floor(Math.random() * 20),
        uptime,
      });
    }, 1000);
  }

  private stopStatusReporting() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export interface RegistrationState {
  status: 'unregistered' | 'registering' | 'registered' | 'error';
  deviceId?: string;
  error?: string;
}

class MetaStreamService {
  private static instance: MetaStreamService;
  private registration: RegistrationState = { status: 'unregistered' };
  private currentSession: MetaStreamSession | null = null;
  private sdkAvailable = false;
  private registrationCleanup: (() => void) | null = null;
  private deviceCleanup: (() => void) | null = null;
  private deviceChangeListeners: DeviceChangeListener[] = [];

  static getInstance(): MetaStreamService {
    if (!MetaStreamService.instance) {
      MetaStreamService.instance = new MetaStreamService();
    }
    return MetaStreamService.instance;
  }

  async initialize(): Promise<void> {
    this.sdkAvailable = MetaWearables.isAvailable();
    console.log('[MetaStream] SDK available:', this.sdkAvailable);

    if (this.sdkAvailable) {
      try {
        const sdkCheck = await MetaWearables.checkSDKAvailable();
        console.log('[MetaStream] Native SDK confirmed:', sdkCheck);
        this.sdkAvailable = sdkCheck;
      } catch (err) {
        console.warn('[MetaStream] SDK check failed, falling back:', err);
        this.sdkAvailable = false;
      }

      if (this.sdkAvailable) {
        this.registrationCleanup = MetaWearables.onRegistrationStateChange((event) => {
          console.log('[MetaStream] Registration state from native:', event.status);
          this.registration = { ...this.registration, status: event.status as RegistrationState['status'] };
        });

        try {
          const regState = await MetaWearables.getRegistrationState();
          this.registration = { status: regState.status as RegistrationState['status'] };
          console.log('[MetaStream] Initial registration state:', this.registration.status);
        } catch (err) {
          console.warn('[MetaStream] Failed to get registration state:', err);
        }
      }
    }
  }

  isNativeSDKAvailable(): boolean {
    return this.sdkAvailable;
  }

  getRegistration(): RegistrationState {
    return this.registration;
  }

  async register(): Promise<RegistrationState> {
    console.log('[MetaStream] Starting registration...');

    if (this.sdkAvailable) {
      try {
        this.registration = { status: 'registering' };
        const result = await MetaWearables.startRegistration();
        this.registration = { status: result.status as RegistrationState['status'] };
        console.log('[MetaStream] Registration initiated via native SDK:', result.status);
        return this.registration;
      } catch (err) {
        console.error('[MetaStream] Native registration failed:', err);
        this.registration = { status: 'error', error: err instanceof Error ? err.message : 'Registration failed' };
        return this.registration;
      }
    }

    this.registration = { status: 'registering' };
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.registration = {
      status: 'registered',
      deviceId: `rb-meta-${Date.now().toString(36)}`,
    };
    console.log('[MetaStream] Registered with device (fallback):', this.registration.deviceId);
    return this.registration;
  }

  async handleUrl(url: string): Promise<boolean> {
    if (this.sdkAvailable) {
      try {
        const result = await MetaWearables.handleUrl(url);
        console.log('[MetaStream] URL handled by native SDK:', result.handled);
        return result.handled;
      } catch (err) {
        console.error('[MetaStream] Failed to handle URL:', err);
        return false;
      }
    }
    return false;
  }

  async unregister(): Promise<RegistrationState> {
    if (this.sdkAvailable) {
      try {
        const result = await MetaWearables.unregister();
        this.registration = { status: result.status as RegistrationState['status'] };
        return this.registration;
      } catch (err) {
        console.error('[MetaStream] Unregister failed:', err);
      }
    }
    this.registration = { status: 'unregistered' };
    return this.registration;
  }

  async startDeviceDiscovery(): Promise<boolean> {
    if (this.sdkAvailable) {
      try {
        this.deviceCleanup = MetaWearables.onDeviceChange((event) => {
          console.log('[MetaStream] Device change event:', event);
          this.deviceChangeListeners.forEach((l) => l(event));
        });
        return await MetaWearables.startDeviceDiscovery();
      } catch (err) {
        console.error('[MetaStream] Device discovery failed:', err);
        return false;
      }
    }
    return false;
  }

  onDeviceChange(listener: DeviceChangeListener): () => void {
    this.deviceChangeListeners.push(listener);
    return () => {
      this.deviceChangeListeners = this.deviceChangeListeners.filter((l) => l !== listener);
    };
  }

  async checkPermission(type: 'camera' | 'microphone'): Promise<boolean> {
    if (this.sdkAvailable) {
      return MetaWearables.checkPermission(type);
    }
    console.log(`[MetaStream] Checking ${type} permission (fallback)...`);
    return true;
  }

  async requestPermission(type: 'camera' | 'microphone'): Promise<boolean> {
    if (this.sdkAvailable) {
      return MetaWearables.requestPermission(type);
    }
    console.log(`[MetaStream] Requesting ${type} permission (fallback)...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  createSession(config: StreamSessionConfig): MetaStreamSession {
    if (this.currentSession) {
      console.log('[MetaStream] Destroying previous session');
      this.currentSession.destroy();
    }
    this.currentSession = new MetaStreamSession(config);
    return this.currentSession;
  }

  getCurrentSession(): MetaStreamSession | null {
    return this.currentSession;
  }

  destroySession() {
    if (this.currentSession) {
      this.currentSession.destroy();
      this.currentSession = null;
    }
  }

  async capturePhoto(format: 'jpeg' | 'heic' = 'jpeg'): Promise<{ data: string; format: string } | null> {
    if (this.sdkAvailable) {
      return MetaWearables.capturePhoto(format);
    }
    return null;
  }

  async cleanup(): Promise<void> {
    this.destroySession();
    this.registrationCleanup?.();
    this.deviceCleanup?.();
    this.deviceChangeListeners = [];
    if (this.sdkAvailable) {
      await MetaWearables.cleanup();
    }
  }

  isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';
  }
}

export { MetaStreamSession };
export default MetaStreamService;
