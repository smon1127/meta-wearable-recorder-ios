import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Clock, Film, Mic } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Recording } from '@/mocks/recordings';

interface RecordingCardProps {
  recording: Recording;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
  return `${mb} MB`;
}

function timeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RecordingCard({ recording, compact = false }: RecordingCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  if (compact) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.compactCard}
          testID={`recording-compact-${recording.id}`}
        >
          <Image
            source={{ uri: recording.thumbnail }}
            style={styles.compactThumbnail}
            contentFit="cover"
          />
          <View style={styles.compactOverlay}>
            <Text style={styles.compactDuration}>{formatDuration(recording.duration)}</Text>
          </View>
          <Text style={styles.compactTitle} numberOfLines={1}>{recording.title}</Text>
          <Text style={styles.compactMeta}>{recording.resolution} · {recording.fps}fps</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
        testID={`recording-${recording.id}`}
      >
        <Image
          source={{ uri: recording.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(recording.duration)}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>{recording.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Film size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{recording.resolution} · {recording.fps}fps</Text>
            </View>
            <View style={styles.metaItem}>
              <Mic size={12} color={Colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{recording.audioSource}</Text>
            </View>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.metaItem}>
              <Clock size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{timeAgo(recording.timestamp)}</Text>
            </View>
            <Text style={styles.fileSize}>{formatFileSize(recording.fileSize)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(RecordingCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  thumbnail: {
    width: '100%',
    height: 180,
  },
  durationBadge: {
    position: 'absolute',
    top: 148,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileSize: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  compactCard: {
    width: 150,
    marginRight: 12,
  },
  compactThumbnail: {
    width: 150,
    height: 100,
    borderRadius: 12,
  },
  compactOverlay: {
    position: 'absolute',
    top: 72,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactDuration: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  compactTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  compactMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
