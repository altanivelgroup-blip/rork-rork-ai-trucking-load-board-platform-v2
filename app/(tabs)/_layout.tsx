import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, PlusCircle, User, Truck, Crown, Search } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
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
        name="(loads)"
        options={{
          title: 'Loads',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="service-finder"
        options={{
          title: 'Service Finder',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="post-load"
        options={{
          title: 'Post a Load',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="shipper"
        options={{
          title: 'Shipper',
          tabBarIcon: ({ color, size }) => <Crown color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
