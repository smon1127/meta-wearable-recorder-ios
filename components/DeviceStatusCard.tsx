import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Glasses, Wifi, WifiOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { WearableDevice } from '@/mocks/devices';

interface DeviceStatusCardProps {
  device: WearableDevice;
  connectionLabel: string;
  connectionColor: string;
}

function DeviceStatusCard({ device, connectionLabel, connectionColor }: DeviceStatusCardProps) {
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
        <View style={[styles.statusBadge, { borderColor: connectionColor, backgroundColor: `${connectionColor}15` }]}>
          {device.connected ? (
            <Wifi size={12} color={connectionColor} />
          ) : (
            <WifiOff size={12} color={connectionColor} />
          )}
          <Text style={[styles.statusText, { color: connectionColor }]}>
            {connectionLabel}
          </Text>
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
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
