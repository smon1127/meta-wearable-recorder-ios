import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, StopCircle, Mic, Settings, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const {
    isRecording,
    recordingTimer,
    startRecording,
    stopRecording,
    selectedAudioDevice,
    recordingSettings,
    updateRecordingSettings,
    pulseAnim,
    wearable,
  } = useApp();

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const viewfinderAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(viewfinderAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(viewfinderAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, viewfinderAnim]);

  const handleRecordPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, buttonScale]);

  const resolutions = ['720p', '1080p', '4K'] as const;
  const fpsOptions = [30, 60] as const;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.viewfinder, { opacity: fadeIn }]}>
        <LinearGradient
          colors={['#0D1520', '#141E30', '#1A2640']}
          style={styles.viewfinderGradient}
        >
          <Animated.View style={[styles.scanLines, { opacity: viewfinderAnim }]}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={styles.scanLine} />
            ))}
          </Animated.View>

          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />

          <View style={styles.viewfinderCenter}>
            <Text style={styles.viewfinderLabel}>RAY-BAN META</Text>
            <Text style={styles.viewfinderSubLabel}>
              {wearable.connected ? 'Live Preview' : 'No Connection'}
            </Text>
          </View>

          {isRecording && (
            <View style={styles.recIndicator}>
              <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.recText}>REC</Text>
              <Text style={styles.timerText}>{formatTimer(recordingTimer)}</Text>
            </View>
          )}

          <View style={styles.viewfinderInfo}>
            <Text style={styles.viewfinderInfoText}>
              {recordingSettings.resolution} · {recordingSettings.fps}fps
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.controlsSection}>
        <Pressable
          style={styles.audioSourcePill}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          testID="audio-source-pill"
        >
          <Mic size={14} color={Colors.primary} />
          <Text style={styles.audioSourceText} numberOfLines={1}>
            {selectedAudioDevice.name}
          </Text>
          <ChevronDown size={14} color={Colors.textMuted} />
        </Pressable>

        <View style={styles.mainControls}>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(!showSettings);
            }}
            testID="settings-toggle"
          >
            <Settings size={22} color={Colors.textSecondary} />
          </Pressable>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPress={handleRecordPress}
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              testID="record-button"
            >
              {isRecording ? (
                <StopCircle size={32} color={Colors.white} />
              ) : (
                <View style={styles.recordDot} />
              )}
            </Pressable>
          </Animated.View>

          <View style={styles.timerDisplay}>
            {isRecording ? (
              <Text style={styles.timerDisplayText}>{formatTimer(recordingTimer)}</Text>
            ) : (
              <Text style={styles.timerDisplayLabel}>Ready</Text>
            )}
          </View>
        </View>

        {showSettings && (
          <View style={styles.settingsPanel}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Resolution</Text>
              <View style={styles.settingOptions}>
                {resolutions.map((res) => (
                  <Pressable
                    key={res}
                    style={[
                      styles.settingChip,
                      recordingSettings.resolution === res && styles.settingChipActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateRecordingSettings({ resolution: res });
                    }}
                    testID={`resolution-${res}`}
                  >
                    <Text
                      style={[
                        styles.settingChipText,
                        recordingSettings.resolution === res && styles.settingChipTextActive,
                      ]}
                    >
                      {res}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Frame Rate</Text>
              <View style={styles.settingOptions}>
                {fpsOptions.map((fps) => (
                  <Pressable
                    key={fps}
                    style={[
                      styles.settingChip,
                      recordingSettings.fps === fps && styles.settingChipActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateRecordingSettings({ fps });
                    }}
                    testID={`fps-${fps}`}
                  >
                    <Text
                      style={[
                        styles.settingChipText,
                        recordingSettings.fps === fps && styles.settingChipTextActive,
                      ]}
                    >
                      {fps}fps
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const cornerSize = 24;
const cornerWidth = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewfinder: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  viewfinderGradient: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLines: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    paddingVertical: 20,
  },
  scanLine: {
    height: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  cornerTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: cornerWidth,
    borderLeftWidth: cornerWidth,
    borderColor: Colors.primary,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: cornerWidth,
    borderRightWidth: cornerWidth,
    borderColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: cornerWidth,
    borderLeftWidth: cornerWidth,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: cornerWidth,
    borderRightWidth: cornerWidth,
    borderColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  viewfinderCenter: {
    alignItems: 'center',
    gap: 6,
  },
  viewfinderLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 3,
  },
  viewfinderSubLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  recIndicator: {
    position: 'absolute',
    top: 20,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.recording,
  },
  recText: {
    color: Colors.recording,
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  timerText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'],
  },
  viewfinderInfo: {
    position: 'absolute',
    bottom: 20,
    right: 24,
  },
  viewfinderInfoText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  controlsSection: {
    padding: 20,
    paddingBottom: 8,
    gap: 16,
  },
  audioSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: 250,
  },
  audioSourceText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  settingsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.recording,
  },
  recordButtonActive: {
    backgroundColor: Colors.recordingGlow,
  },
  recordDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.recording,
  },
  timerDisplay: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDisplayText: {
    color: Colors.recording,
    fontSize: 13,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
  },
  timerDisplayLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  settingsPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  settingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.surfaceHighlight,
  },
  settingChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  settingChipText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  settingChipTextActive: {
    color: Colors.primary,
  },
});
