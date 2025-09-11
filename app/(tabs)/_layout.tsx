import React from 'react';
import { Tabs } from 'expo-router';
import { Home, User, Package, MapPin, PlusCircle, BarChart3 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';

  return (
    <Tabs
      initialRouteName={isShipper ? "shipper" : "dashboard"}
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
      {/* Dashboard tab - only show for drivers */}
      {isDriver && (
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
      )}
      
      {/* Driver-specific tabs */}
      {isDriver && (
        <>
          <Tabs.Screen
            name="loads"
            options={{
              title: 'AI Loads',
              tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="service-finder"
            options={{
              title: 'Services',
              tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
            }}
          />
        </>
      )}
      
      {/* Shipper-specific tabs */}
      {isShipper && (
        <>
          <Tabs.Screen
            name="shipper"
            options={{
              title: 'Shipper',
              tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="shipper-post"
            options={{
              title: 'Post Loads',
              tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="shipper-analytics"
            options={{
              title: 'Analytics',
              tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
            }}
          />
        </>
      )}
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />

      {/* Hidden tabs */}
      {!isShipper && (
        <Tabs.Screen
          name="shipper"
          options={{
            href: null,
          }}
        />
      )}
      {!isDriver && (
        <Tabs.Screen
          name="dashboard"
          options={{
            href: null,
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
