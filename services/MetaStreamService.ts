import { Platform } from 'react-native';

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
  private frameInterval: ReturnType<typeof setInterval> | null = null;
  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;
  private droppedFrames = 0;
  private startTime = 0;
  private cancelled = false;

  constructor(config: StreamSessionConfig) {
    this.config = config;
    console.log('[MetaStream] Session created with config:', JSON.stringify(config));
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
    this.setState('connecting');
    this.frameCount = 0;
    this.droppedFrames = 0;

    await this.simulateDelay(1500);
    if (this.cancelled) return;

    this.setState('starting');

    await this.simulateDelay(2000);
    if (this.cancelled) return;

    console.log('[MetaStream] Stream started successfully');
    this.startTime = Date.now();
    this.setState('streaming');
    this.startFrameEmission();
    this.startStatusReporting();
  }

  async stop(): Promise<void> {
    console.log('[MetaStream] Stopping session...');
    this.cancelled = true;
    this.stopFrameEmission();
    this.stopStatusReporting();
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
    this.stateListeners = [];
    this.frameListeners = [];
    this.errorListeners = [];
    this.statusListeners = [];
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

export type DeviceScanState = 'idle' | 'scanning' | 'found' | 'not_found';

class MetaStreamService {
  private static instance: MetaStreamService;
  private registration: RegistrationState = { status: 'unregistered' };
  private currentSession: MetaStreamSession | null = null;
  private deviceScanState: DeviceScanState = 'idle';
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private scanListeners: ((state: DeviceScanState) => void)[] = [];

  static getInstance(): MetaStreamService {
    if (!MetaStreamService.instance) {
      MetaStreamService.instance = new MetaStreamService();
    }
    return MetaStreamService.instance;
  }

  getRegistration(): RegistrationState {
    return this.registration;
  }

  async register(): Promise<RegistrationState> {
    console.log('[MetaStream] Starting registration...');
    this.registration = { status: 'registering' };

    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.registration = {
      status: 'registered',
      deviceId: `rb-meta-${Date.now().toString(36)}`,
    };
    console.log('[MetaStream] Registered with device:', this.registration.deviceId);
    return this.registration;
  }

  onDeviceScanChange(listener: (state: DeviceScanState) => void) {
    this.scanListeners.push(listener);
    return () => {
      this.scanListeners = this.scanListeners.filter((l) => l !== listener);
    };
  }

  private emitScanState(state: DeviceScanState) {
    this.deviceScanState = state;
    this.scanListeners.forEach((l) => l(state));
  }

  getDeviceScanState(): DeviceScanState {
    return this.deviceScanState;
  }

  startDeviceScan(): void {
    if (this.scanInterval) return;
    console.log('[MetaStream] Starting device scan...');
    this.emitScanState('scanning');

    let scanAttempts = 0;
    this.scanInterval = setInterval(() => {
      scanAttempts++;
      console.log(`[MetaStream] Scan attempt ${scanAttempts}...`);

      if (scanAttempts >= 3 && this.registration.status === 'registered') {
        console.log('[MetaStream] Device found after scan');
        this.emitScanState('found');
        this.stopDeviceScan();
      } else if (scanAttempts >= 8) {
        console.log('[MetaStream] Device not found after max attempts');
        this.emitScanState('not_found');
        this.stopDeviceScan();
      }
    }, 2000);
  }

  stopDeviceScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  resetScan(): void {
    this.stopDeviceScan();
    this.emitScanState('idle');
  }

  async checkPermission(type: 'camera' | 'microphone'): Promise<boolean> {
    console.log(`[MetaStream] Checking ${type} permission...`);
    return true;
  }

  async requestPermission(type: 'camera' | 'microphone'): Promise<boolean> {
    console.log(`[MetaStream] Requesting ${type} permission...`);
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

  isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';
  }
}

export { MetaStreamSession };
export default MetaStreamService;
