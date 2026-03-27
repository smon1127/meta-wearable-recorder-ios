import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, Glasses, ChevronRight, Wifi, WifiOff, Film } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import RecordingCard from '@/components/RecordingCard';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    wearable,
    raybanRecordings,
    recordings,
    isRecording,
    isStreaming,
    isConnecting,
    isIdle,
    isWaitingForDevice,
    hasActiveDevice,
    streamState,
    selectedAudioDevice,
    isError,
    startStream,
    stopStream,
    canStartStream,
  } = useApp();
  const headerFade = useRef(new Animated.Value(0)).current;
  const quickActionSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(quickActionSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [headerFade, quickActionSlide]);

  const handleQuickRecord = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/record' as never);
  }, [router]);

  const connectionLabel = isStreaming
    ? 'Streaming'
    : isConnecting
    ? 'Connecting...'
    : isError
    ? 'Failed'
    : 'Not Connected';

  const connectionColor = isStreaming
    ? Colors.success
    : isConnecting
    ? Colors.warning
    : isError
    ? Colors.error
    : Colors.textMuted;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerSection, { opacity: headerFade }]}>
          <View>
            <Text style={styles.greeting}>Ray-Ban Meta</Text>
            <Text style={styles.subtitle}>
              {isRecording ? '● Recording in progress' : `${raybanRecordings.length} glasses recordings`}
            </Text>
          </View>
          <View style={[styles.statusChip, { borderColor: connectionColor }]}>
            {isStreaming ? (
              <Wifi size={12} color={connectionColor} />
            ) : (
              <WifiOff size={12} color={connectionColor} />
            )}
            <Text style={[styles.statusChipText, { color: connectionColor }]}>{connectionLabel}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.deviceCard, { opacity: headerFade, transform: [{ translateY: quickActionSlide }] }]}>
          <View style={styles.deviceCardHeader}>
            <View style={styles.deviceIconWrap}>
              <Glasses size={22} color={Colors.primary} />
            </View>
            <View style={styles.deviceCardInfo}>
              <Text style={styles.deviceCardName}>{wearable.name}</Text>
              <Text style={styles.deviceCardModel}>{wearable.model}</Text>
            </View>
            <View style={[styles.connDot, { backgroundColor: isStreaming ? Colors.success : isConnecting ? Colors.warning : isError ? Colors.error : Colors.textMuted }]} />
          </View>

          <View style={styles.deviceCardStats}>
            <View style={styles.deviceStat}>
              <Text style={styles.deviceStatLabel}>Status</Text>
              <Text style={[styles.deviceStatValue, { color: connectionColor }]}>{connectionLabel}</Text>
            </View>
            <View style={styles.deviceStatDivider} />
            <View style={styles.deviceStat}>
              <Text style={styles.deviceStatLabel}>Audio</Text>
              <Text style={styles.deviceStatValue} numberOfLines={1}>{selectedAudioDevice?.name ?? 'None'}</Text>
            </View>
          </View>

          {canStartStream && (
            <Pressable
              style={styles.connectBtn}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await startStream();
              }}
              testID="dashboard-connect-btn"
            >
              <Wifi size={16} color={Colors.primary} />
              <Text style={styles.connectBtnText}>Connect & Stream</Text>
            </Pressable>
          )}
          {isStreaming && (
            <Pressable
              style={styles.disconnectBtn}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await stopStream();
              }}
              testID="dashboard-disconnect-btn"
            >
              <WifiOff size={16} color={Colors.error} />
              <Text style={styles.disconnectBtnText}>Disconnect</Text>
            </Pressable>
          )}
          {isConnecting && (
            <View style={styles.connectingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.connectingRowText}>Connecting...</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.quickActions, { opacity: headerFade, transform: [{ translateY: quickActionSlide }] }]}>
          <Pressable
            style={styles.primaryAction}
            onPress={handleQuickRecord}
            testID="quick-record-btn"
          >
            <View style={styles.primaryActionInner}>
              <View style={styles.recIconWrap}>
                <Video size={22} color={Colors.white} />
              </View>
              <View style={styles.primaryActionText}>
                <Text style={styles.primaryActionTitle}>
                  {isRecording ? 'Recording...' : isStreaming ? 'Live View' : 'Open Camera'}
                </Text>
                <Text style={styles.primaryActionSub}>
                  {isStreaming ? 'Glasses stream active' : 'Phone camera fallback'}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </View>
          </Pressable>
        </Animated.View>

        {raybanRecordings.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Glasses size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Glasses Recordings</Text>
              </View>
              <Text style={styles.sectionCount}>{raybanRecordings.length}</Text>
            </View>

            <FlatList
              data={raybanRecordings.slice(0, 6)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <RecordingCard recording={item} compact />}
              style={styles.horizontalList}
              contentContainerStyle={styles.horizontalListContent}
              scrollEnabled={true}
            />

            {raybanRecordings.length > 4 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>All Glasses Recordings</Text>
                </View>
                {raybanRecordings.slice(0, 10).map((recording) => (
                  <View key={recording.id} style={styles.recordingItem}>
                    <RecordingCard recording={recording} />
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {raybanRecordings.length === 0 && (
          <View style={styles.emptyState}>
            <Glasses size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Glasses Recordings</Text>
            <Text style={styles.emptySub}>
              Connect your Ray-Ban Meta and start streaming to capture recordings from your glasses.
            </Text>
            <Pressable
              style={styles.emptyAction}
              onPress={handleQuickRecord}
              testID="empty-go-record"
            >
              <Film size={16} color={Colors.primary} />
              <Text style={styles.emptyActionText}>Go to Camera</Text>
            </Pressable>
          </View>
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
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
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  deviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 14,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceCardInfo: {
    flex: 1,
  },
  deviceCardName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  deviceCardModel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 1,
  },
  connDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  deviceStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  deviceStatLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  deviceStatValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  quickActions: {
    gap: 10,
  },
  primaryAction: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  primaryActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  recIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.recording,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    flex: 1,
  },
  primaryActionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryActionSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sectionCount: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  horizontalList: {
    marginHorizontal: -20,
  },
  horizontalListContent: {
    paddingHorizontal: 20,
  },
  recordingItem: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  emptyActionText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGlow,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  connectBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  disconnectBtnText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  connectingRowText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
