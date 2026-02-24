import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, AppState, Platform, Linking } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultWearable, fallbackAudioDevices, type AudioDevice, type WearableDevice } from '@/mocks/devices';
import type { Recording } from '@/mocks/recordings';
import { detectAudioInputs } from '@/services/AudioInputService';
import MetaStreamService, {
  type StreamState,
  type StreamSessionStatus,
  type StreamSessionConfig,
  type MetaStreamSession,
  type RegistrationState,
} from '@/services/MetaStreamService';

export type AppStreamState =
  | 'idle'
  | 'waiting_for_device'
  | 'connecting'
  | 'starting'
  | 'streaming'
  | 'paused'
  | 'error'
  | 'stopped';

export interface RecordingSettings {
  resolution: '720p' | '1080p' | '4K';
  fps: 30 | 60;
}

interface PersistedState {
  selectedAudioDeviceId: string;
  recordingSettings: RecordingSettings;
  recordings: Recording[];
}

const STORAGE_KEY = 'meta-wearable-state';

const defaultSettings: RecordingSettings = {
  resolution: '1080p',
  fps: 30,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [wearable, setWearable] = useState<WearableDevice>(defaultWearable);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>(fallbackAudioDevices);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('builtin-mic-bottom');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTimer, setRecordingTimer] = useState<number>(0);
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>(defaultSettings);
  const [isDetectingInputs, setIsDetectingInputs] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [streamState, setStreamState] = useState<AppStreamState>('idle');
  const [streamStatus, setStreamStatus] = useState<StreamSessionStatus | null>(null);
  const [streamRegistration, setStreamRegistration] = useState<RegistrationState>({ status: 'unregistered' });
  const [hasActiveDevice, setHasActiveDevice] = useState<boolean>(false);
  const [isNativeSDK, setIsNativeSDK] = useState<boolean>(false);
  const streamSessionRef = useRef<MetaStreamSession | null>(null);
  const streamService = useRef(MetaStreamService.getInstance()).current;
  const initDone = useRef(false);

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
      if (persistedQuery.data.recordings) {
        setRecordings(persistedQuery.data.recordings);
      }
    }
  }, [persistedQuery.data]);

  const persist = useCallback(async (deviceId: string, settings: RecordingSettings, recs?: Recording[]) => {
    const state: PersistedState = {
      selectedAudioDeviceId: deviceId,
      recordingSettings: settings,
      recordings: recs ?? [],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    console.log('[AppContext] Initializing MetaStreamService...');
    setStreamState('idle');
    setHasActiveDevice(false);

    (async () => {
      await streamService.initialize();
      const sdkAvailable = streamService.isNativeSDKAvailable();
      setIsNativeSDK(sdkAvailable);
      console.log('[AppContext] Native SDK available:', sdkAvailable);

      if (sdkAvailable) {
        const reg = streamService.getRegistration();
        setStreamRegistration(reg);
        console.log('[AppContext] Initial registration:', reg.status);

        streamService.onDeviceChange((event) => {
          console.log('[AppContext] Device change from native:', event);
          setHasActiveDevice(event.connected);
          if (event.connected && event.name) {
            setWearable((prev) => ({
              ...prev,
              name: event.name || prev.name,
              connected: true,
            }));
          } else {
            setWearable((prev) => ({ ...prev, connected: false }));
          }
        });

        await streamService.startDeviceDiscovery();
      }
    })();
  }, [streamService]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const handleUrl = async (event: { url: string }) => {
      console.log('[AppContext] Received URL callback:', event.url);
      const handled = await streamService.handleUrl(event.url);
      if (handled) {
        console.log('[AppContext] URL handled by Meta Wearables SDK');
        const reg = streamService.getRegistration();
        setStreamRegistration(reg);
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[AppContext] Initial URL:', url);
        handleUrl({ url });
      }
    });

    return () => {
      sub.remove();
    };
  }, [streamService]);

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

  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const handler = () => {
        console.log('[AppContext] Web devicechange event — refreshing audio inputs');
        refreshAudioInputs();
      };
      navigator.mediaDevices.addEventListener('devicechange', handler);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handler);
      };
    }

    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          console.log('[AppContext] App became active — refreshing audio inputs');
          refreshAudioInputs();
        }
      });

      const pollInterval = setInterval(() => {
        console.log('[AppContext] Polling audio inputs for hot-plug detection');
        refreshAudioInputs();
      }, 3000);

      return () => {
        subscription.remove();
        clearInterval(pollInterval);
      };
    }

    return undefined;
  }, [refreshAudioInputs]);

  const selectAudioDevice = useCallback((deviceId: string) => {
    setSelectedAudioDeviceId(deviceId);
    persist(deviceId, recordingSettings, recordings);
  }, [persist, recordingSettings, recordings]);

  const updateRecordingSettings = useCallback((settings: Partial<RecordingSettings>) => {
    setRecordingSettings(prev => {
      const updated = { ...prev, ...settings };
      persist(selectedAudioDeviceId, updated, recordings);
      return updated;
    });
  }, [persist, selectedAudioDeviceId, recordings]);

  const registerStream = useMutation({
    mutationFn: async () => {
      const result = await streamService.register();
      return result;
    },
    onSuccess: (result) => {
      setStreamRegistration(result);
    },
    onError: () => {
      setStreamRegistration({ status: 'error', error: 'Registration failed' });
    },
  });

  const startStream = useCallback(async () => {
    console.log('[AppContext] Starting stream...');
    setStreamState('connecting');

    if (isNativeSDK && streamRegistration.status !== 'registered') {
      console.log('[AppContext] Need to register first...');
      try {
        const reg = await streamService.register();
        setStreamRegistration(reg);
        if (reg.status !== 'registered' && reg.status !== 'registering') {
          console.error('[AppContext] Registration failed:', reg.error);
          setStreamState('error');
          return;
        }
      } catch (err) {
        console.error('[AppContext] Registration error:', err);
        setStreamState('error');
        return;
      }
    }

    if (isNativeSDK) {
      const hasCamPermission = await streamService.checkPermission('camera');
      if (!hasCamPermission) {
        console.log('[AppContext] Requesting camera permission...');
        await streamService.requestPermission('camera');
      }
    }

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

    session.onStateChange((state: StreamState) => {
      console.log('[AppContext] Stream state changed:', state);
      setStreamState(state as AppStreamState);
      if (state === 'streaming') {
        setWearable(prev => ({ ...prev, connected: true }));
        setHasActiveDevice(true);
      } else if (state === 'stopped' || state === 'error') {
        setWearable(prev => ({ ...prev, connected: false }));
      }
    });

    session.onStatus((status: StreamSessionStatus) => {
      setStreamStatus(status);
    });

    session.onError((error) => {
      console.error('[AppContext] Stream error:', error);
      setStreamState('error');
    });

    await session.start();
  }, [recordingSettings, streamService, isNativeSDK, streamRegistration.status]);

  const stopStream = useCallback(async () => {
    console.log('[AppContext] Stopping stream...');
    if (streamSessionRef.current) {
      await streamSessionRef.current.stop();
      streamSessionRef.current = null;
    }
    setStreamState('idle');
    setStreamStatus(null);
    setHasActiveDevice(false);
    setWearable(prev => ({ ...prev, connected: false }));
  }, []);

  const capturePhoto = useCallback(async (format: 'jpeg' | 'heic' = 'jpeg') => {
    console.log('[AppContext] Capturing photo...');
    return streamService.capturePhoto(format);
  }, [streamService]);

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
    const isStreamActive = streamState === 'streaming';
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
      deviceType: isStreamActive ? 'rayban-meta' : 'phone-camera',
    };

    const updated = [newRecording, ...recordings];
    setRecordings(updated);
    persist(selectedAudioDeviceId, recordingSettings, updated);
    setRecordingTimer(0);
  }, [audioDevices, selectedAudioDeviceId, recordings, recordingTimer, recordingSettings, pulseAnim, streamState, persist]);

  const selectedAudioDevice = audioDevices.find(d => d.id === selectedAudioDeviceId) ?? audioDevices[0];
  const connectedDevices = audioDevices.filter(d => d.connected);

  const raybanRecordings = recordings.filter(r => r.deviceType === 'rayban-meta');

  const isStreaming = streamState === 'streaming';
  const isConnecting = streamState === 'connecting' || streamState === 'starting' || streamState === 'waiting_for_device';
  const isWaitingForDevice = streamState === 'idle';
  const isError = streamState === 'error';
  const canStartStream = !isStreaming && !isConnecting;

  return {
    wearable,
    setWearable,
    audioDevices,
    selectedAudioDeviceId,
    selectedAudioDevice,
    selectAudioDevice,
    connectedDevices,
    recordings,
    raybanRecordings,
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
    capturePhoto,
    hasActiveDevice,
    isStreaming,
    isConnecting,
    isWaitingForDevice,
    isError,
    canStartStream,
    isNativeSDK,
  };
});
