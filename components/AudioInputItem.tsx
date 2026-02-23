import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Mic, Headphones, Glasses, Usb, Check, Radio } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import type { AudioDevice } from '@/mocks/devices';

interface AudioInputItemProps {
  device: AudioDevice;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  usb: Usb,
  bluetooth: Radio,
  'built-in': Glasses,
  wired: Mic,
};

const typeLabels: Record<string, string> = {
  usb: 'USB',
  bluetooth: 'Bluetooth',
  'built-in': 'Built-in',
  wired: 'Wired',
};

function AudioInputItem({ device, isSelected, onSelect }: AudioInputItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (!device.connected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onSelect(device.id);
  }, [device.connected, device.id, onSelect, scaleAnim]);

  const IconComponent = device.type === 'bluetooth' ? Headphones : typeIcons[device.type] || Mic;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.container,
          isSelected && styles.selectedContainer,
          !device.connected && styles.disabledContainer,
        ]}
        testID={`audio-device-${device.id}`}
      >
        <View style={[styles.iconBox, isSelected && styles.selectedIconBox]}>
          <IconComponent
            size={20}
            color={isSelected ? Colors.primary : device.connected ? Colors.textSecondary : Colors.textMuted}
          />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, !device.connected && styles.disabledText]}>
            {device.name}
          </Text>
          <View style={styles.detailsRow}>
            <View style={[styles.typeBadge, isSelected && styles.selectedTypeBadge]}>
              <Text style={[styles.typeText, isSelected && styles.selectedTypeText]}>
                {typeLabels[device.type]}
              </Text>
            </View>
            <Text style={styles.specs}>
              {device.sampleRate / 1000}kHz · {device.channels}ch
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {!device.connected ? (
            <Text style={styles.offlineText}>Offline</Text>
          ) : isSelected ? (
            <View style={styles.checkCircle}>
              <Check size={14} color={Colors.background} strokeWidth={3} />
            </View>
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(AudioInputItem);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  selectedContainer: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  disabledContainer: {
    opacity: 0.45,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconBox: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  disabledText: {
    color: Colors.textMuted,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.surfaceHighlight,
  },
  selectedTypeBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  typeText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  selectedTypeText: {
    color: Colors.primary,
  },
  specs: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  rightSection: {
    width: 28,
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  offlineText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500' as const,
  },
});
