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

export const mockAudioDevices: AudioDevice[] = [
  {
    id: 'usb-rode-01',
    name: 'Rode VideoMicro II',
    type: 'usb',
    connected: true,
    sampleRate: 48000,
    channels: 1,
    icon: 'Mic',
  },
  {
    id: 'usb-shure-01',
    name: 'Shure MV88+',
    type: 'usb',
    connected: true,
    sampleRate: 48000,
    channels: 2,
    icon: 'Mic',
  },
  {
    id: 'bt-airpods-01',
    name: 'AirPods Pro',
    type: 'bluetooth',
    connected: true,
    sampleRate: 44100,
    channels: 1,
    icon: 'Headphones',
  },
  {
    id: 'built-in-01',
    name: 'Ray-Ban Meta Built-in',
    type: 'built-in',
    connected: true,
    sampleRate: 44100,
    channels: 2,
    icon: 'Glasses',
  },
  {
    id: 'wired-lav-01',
    name: 'Lav Mic (3.5mm)',
    type: 'wired',
    connected: false,
    sampleRate: 44100,
    channels: 1,
    icon: 'Mic',
  },
  {
    id: 'usb-zoom-01',
    name: 'Zoom H1n',
    type: 'usb',
    connected: false,
    sampleRate: 96000,
    channels: 2,
    icon: 'Mic',
  },
];
