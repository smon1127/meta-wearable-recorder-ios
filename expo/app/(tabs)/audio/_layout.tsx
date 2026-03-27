import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function AudioLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Audio', headerShown: false }} />
    </Stack>
  );
}
