import React from 'react';
import { Tabs } from 'expo-router';
import { Home, User, Package, MapPin, PlusCircle, BarChart3, Users, FileText, Settings, Eye, Truck } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';

  return (
    <Tabs
      initialRouteName={isShipper ? "shipper" : isAdmin ? "admin" : "dashboard"}
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
      {/* Driver Menu: Dashboard, Loads, Backhauls, Service Finder, Profile */}
      {isDriver && (
        <>
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="loads"
            options={{
              title: 'Loads',
              tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="shipper"
            options={{
              title: 'Backhauls',
              tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="service-finder"
            options={{
              title: 'Service Finder',
              tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
            }}
          />
        </>
      )}
      
      {/* Shipper Menu: Dashboard, Post Loads, My Loads, Analytics, Profile */}
      {isShipper && (
        <>
          <Tabs.Screen
            name="shipper"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
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
            name="loads"
            options={{
              title: 'My Loads',
              tabBarIcon: ({ color, size }) => <Eye color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="shipper-analytics"
            options={{
              title: 'Analytics',
              tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
            }}
          />
        </>
      )}
      
      {/* Admin Menu: Users, Reports, Settings, Loads Overview, Profile */}
      {isAdmin && (
        <>
          <Tabs.Screen
            name="admin"
            options={{
              title: 'Users',
              tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="shipper-analytics"
            options={{
              title: 'Reports',
              tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="shipper-post"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="loads"
            options={{
              title: 'Loads Overview',
              tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
            }}
          />
        </>
      )}

      {/* Hidden tabs for non-relevant roles */}
      {!isShipper && (
        <>
          <Tabs.Screen
            name="shipper"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="shipper-post"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="shipper-analytics"
            options={{
              href: null,
            }}
          />
        </>
      )}
      {!isDriver && (
        <>
          <Tabs.Screen
            name="dashboard"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="service-finder"
            options={{
              href: null,
            }}
          />
        </>
      )}
      {!isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
          }}
        />
      )}
    </Tabs>
  );
}
