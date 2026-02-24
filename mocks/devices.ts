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
  connected: boolean;
}

export const defaultWearable: WearableDevice = {
  id: 'rb-meta-001',
  name: 'Ray-Ban Meta',
  model: 'Wayfarer Large',
  connected: false,
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
];
