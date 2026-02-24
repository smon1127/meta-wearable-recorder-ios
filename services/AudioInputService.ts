import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { AudioDevice } from '@/mocks/devices';

export interface DetectedAudioInput {
  uid: string;
  name: string;
  type: string;
}

function classifyInputType(name: string, type: string): AudioDevice['type'] {
  const lower = (name + ' ' + type).toLowerCase();
  if (lower.includes('usb') || lower.includes('external')) return 'usb';
  if (lower.includes('bluetooth') || lower.includes('airpod') || lower.includes('beats') || lower.includes('headset')) return 'bluetooth';
  if (lower.includes('wired') || lower.includes('headphone') || lower.includes('3.5')) return 'wired';
  return 'built-in';
}

function inferSampleRate(type: AudioDevice['type']): number {
  switch (type) {
    case 'usb': return 48000;
    case 'bluetooth': return 44100;
    case 'wired': return 44100;
    case 'built-in': return 48000;
    default: return 44100;
  }
}

function inferChannels(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('stereo') || lower.includes('front and back')) return 2;
  if (lower.includes('mono')) return 1;
  return 1;
}

async function enumerateNativeInputs(): Promise<DetectedAudioInput[]> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    if (status !== 'granted') {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        console.log('[AudioInput] Permission denied, using defaults');
        return [];
      }
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

    const inputs = await recording.getAvailableInputs();
    console.log('[AudioInput] Native inputs found:', inputs.length);
    inputs.forEach((input) => {
      console.log(`[AudioInput]   - ${input.name} (${input.type}) [${input.uid}]`);
    });

    await recording.stopAndUnloadAsync().catch(() => {});
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    return inputs.map((input) => ({
      uid: input.uid,
      name: input.name,
      type: input.type,
    }));
  } catch (err) {
    console.error('[AudioInput] Error enumerating native inputs:', err);
    return [];
  }
}

async function enumerateWebInputs(): Promise<DetectedAudioInput[]> {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      console.log('[AudioInput] Web mediaDevices not available');
      return [];
    }

    await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');

    console.log('[AudioInput] Web inputs found:', audioInputs.length);
    audioInputs.forEach((d) => {
      console.log(`[AudioInput]   - ${d.label} [${d.deviceId}]`);
    });

    return audioInputs.map((d) => ({
      uid: d.deviceId,
      name: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
      type: 'built-in',
    }));
  } catch (err) {
    console.error('[AudioInput] Error enumerating web inputs:', err);
    return [];
  }
}

export async function detectAudioInputs(): Promise<AudioDevice[]> {
  console.log('[AudioInput] Detecting audio inputs on platform:', Platform.OS);

  let detected: DetectedAudioInput[] = [];

  if (Platform.OS === 'web') {
    detected = await enumerateWebInputs();
  } else {
    detected = await enumerateNativeInputs();
  }

  if (detected.length === 0) {
    console.log('[AudioInput] No inputs detected, returning defaults');
    return [];
  }

  const audioDevices: AudioDevice[] = detected.map((input, index) => {
    const deviceType = classifyInputType(input.name, input.type);
    return {
      id: `detected-${input.uid}`,
      name: input.name,
      type: deviceType,
      connected: true,
      sampleRate: inferSampleRate(deviceType),
      channels: inferChannels(input.name),
      icon: deviceType === 'bluetooth' ? 'Headphones' : deviceType === 'usb' ? 'Usb' : 'Mic',
    };
  });

  console.log('[AudioInput] Mapped', audioDevices.length, 'audio devices');
  return audioDevices;
}
