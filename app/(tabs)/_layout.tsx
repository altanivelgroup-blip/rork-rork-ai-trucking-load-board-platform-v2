import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home as HomeIcon, User, Truck, Crown } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 6,
          backgroundColor: theme.colors.white,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Loads"
        options={{
          title: 'Loads',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size }) => <Crown color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
