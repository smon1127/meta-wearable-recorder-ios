export interface AudioDevice {
  id: string;
  name: string;
  type: 'usb' | 'bluetooth' | 'built-in' | 'wired';
  connected: boolean;
  sampleRate: number;
  channels: number;
  icon: string;
}

export interface WearableDevice {
  id: string;
  name: string;
  model: string;
  batteryLevel: number;
  firmwareVersion: string;
  connected: boolean;
  lastSyncTime: string;
  storageUsed: number;
  storageTotal: number;
}

export const mockWearable: WearableDevice = {
  id: 'rb-meta-001',
  name: 'Ray-Ban Meta',
  model: 'Wayfarer Large',
  batteryLevel: 72,
  firmwareVersion: '2.4.1',
  connected: true,
  lastSyncTime: '2 min ago',
  storageUsed: 18.4,
  storageTotal: 32,
};

export const fallbackAudioDevices: AudioDevice[] = [
  {
    id: 'builtin-mic-bottom',
    name: 'Built-in Microphone (Bottom)',
    type: 'built-in',
    connected: true,
    sampleRate: 48000,
    channels: 1,
    icon: 'Mic',
  },
  {
    id: 'builtin-mic-front',
    name: 'Built-in Microphone (Front)',
    type: 'built-in',
    connected: true,
    sampleRate: 48000,
    channels: 1,
    icon: 'Mic',
  },
  {
    id: 'builtin-mic-back',
    name: 'Built-in Microphone (Back)',
    type: 'built-in',
    connected: true,
    sampleRate: 48000,
    channels: 1,
    icon: 'Mic',
  },
  {
    id: 'rb-meta-builtin',
    name: 'Ray-Ban Meta Built-in',
    type: 'built-in',
    connected: true,
    sampleRate: 44100,
    channels: 2,
    icon: 'Glasses',
  },
  {
    id: 'bt-airpods-01',
    name: 'AirPods Pro',
    type: 'bluetooth',
    connected: false,
    sampleRate: 44100,
    channels: 1,
    icon: 'Headphones',
  },
  {
    id: 'usb-ext-01',
    name: 'USB Microphone',
    type: 'usb',
    connected: false,
    sampleRate: 48000,
    channels: 2,
    icon: 'Usb',
  },
];

export const mockAudioDevices = fallbackAudioDevices;
