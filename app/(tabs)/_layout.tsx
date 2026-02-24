import { Tabs } from 'expo-router';
import { LayoutDashboard, Video, Mic } from 'lucide-react-native';
import React from 'react';
import Colors from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, size }) => <Video size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: 'Audio',
          tabBarIcon: ({ color, size }) => <Mic size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
