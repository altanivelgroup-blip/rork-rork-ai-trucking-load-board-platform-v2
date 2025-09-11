import React from 'react';
import { Tabs } from 'expo-router';
import { Home, User, Truck, Package, Wallet, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray,
        tabBarStyle: {
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
        name="dashboard"
        options={{
          title: isDriver ? 'Dashboard' : 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="loads"
        options={{
          title: isDriver ? 'AI Loads' : 'My Loads',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      {isDriver && (
        <Tabs.Screen
          name="service-finder"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      {/* Hide shipper tab for drivers, hide service-finder for shippers */}
      {!isDriver && (
        <Tabs.Screen
          name="shipper"
          options={{
            title: 'Tools',
            tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
          }}
        />
      )}
      {isDriver && (
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            href: '/wallet',
            tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
          }}
        />
      )}
      <Tabs.Screen
        name="admin"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
