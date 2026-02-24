import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glasses, Video, AudioLines, PersonStanding, Wifi, CheckCircle, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const META_AI_APP_URL = 'fb-orca://'; 
const META_AI_WEB_FALLBACK = 'https://www.meta.com/experiences/';

type ConnectionStep = 'welcome' | 'connecting' | 'permissions' | 'connected';

export default function ConnectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPaired, setPaired, streamRegistration, registerStream, isRegistering } = useApp();

  const [step, setStep] = useState<ConnectionStep>(isPaired ? 'connected' : 'welcome');
  const [isOpeningMetaApp, setIsOpeningMetaApp] = useState<boolean>(false);

  const glassesFloat = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const wifiPulse = useRef(new Animated.Value(0.3)).current;
  const featureSlide = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(featureSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glassesFloat, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(glassesFloat, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(wifiPulse, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, featureSlide, glassesFloat, wifiPulse]);

  useEffect(() => {
    if (step === 'connected') {
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [step, checkScale]);

  const handleConnectPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setStep('connecting');
    setIsOpeningMetaApp(true);

    try {
      const canOpen = await Linking.canOpenURL(META_AI_APP_URL);
      console.log('[Connect] Can open Meta AI app:', canOpen);

      if (canOpen && Platform.OS !== 'web') {
        await Linking.openURL(META_AI_APP_URL);
      } else {
        await WebBrowser.openBrowserAsync(META_AI_WEB_FALLBACK, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      }
    } catch (err) {
      console.log('[Connect] Could not open Meta AI app, simulating pairing flow:', err);
    }

    setTimeout(() => {
      setIsOpeningMetaApp(false);
      setStep('permissions');
    }, 1500);
  }, [buttonScale]);

  const handleGrantPermissions = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    registerStream();

    setTimeout(async () => {
      await setPaired(true);
      setStep('connected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
  }, [registerStream, setPaired]);

  const handleContinueToApp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/(dashboard)' as never);
  }, [router]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Skip Connection?',
      'You can still use the phone camera, but glasses streaming won\'t be available until you connect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/(dashboard)' as never),
        },
      ]
    );
  }, [router]);

  const renderWelcome = () => (
    <Animated.View style={[styles.content, { opacity: fadeIn }]}>
      <View style={styles.heroSection}>
        <Animated.View style={[styles.glassesIconWrap, { transform: [{ translateY: glassesFloat }] }]}>
          <Animated.View style={[styles.wifiSignal, { opacity: wifiPulse }]}>
            <Wifi size={28} color={Colors.primary} />
          </Animated.View>
          <Glasses size={64} color={Colors.primary} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.featuresSection, { transform: [{ translateY: featureSlide }] }]}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Video size={20} color={Colors.textPrimary} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Video Capture</Text>
            <Text style={styles.featureDesc}>Record videos directly from your glasses, from your point of view.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <AudioLines size={20} color={Colors.textPrimary} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Open-Ear Audio</Text>
            <Text style={styles.featureDesc}>Hear notifications while keeping your ears open to the world around you.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <PersonStanding size={20} color={Colors.textPrimary} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Enjoy On-the-Go</Text>
            <Text style={styles.featureDesc}>Stay hands-free while you move through your day. Move freely, stay connected.</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.bottomSection}>
        <Text style={styles.redirectNote}>
          You'll be redirected to the Meta AI app to confirm your connection.
        </Text>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            style={styles.connectButton}
            onPress={handleConnectPress}
            testID="connect-glasses-btn"
          >
            <Text style={styles.connectButtonText}>Connect my glasses</Text>
          </Pressable>
        </Animated.View>

        <Pressable onPress={handleSkip} style={styles.skipBtn} testID="skip-connect-btn">
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderConnecting = () => (
    <View style={styles.content}>
      <View style={styles.centerContent}>
        <Animated.View style={[styles.glassesIconWrap, { transform: [{ translateY: glassesFloat }] }]}>
          <Glasses size={56} color={Colors.textMuted} />
        </Animated.View>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
        <Text style={styles.connectingTitle}>
          {isOpeningMetaApp ? 'Opening Meta AI...' : 'Connecting...'}
        </Text>
        <Text style={styles.connectingSub}>
          Confirm the connection in the Meta AI app
        </Text>
      </View>
    </View>
  );

  const renderPermissions = () => (
    <Animated.View style={[styles.content, { opacity: fadeIn }]}>
      <View style={styles.centerContent}>
        <View style={styles.permissionIcon}>
          <Glasses size={48} color={Colors.primary} />
        </View>

        <Text style={styles.permissionTitle}>Almost there!</Text>
        <Text style={styles.permissionDesc}>
          Grant camera access to stream video from your Meta glasses.
        </Text>

        <View style={styles.permissionCard}>
          <View style={styles.permissionRow}>
            <Video size={18} color={Colors.primary} />
            <Text style={styles.permissionRowText}>Camera streaming access</Text>
            <CheckCircle size={18} color={Colors.success} />
          </View>
          <View style={styles.permissionDivider} />
          <View style={styles.permissionRow}>
            <AudioLines size={18} color={Colors.primary} />
            <Text style={styles.permissionRowText}>Audio input access</Text>
            <CheckCircle size={18} color={Colors.success} />
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        {isRegistering ? (
          <View style={styles.connectButton}>
            <ActivityIndicator color={Colors.white} />
          </View>
        ) : (
          <Pressable
            style={styles.connectButton}
            onPress={handleGrantPermissions}
            testID="grant-permissions-btn"
          >
            <Text style={styles.connectButtonText}>Allow & Continue</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );

  const renderConnected = () => (
    <View style={styles.content}>
      <View style={styles.centerContent}>
        <Animated.View style={[styles.successIconWrap, { transform: [{ scale: checkScale }] }]}>
          <CheckCircle size={64} color={Colors.success} />
        </Animated.View>

        <Text style={styles.connectedTitle}>Connected!</Text>
        <Text style={styles.connectedDesc}>
          Your glasses are paired. You can now stream video and capture recordings.
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          style={styles.connectButton}
          onPress={handleContinueToApp}
          testID="continue-to-app-btn"
        >
          <Text style={styles.connectButtonText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {step === 'welcome' && renderWelcome()}
      {step === 'connecting' && renderConnecting()}
      {step === 'permissions' && renderPermissions()}
      {step === 'connected' && renderConnected()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  glassesIconWrap: {
    alignItems: 'center',
    gap: 8,
  },
  wifiSignal: {
    marginBottom: 4,
  },
  featuresSection: {
    paddingHorizontal: 28,
    gap: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  featureDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  redirectNote: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  connectButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  connectingTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  connectingSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permissionTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
  },
  permissionDesc: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 8,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  permissionRowText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  permissionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  successIconWrap: {
    marginBottom: 12,
  },
  connectedTitle: {
    color: Colors.success,
    fontSize: 26,
    fontWeight: '800' as const,
  },
  connectedDesc: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});
