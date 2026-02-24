import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mockWearable, fallbackAudioDevices, type AudioDevice, type WearableDevice } from '@/mocks/devices';
import { mockRecordings, type Recording } from '@/mocks/recordings';
import { detectAudioInputs } from '@/services/AudioInputService';
import MetaStreamService, {
  type StreamState,
  type StreamSessionStatus,
  type StreamSessionConfig,
  type MetaStreamSession,
  type RegistrationState,
} from '@/services/MetaStreamService';

export interface RecordingSettings {
  resolution: '720p' | '1080p' | '4K';
  fps: 30 | 60;
}

interface PersistedState {
  selectedAudioDeviceId: string;
  recordingSettings: RecordingSettings;
}

const STORAGE_KEY = 'meta-wearable-state';

const defaultSettings: RecordingSettings = {
  resolution: '1080p',
  fps: 30,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [wearable, setWearable] = useState<WearableDevice>(mockWearable);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>(fallbackAudioDevices);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('builtin-mic-bottom');
  const [recordings, setRecordings] = useState<Recording[]>(mockRecordings);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTimer, setRecordingTimer] = useState<number>(0);
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>(defaultSettings);
  const [isDetectingInputs, setIsDetectingInputs] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [streamStatus, setStreamStatus] = useState<StreamSessionStatus | null>(null);
  const [streamRegistration, setStreamRegistration] = useState<RegistrationState>({ status: 'unregistered' });
  const streamSessionRef = useRef<MetaStreamSession | null>(null);
  const streamService = useRef(MetaStreamService.getInstance()).current;

  const persistedQuery = useQuery({
    queryKey: ['persisted-state'],
    queryFn: async (): Promise<PersistedState | null> => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    },
  });

  useEffect(() => {
    if (persistedQuery.data) {
      setSelectedAudioDeviceId(persistedQuery.data.selectedAudioDeviceId);
      setRecordingSettings(persistedQuery.data.recordingSettings);
    }
  }, [persistedQuery.data]);

  const persist = useCallback(async (deviceId: string, settings: RecordingSettings) => {
    const state: PersistedState = {
      selectedAudioDeviceId: deviceId,
      recordingSettings: settings,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  const refreshAudioInputs = useCallback(async () => {
    console.log('[AppContext] Refreshing audio inputs...');
    setIsDetectingInputs(true);
    try {
      const detected = await detectAudioInputs();
      if (detected.length > 0) {
        console.log('[AppContext] Using', detected.length, 'detected inputs');
        setAudioDevices(detected);
        const currentExists = detected.find((d) => d.id === selectedAudioDeviceId);
        if (!currentExists && detected.length > 0) {
          const firstConnected = detected.find((d) => d.connected);
          if (firstConnected) {
            setSelectedAudioDeviceId(firstConnected.id);
          }
        }
      } else {
        console.log('[AppContext] No detected inputs, keeping fallbacks');
      }
    } catch (err) {
      console.error('[AppContext] Failed to detect audio inputs:', err);
    } finally {
      setIsDetectingInputs(false);
    }
  }, [selectedAudioDeviceId]);

  useEffect(() => {
    refreshAudioInputs();
  }, []);

  const selectAudioDevice = useCallback((deviceId: string) => {
    setSelectedAudioDeviceId(deviceId);
    persist(deviceId, recordingSettings);
  }, [persist, recordingSettings]);

  const updateRecordingSettings = useCallback((settings: Partial<RecordingSettings>) => {
    setRecordingSettings(prev => {
      const updated = { ...prev, ...settings };
      persist(selectedAudioDeviceId, updated);
      return updated;
    });
  }, [persist, selectedAudioDeviceId]);

  const registerStream = useMutation({
    mutationFn: async () => {
      const result = await streamService.register();
      return result;
    },
    onSuccess: (result) => {
      setStreamRegistration(result);
      setWearable((prev) => ({ ...prev, connected: true }));
    },
    onError: () => {
      setStreamRegistration({ status: 'error', error: 'Registration failed' });
    },
  });

  const startStream = useCallback(async () => {
    console.log('[AppContext] Starting stream...');
    const resMap: Record<string, 'low' | 'medium' | 'high'> = {
      '720p': 'medium',
      '1080p': 'high',
      '4K': 'high',
    };

    const config: StreamSessionConfig = {
      resolution: resMap[recordingSettings.resolution] ?? 'high',
      frameRate: recordingSettings.fps === 60 ? 30 : 24,
      videoCodec: 'h264',
    };

    const session = streamService.createSession(config);
    streamSessionRef.current = session;

    const unsubState = session.onStateChange((state) => {
      setStreamState(state);
      if (state === 'streaming') {
        setWearable((prev) => ({ ...prev, connected: true }));
      }
    });

    const unsubStatus = session.onStatus((status) => {
      setStreamStatus(status);
    });

    session.onError((error) => {
      console.error('[AppContext] Stream error:', error);
    });

    await session.start();
  }, [recordingSettings, streamService]);

  const stopStream = useCallback(async () => {
    console.log('[AppContext] Stopping stream...');
    if (streamSessionRef.current) {
      await streamSessionRef.current.stop();
      streamSessionRef.current = null;
    }
    setStreamState('idle');
    setStreamStatus(null);
  }, []);

  const startRecording = useCallback(() => {
    console.log('[Recording] Starting recording...');
    setIsRecording(true);
    setRecordingTimer(0);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    timerRef.current = setInterval(() => {
      setRecordingTimer(prev => prev + 1);
    }, 1000);
  }, [pulseAnim]);

  const stopRecording = useCallback(() => {
    console.log('[Recording] Stopping recording...');
    setIsRecording(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const selectedDevice = audioDevices.find(d => d.id === selectedAudioDeviceId);
    const newRecording: Recording = {
      id: `rec-${Date.now()}`,
      title: `Recording ${recordings.length + 1}`,
      duration: recordingTimer,
      timestamp: new Date().toISOString(),
      thumbnail: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=400&h=300&fit=crop',
      resolution: recordingSettings.resolution,
      fps: recordingSettings.fps,
      fileSize: Math.round(recordingTimer * 1.3),
      audioSource: selectedDevice?.name ?? 'Unknown',
    };

    setRecordings(prev => [newRecording, ...prev]);
    setRecordingTimer(0);
  }, [audioDevices, selectedAudioDeviceId, recordings.length, recordingTimer, recordingSettings, pulseAnim]);

  const selectedAudioDevice = audioDevices.find(d => d.id === selectedAudioDeviceId) ?? audioDevices[0];
  const connectedDevices = audioDevices.filter(d => d.connected);

  return {
    wearable,
    setWearable,
    audioDevices,
    selectedAudioDeviceId,
    selectedAudioDevice,
    selectAudioDevice,
    connectedDevices,
    recordings,
    isRecording,
    recordingTimer,
    recordingSettings,
    updateRecordingSettings,
    startRecording,
    stopRecording,
    pulseAnim,
    isLoading: persistedQuery.isLoading,
    isDetectingInputs,
    refreshAudioInputs,
    streamState,
    streamStatus,
    streamRegistration,
    registerStream: registerStream.mutate,
    isRegistering: registerStream.isPending,
    startStream,
    stopStream,
  };
});
