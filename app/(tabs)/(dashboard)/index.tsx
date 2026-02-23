import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Video, Zap, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import DeviceStatusCard from '@/components/DeviceStatusCard';
import RecordingCard from '@/components/RecordingCard';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wearable, recordings, isRecording, selectedAudioDevice } = useApp();
  const headerFade = useRef(new Animated.Value(0)).current;
  const quickActionSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(quickActionSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [headerFade, quickActionSlide]);

  const handleQuickRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/record' as never);
  };

  const recentRecordings = recordings.slice(0, 6);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerSection, { opacity: headerFade }]}>
          <View>
            <Text style={styles.greeting}>Meta Wearable</Text>
            <Text style={styles.subtitle}>
              {isRecording ? '● Recording in progress' : `${recordings.length} recordings · ${selectedAudioDevice.name}`}
            </Text>
          </View>
          <View style={styles.liveDot}>
            <View style={[styles.dot, { backgroundColor: wearable.connected ? Colors.success : Colors.error }]} />
          </View>
        </Animated.View>

        <DeviceStatusCard device={wearable} />

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
                  {isRecording ? 'Recording...' : 'Start Recording'}
                </Text>
                <Text style={styles.primaryActionSub}>
                  {selectedAudioDevice.name} · 1080p
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </View>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/audio' as never);
            }}
            testID="quick-audio-btn"
          >
            <Zap size={18} color={Colors.primary} />
            <Text style={styles.secondaryActionText}>Audio Input</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <Text style={styles.sectionCount}>{recordings.length} total</Text>
        </View>

        <FlatList
          data={recentRecordings.slice(0, 4)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecordingCard recording={item} compact />}
          style={styles.horizontalList}
          contentContainerStyle={styles.horizontalListContent}
          scrollEnabled={true}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Recordings</Text>
        </View>

        {recentRecordings.map((recording) => (
          <View key={recording.id} style={styles.recordingItem}>
            <RecordingCard recording={recording} />
          </View>
        ))}

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
  liveDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
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
  secondaryAction: {
    width: 72,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
  },
  secondaryActionText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
});
