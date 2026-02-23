import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Glasses, Battery, HardDrive, Wifi } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { WearableDevice } from '@/mocks/devices';

interface DeviceStatusCardProps {
  device: WearableDevice;
}

function DeviceStatusCard({ device }: DeviceStatusCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const batteryColor = device.batteryLevel > 50
    ? Colors.success
    : device.batteryLevel > 20
    ? Colors.warning
    : Colors.error;

  const storagePercent = (device.storageUsed / device.storageTotal) * 100;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.deviceInfo}>
          <View style={styles.iconContainer}>
            <Glasses size={24} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceModel}>{device.model}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, device.connected ? styles.connected : styles.disconnected]}>
          <View style={[styles.statusDot, { backgroundColor: device.connected ? Colors.success : Colors.error }]} />
          <Text style={[styles.statusText, { color: device.connected ? Colors.success : Colors.error }]}>
            {device.connected ? 'Connected' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={styles.statHeader}>
            <Battery size={14} color={batteryColor} />
            <Text style={styles.statLabel}>Battery</Text>
          </View>
          <Text style={[styles.statValue, { color: batteryColor }]}>{device.batteryLevel}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${device.batteryLevel}%`, backgroundColor: batteryColor }]} />
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <View style={styles.statHeader}>
            <HardDrive size={14} color={Colors.primary} />
            <Text style={styles.statLabel}>Storage</Text>
          </View>
          <Text style={styles.statValue}>{device.storageUsed}/{device.storageTotal} GB</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${storagePercent}%`, backgroundColor: Colors.primary }]} />
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <View style={styles.statHeader}>
            <Wifi size={14} color={Colors.textSecondary} />
            <Text style={styles.statLabel}>Synced</Text>
          </View>
          <Text style={styles.statValue}>{device.lastSyncTime}</Text>
          <Text style={styles.fwVersion}>v{device.firmwareVersion}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default React.memo(DeviceStatusCard);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  deviceModel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  connected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  disconnected: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  progressBar: {
    width: '80%',
    height: 3,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 2,
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  fwVersion: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});
