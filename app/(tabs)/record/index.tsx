import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Video, StopCircle, Mic, Settings, ChevronDown, Wifi, WifiOff, Activity, Zap, RefreshCw, Glasses } from 'lucide-react-native';
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

function formatBitrate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} kbps`;
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
    streamState,
    streamStatus,
    startStream,
    stopStream,
    hasActiveDevice,
    isStreaming,
    isConnecting,
    isIdle,
    isWaitingForDevice,
    canStartStream,
    isError,
  } = useApp();

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const viewfinderAnim = useRef(new Animated.Value(0.3)).current;
  const streamPulse = useRef(new Animated.Value(0.4)).current;
  const connectBtnScale = useRef(new Animated.Value(1)).current;
  const waitingPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(viewfinderAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(viewfinderAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, viewfinderAnim]);

  useEffect(() => {
    if (isStreaming) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(streamPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(streamPulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      streamPulse.stopAnimation();
      streamPulse.setValue(0.4);
    }
  }, [isStreaming, streamPulse]);

  useEffect(() => {
    if (isWaitingForDevice && !hasActiveDevice) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waitingPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(waitingPulse, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      waitingPulse.stopAnimation();
      waitingPulse.setValue(1);
    }
  }, [isWaitingForDevice, hasActiveDevice, waitingPulse]);

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

  const handleStreamToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(connectBtnScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(connectBtnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (isStreaming || isConnecting) {
      await stopStream();
    } else {
      await startStream();
    }
  }, [isStreaming, isConnecting, startStream, stopStream, connectBtnScale]);

  const handleFlipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing(prev => prev === 'back' ? 'front' : 'back');
  }, []);

  const resolutions = ['720p', '1080p', '4K'] as const;
  const fpsOptions = [30, 60] as const;

  const showCamera = permission?.granted && Platform.OS !== 'web';
  const showIdleState = isIdle && !isConnecting;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.viewfinder, { opacity: fadeIn }]}>
        {showCamera ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing={cameraFacing}
            />
            <View style={styles.cameraOverlay}>
              <View style={[styles.cornerTL, isStreaming && styles.cornerActive]} />
              <View style={[styles.cornerTR, isStreaming && styles.cornerActive]} />
              <View style={[styles.cornerBL, isStreaming && styles.cornerActive]} />
              <View style={[styles.cornerBR, isStreaming && styles.cornerActive]} />

              <Pressable
                style={styles.flipCameraBtn}
                onPress={handleFlipCamera}
                testID="flip-camera"
              >
                <RefreshCw size={20} color={Colors.white} />
              </Pressable>

              {showIdleState && (
                <View style={styles.readyOverlay}>
                  <Animated.View style={{ transform: [{ scale: connectBtnScale }] }}>
                    <Pressable
                      style={styles.startStreamBtn}
                      onPress={handleStreamToggle}
                      testID="start-stream-btn"
                    >
                      <Glasses size={24} color={Colors.white} />
                      <Text style={styles.startStreamText}>{hasActiveDevice ? 'Start Streaming' : 'Connect & Stream'}</Text>
                    </Pressable>
                  </Animated.View>
                  <Text style={styles.readyHint}>
                    {hasActiveDevice ? 'Ray-Ban Meta detected' : 'Tap to connect glasses or use phone camera'}
                  </Text>
                </View>
              )}

              {isConnecting && (
                <View style={styles.connectingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.connectingText}>
                    {streamState === 'waiting_for_device' ? 'Searching for glasses...' : streamState === 'connecting' ? 'Connecting...' : 'Starting stream...'}
                  </Text>
                </View>
              )}

              {isError && (
                <View style={styles.errorOverlay}>
                  <WifiOff size={32} color={Colors.error} />
                  <Text style={styles.errorTitle}>Connection Failed</Text>
                  <Text style={styles.errorSub}>Could not connect. Tap to retry.</Text>
                  <Pressable style={styles.retryBtn} onPress={handleStreamToggle} testID="retry-stream">
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {isRecording && (
                <View style={styles.recIndicator}>
                  <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.recText}>REC</Text>
                  <Text style={styles.timerText}>{formatTimer(recordingTimer)}</Text>
                </View>
              )}

              <View style={styles.viewfinderBottom}>
                <View style={styles.viewfinderInfo}>
                  <Text style={styles.viewfinderInfoText}>
                    {recordingSettings.resolution} · {recordingSettings.fps}fps
                  </Text>
                  <Text style={styles.cameraLabel}>Phone Camera</Text>
                </View>
              </View>
            </View>
          </View>
        ) : isStreaming ? (
          <LinearGradient
            colors={['#0A1A10', '#0D2818', '#112D1E']}
            style={styles.viewfinderGradient}
          >
            <Animated.View style={[styles.scanLines, { opacity: viewfinderAnim }]}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={[styles.scanLine, styles.scanLineActive]} />
              ))}
            </Animated.View>

            <View style={[styles.cornerTL, styles.cornerActive]} />
            <View style={[styles.cornerTR, styles.cornerActive]} />
            <View style={[styles.cornerBL, styles.cornerActive]} />
            <View style={[styles.cornerBR, styles.cornerActive]} />

            <View style={styles.viewfinderCenter}>
              <Text style={styles.viewfinderLabel}>RAY-BAN META</Text>
              <Text style={[styles.viewfinderSubLabel, { color: Colors.success }]}>Live</Text>
            </View>

            {streamStatus && (
              <View style={styles.streamOverlay}>
                <Animated.View style={[styles.liveBadge, { opacity: streamPulse }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </Animated.View>
                <View style={styles.streamStats}>
                  <View style={styles.streamStatItem}>
                    <Activity size={10} color={Colors.success} />
                    <Text style={styles.streamStatText}>{streamStatus.fps}fps</Text>
                  </View>
                  <View style={styles.streamStatItem}>
                    <Zap size={10} color={Colors.primary} />
                    <Text style={styles.streamStatText}>{streamStatus.latencyMs}ms</Text>
                  </View>
                  <Text style={styles.streamStatText}>{formatBitrate(streamStatus.bitrate)}</Text>
                </View>
              </View>
            )}

            {isRecording && (
              <View style={styles.recIndicator}>
                <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.recText}>REC</Text>
                <Text style={styles.timerText}>{formatTimer(recordingTimer)}</Text>
              </View>
            )}

            <View style={styles.viewfinderBottom}>
              <View style={styles.viewfinderInfo}>
                <Text style={styles.viewfinderInfoText}>
                  {streamStatus?.resolution ?? recordingSettings.resolution} · {streamStatus?.fps ?? recordingSettings.fps}fps
                </Text>
              </View>
              <Animated.View style={{ transform: [{ scale: connectBtnScale }] }}>
                <Pressable
                  style={[styles.streamToggle, styles.streamToggleActive]}
                  onPress={handleStreamToggle}
                  testID="stream-toggle"
                >
                  <Wifi size={16} color={Colors.success} />
                  <Text style={[styles.streamToggleText, styles.streamToggleTextActive]}>Disconnect</Text>
                </Pressable>
              </Animated.View>
            </View>
          </LinearGradient>
        ) : (
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

            {isIdle && (
              <View style={styles.readyOverlay}>
                <Animated.View style={{ transform: [{ scale: connectBtnScale }] }}>
                  <Pressable
                    style={styles.startStreamBtn}
                    onPress={handleStreamToggle}
                    testID="start-stream-btn-web"
                  >
                    <Glasses size={24} color={Colors.white} />
                    <Text style={styles.startStreamText}>{hasActiveDevice ? 'Start Streaming' : 'Connect & Stream'}</Text>
                  </Pressable>
                </Animated.View>
                <Text style={styles.readyHint}>
                  {hasActiveDevice ? 'Ray-Ban Meta detected' : 'Tap to connect glasses or use phone camera'}
                </Text>
              </View>
            )}

            {isConnecting && (
              <View style={styles.connectingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.connectingText}>
                  {streamState === 'waiting_for_device' ? 'Searching for glasses...' : streamState === 'connecting' ? 'Connecting...' : 'Starting stream...'}
                </Text>
              </View>
            )}

            {isError && (
              <View style={styles.errorOverlay}>
                <WifiOff size={32} color={Colors.error} />
                <Text style={styles.errorTitle}>Connection Failed</Text>
                <Text style={styles.errorSub}>Could not connect. Tap to retry.</Text>
                <Pressable style={styles.retryBtn} onPress={handleStreamToggle} testID="retry-stream-web">
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {isRecording && (
              <View style={styles.recIndicator}>
                <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.recText}>REC</Text>
                <Text style={styles.timerText}>{formatTimer(recordingTimer)}</Text>
              </View>
            )}

            <View style={styles.viewfinderBottom}>
              <View style={styles.viewfinderInfo}>
                <Text style={styles.viewfinderInfoText}>
                  {recordingSettings.resolution} · {recordingSettings.fps}fps
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}
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
            {selectedAudioDevice?.name ?? 'No Input'}
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
              <Text style={styles.timerDisplayLabel}>
                {isStreaming ? 'Live' : isConnecting ? '...' : isError ? 'Error' : 'Ready'}
              </Text>
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

            {isStreaming && streamStatus && (
              <View style={styles.streamInfoPanel}>
                <Text style={styles.streamInfoTitle}>Stream Info</Text>
                <View style={styles.streamInfoRow}>
                  <Text style={styles.streamInfoLabel}>Frames</Text>
                  <Text style={styles.streamInfoValue}>{streamStatus.framesReceived.toLocaleString()}</Text>
                </View>
                <View style={styles.streamInfoRow}>
                  <Text style={styles.streamInfoLabel}>Dropped</Text>
                  <Text style={[styles.streamInfoValue, streamStatus.droppedFrames > 0 && { color: Colors.error }]}>
                    {streamStatus.droppedFrames}
                  </Text>
                </View>
                <View style={styles.streamInfoRow}>
                  <Text style={styles.streamInfoLabel}>Uptime</Text>
                  <Text style={styles.streamInfoValue}>{formatTimer(streamStatus.uptime)}</Text>
                </View>
              </View>
            )}
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  flipCameraBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cameraLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
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
  scanLineActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
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
    zIndex: 5,
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
    zIndex: 5,
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
    zIndex: 5,
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
    zIndex: 5,
  },
  cornerActive: {
    borderColor: Colors.success,
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
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 8,
  },
  waitingContent: {
    alignItems: 'center',
    gap: 12,
  },
  waitingTitle: {
    color: Colors.warning,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  waitingSub: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 8,
    gap: 16,
  },
  startStreamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startStreamText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  readyHint: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 8,
    gap: 16,
  },
  connectingText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 8,
    gap: 12,
  },
  errorTitle: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  errorSub: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  retryBtnText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  streamOverlay: {
    position: 'absolute',
    top: 16,
    right: 20,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  streamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streamStatText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'],
  },
  recIndicator: {
    position: 'absolute',
    top: 20,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
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
  viewfinderBottom: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  viewfinderInfo: {},
  viewfinderInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  streamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streamToggleActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  streamToggleText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  streamToggleTextActive: {
    color: Colors.success,
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
  streamInfoPanel: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    gap: 8,
  },
  streamInfoTitle: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  streamInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streamInfoLabel: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  streamInfoValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'],
  },
});
