import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dashboard', headerShown: false }} />
    </Stack>
  );
}
