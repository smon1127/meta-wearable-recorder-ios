import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface RegistrationResult {
  status: 'registering' | 'registered' | 'unregistered' | 'error';
}

export interface HandleUrlResult {
  handled: boolean;
}

export interface PermissionResult {
  granted: boolean;
}

export interface DeviceChangeEvent {
  connected: boolean;
  deviceId: string;
  name: string;
  devices?: Array<{ id: string; name: string }>;
  count?: number;
}

export interface StreamStateEvent {
  state: 'stopped' | 'waiting_for_device' | 'starting' | 'streaming' | 'stopping' | 'paused' | 'unknown';
}

export interface StreamErrorEvent {
  code: string;
  message: string;
}

export interface VideoFrameEvent {
  timestamp: number;
  hasImage: boolean;
}

export interface StreamConfig {
  resolution: 'low' | 'medium' | 'high';
  frameRate: number;
}

export interface CapturePhotoResult {
  data: string;
  format: string;
}

export interface SDKAvailabilityResult {
  available: boolean;
}

interface MetaWearablesNativeModule {
  startRegistration(): Promise<RegistrationResult>;
  handleUrl(url: string): Promise<HandleUrlResult>;
  getRegistrationState(): Promise<RegistrationResult>;
  unregister(): Promise<RegistrationResult>;
  checkPermission(type: string): Promise<PermissionResult>;
  requestPermission(type: string): Promise<PermissionResult>;
  startDeviceDiscovery(): Promise<{ started: boolean }>;
  startStream(config: StreamConfig): Promise<{ started: boolean }>;
  stopStream(): Promise<{ stopped: boolean }>;
  capturePhoto(format: string): Promise<CapturePhotoResult>;
  isSDKAvailable(): Promise<SDKAvailabilityResult>;
  cleanup(): Promise<{ cleaned: boolean }>;
}

const NativeModule: MetaWearablesNativeModule | null =
  Platform.OS === 'ios' ? NativeModules.MetaWearablesModule ?? null : null;

let emitterInstance: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'ios' || !NativeModule) return null;
  if (!emitterInstance) {
    emitterInstance = new NativeEventEmitter(NativeModules.MetaWearablesModule);
  }
  return emitterInstance;
}

export const MetaWearables = {
  isAvailable(): boolean {
    return Platform.OS === 'ios' && NativeModule !== null;
  },

  async checkSDKAvailable(): Promise<boolean> {
    if (!NativeModule) return false;
    try {
      const result = await NativeModule.isSDKAvailable();
      return result.available;
    } catch (e) {
      console.warn('[MetaWearables] SDK availability check failed:', e);
      return false;
    }
  },

  async startRegistration(): Promise<RegistrationResult> {
    if (!NativeModule) throw new Error('MetaWearables native module not available');
    console.log('[MetaWearables] Starting registration via native SDK');
    return NativeModule.startRegistration();
  },

  async handleUrl(url: string): Promise<HandleUrlResult> {
    if (!NativeModule) throw new Error('MetaWearables native module not available');
    console.log('[MetaWearables] Handling URL callback:', url);
    return NativeModule.handleUrl(url);
  },

  async getRegistrationState(): Promise<RegistrationResult> {
    if (!NativeModule) return { status: 'unregistered' };
    return NativeModule.getRegistrationState();
  },

  async unregister(): Promise<RegistrationResult> {
    if (!NativeModule) throw new Error('MetaWearables native module not available');
    return NativeModule.unregister();
  },

  async checkPermission(type: 'camera' | 'microphone'): Promise<boolean> {
    if (!NativeModule) return false;
    const result = await NativeModule.checkPermission(type);
    return result.granted;
  },

  async requestPermission(type: 'camera' | 'microphone'): Promise<boolean> {
    if (!NativeModule) return false;
    const result = await NativeModule.requestPermission(type);
    return result.granted;
  },

  async startDeviceDiscovery(): Promise<boolean> {
    if (!NativeModule) return false;
    console.log('[MetaWearables] Starting device discovery via native SDK');
    const result = await NativeModule.startDeviceDiscovery();
    return result.started;
  },

  async startStream(config: StreamConfig): Promise<boolean> {
    if (!NativeModule) return false;
    console.log('[MetaWearables] Starting stream via native SDK:', config);
    const result = await NativeModule.startStream(config);
    return result.started;
  },

  async stopStream(): Promise<boolean> {
    if (!NativeModule) return true;
    console.log('[MetaWearables] Stopping stream via native SDK');
    const result = await NativeModule.stopStream();
    return result.stopped;
  },

  async capturePhoto(format: 'jpeg' | 'heic' = 'jpeg'): Promise<CapturePhotoResult | null> {
    if (!NativeModule) return null;
    return NativeModule.capturePhoto(format);
  },

  async cleanup(): Promise<void> {
    if (!NativeModule) return;
    await NativeModule.cleanup();
  },

  onRegistrationStateChange(callback: (event: RegistrationResult) => void): (() => void) | null {
    const emitter = getEmitter();
    if (!emitter) return null;
    const sub = emitter.addListener('onRegistrationStateChange', callback);
    return () => sub.remove();
  },

  onStreamStateChange(callback: (event: StreamStateEvent) => void): (() => void) | null {
    const emitter = getEmitter();
    if (!emitter) return null;
    const sub = emitter.addListener('onStreamStateChange', callback);
    return () => sub.remove();
  },

  onStreamError(callback: (event: StreamErrorEvent) => void): (() => void) | null {
    const emitter = getEmitter();
    if (!emitter) return null;
    const sub = emitter.addListener('onStreamError', callback);
    return () => sub.remove();
  },

  onVideoFrame(callback: (event: VideoFrameEvent) => void): (() => void) | null {
    const emitter = getEmitter();
    if (!emitter) return null;
    const sub = emitter.addListener('onVideoFrame', callback);
    return () => sub.remove();
  },

  onDeviceChange(callback: (event: DeviceChangeEvent) => void): (() => void) | null {
    const emitter = getEmitter();
    if (!emitter) return null;
    const sub = emitter.addListener('onDeviceChange', callback);
    return () => sub.remove();
  },
};

export default MetaWearables;
