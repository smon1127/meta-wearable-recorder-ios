import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, ActivityIndicator, PanResponder, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Volume2, Sliders, RefreshCw, Wifi } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import AudioInputItem from '@/components/AudioInputItem';

export default function AudioScreen() {
  const insets = useSafeAreaInsets();
  const {
    audioDevices,
    selectedAudioDeviceId,
    selectAudioDevice,
    connectedDevices,
    isDetectingInputs,
    refreshAudioInputs,
    isStreaming,
  } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [gainLevel, setGainLevel] = useState<number>(75);
  const refreshSpin = useRef(new Animated.Value(0)).current;
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(8).fill(0.08));

  const trackWidthRef = useRef<number>(0);
  const startGainRef = useRef<number>(0);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  useEffect(() => {
    let mounted = true;
    let cleanupFn: (() => void) | null = null;

    const startMonitoring = async () => {
      if (Platform.OS === 'web') {
        try {
          if (typeof navigator === 'undefined' || !navigator?.mediaDevices) {
            console.log('[AudioMonitor] Web mediaDevices not available');
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ctx = new AudioContext();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          const buffer = new Uint8Array(analyser.frequencyBinCount);

          const interval = setInterval(() => {
            if (!mounted) return;
            analyser.getByteFrequencyData(buffer);
            const levels = Array.from({ length: 8 }, (_, i) => {
              const start = Math.floor((i / 8) * buffer.length);
              const end = Math.max(start + 1, Math.floor(((i + 1) / 8) * buffer.length));
              let sum = 0;
              for (let j = start; j < end; j++) sum += buffer[j];
              return Math.max(0.08, (sum / (end - start)) / 255);
            });
            setAudioLevels(levels);
          }, 80);

          cleanupFn = () => {
            clearInterval(interval);
            stream.getTracks().forEach(t => t.stop());
            ctx.close().catch(() => {});
          };
          console.log('[AudioMonitor] Web monitoring started');
        } catch (err) {
          console.log('[AudioMonitor] Web monitoring failed:', err);
        }
      } else {
        try {
          const perm = await Audio.requestPermissionsAsync();
          if (perm.status !== 'granted') {
            console.log('[AudioMonitor] Permission denied');
            return;
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const rec = new Audio.Recording();
          await rec.prepareToRecordAsync({
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          });
          await rec.startAsync();

          const interval = setInterval(async () => {
            if (!mounted) return;
            try {
              const st = await rec.getStatusAsync();
              if (st.isRecording && st.metering != null) {
                const db = st.metering;
                const norm = Math.max(0, Math.min(1, (db + 50) / 50));
                const levels = Array.from({ length: 8 }, (_, i) => {
                  const thresh = (i + 1) / 9;
                  if (norm >= thresh) return Math.min(1, 0.35 + norm * 0.65);
                  return 0.08;
                });
                setAudioLevels(levels);
              }
            } catch {}
          }, 80);

          cleanupFn = () => {
            clearInterval(interval);
            rec.stopAndUnloadAsync().catch(() => {});
            Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
          };
          console.log('[AudioMonitor] Native monitoring started');
        } catch (err) {
          console.log('[AudioMonitor] Native monitoring failed:', err);
        }
      }
    };

    startMonitoring();

    return () => {
      mounted = false;
      cleanupFn?.();
    };
  }, [selectedAudioDeviceId]);

  const gainPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const x = evt.nativeEvent.locationX;
      const w = trackWidthRef.current;
      if (w > 0) {
        const val = Math.round(Math.max(0, Math.min(100, (x / w) * 100)));
        setGainLevel(val);
        startGainRef.current = val;
        Haptics.selectionAsync();
      }
    },
    onPanResponderMove: (_evt, gestureState) => {
      const w = trackWidthRef.current;
      if (w > 0) {
        const delta = (gestureState.dx / w) * 100;
        const val = Math.round(Math.max(0, Math.min(100, startGainRef.current + delta)));
        setGainLevel(val);
      }
    },
    onPanResponderRelease: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  }), []);

  const nearestPreset = useMemo(() => {
    const presets = [25, 50, 75, 100];
    return presets.reduce((prev, curr) =>
      Math.abs(curr - gainLevel) < Math.abs(prev - gainLevel) ? curr : prev
    );
  }, [gainLevel]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(refreshSpin, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      refreshSpin.setValue(0);
    });
    refreshAudioInputs();
  }, [refreshAudioInputs, refreshSpin]);

  const handleSelectDevice = useCallback((id: string) => {
    selectAudioDevice(id);
  }, [selectAudioDevice]);

  const selectedDevice = useMemo(
    () => audioDevices.find((d) => d.id === selectedAudioDeviceId),
    [audioDevices, selectedAudioDeviceId]
  );

  const connected = useMemo(
    () => audioDevices.filter((d) => d.connected),
    [audioDevices]
  );

  const disconnected = useMemo(
    () => audioDevices.filter((d) => !d.connected),
    [audioDevices]
  );

  const spinInterpolate = refreshSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeIn }]}>
          <View>
            <Text style={styles.title}>Audio Input</Text>
            <Text style={styles.subtitle}>
              {isDetectingInputs ? 'Scanning...' : `${connectedDevices.length} devices available`}
            </Text>
          </View>
          <Pressable
            style={styles.refreshBtn}
            onPress={handleRefresh}
            testID="refresh-devices"
          >
            {isDetectingInputs ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <RefreshCw size={18} color={Colors.textSecondary} />
              </Animated.View>
            )}
          </Pressable>
        </Animated.View>

        {isStreaming && (
          <View style={styles.streamBanner}>
            <Wifi size={14} color={Colors.success} />
            <Text style={styles.streamBannerText}>
              Streaming from Ray-Ban Meta — audio routed via Bluetooth HFP
            </Text>
          </View>
        )}

        <View style={styles.meterCard}>
          <View style={styles.meterHeader}>
            <Volume2 size={16} color={Colors.primary} />
            <Text style={styles.meterTitle}>Input Level</Text>
            <Text style={styles.meterDevice}>{selectedDevice?.name ?? 'None'}</Text>
          </View>
          <View style={styles.meterBars}>
            {audioLevels.map((level, i) => (
              <View
                key={i}
                style={[
                  styles.meterBar,
                  {
                    opacity: Math.max(0.12, level),
                    backgroundColor: i < 5 ? Colors.success : i < 7 ? Colors.warning : Colors.error,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.gainSection}>
            <View style={styles.gainHeader}>
              <Sliders size={14} color={Colors.textSecondary} />
              <Text style={styles.gainLabel}>Gain</Text>
              <Text style={styles.gainValue}>{gainLevel}%</Text>
            </View>
            <View
              style={styles.gainSliderArea}
              onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
              {...gainPanResponder.panHandlers}
            >
              <View style={styles.gainTrack}>
                <View style={[styles.gainFill, { width: `${gainLevel}%` }]} />
              </View>
              <View
                style={[styles.gainKnob, { left: `${gainLevel}%` }]}
                pointerEvents="none"
              />
            </View>
            <View style={styles.gainPresets}>
              {[25, 50, 75, 100].map((val) => (
                <Pressable
                  key={val}
                  style={[styles.presetBtn, nearestPreset === val && styles.presetBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGainLevel(val);
                  }}
                  testID={`gain-${val}`}
                >
                  <Text style={[styles.presetText, nearestPreset === val && styles.presetTextActive]}>
                    {val}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Mic size={16} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Connected</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{connected.length}</Text>
          </View>
        </View>

        <View style={styles.deviceList}>
          {connected.map((device) => (
            <AudioInputItem
              key={device.id}
              device={device}
              isSelected={device.id === selectedAudioDeviceId}
              onSelect={handleSelectDevice}
            />
          ))}
          {connected.length === 0 && !isDetectingInputs && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No connected inputs detected</Text>
              <Text style={styles.emptySubText}>Tap refresh to scan for devices</Text>
            </View>
          )}
        </View>

        {disconnected.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleMuted}>Offline</Text>
            </View>
            <View style={styles.deviceList}>
              {disconnected.map((device) => (
                <AudioInputItem
                  key={device.id}
                  device={device}
                  isSelected={false}
                  onSelect={handleSelectDevice}
                />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  streamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  streamBannerText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  meterCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 14,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  meterDevice: {
    color: Colors.textMuted,
    fontSize: 12,
    marginLeft: 'auto',
  },
  meterBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
    gap: 4,
  },
  meterBar: {
    flex: 1,
    height: '100%',
    borderRadius: 4,
  },
  gainSection: {
    gap: 10,
  },
  gainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gainLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  gainValue: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700' as const,
    marginLeft: 'auto',
  },
  gainSliderArea: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  gainTrack: {
    height: 6,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gainFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  gainKnob: {
    position: 'absolute',
    top: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: -10,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  gainPresets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceHighlight,
  },
  presetBtnActive: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  presetText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  presetTextActive: {
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  sectionTitleMuted: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  countBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  deviceList: {
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
