import React from 'react';
import { Tabs } from 'expo-router';
import { Home, User, Package, MapPin, PlusCircle, BarChart3, Settings, Truck, FileText } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';

  return (
    <Tabs
      initialRouteName={isShipper ? "shipper" : isAdmin ? "dashboard" : "dashboard"}
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
      {/* Dashboard Tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          href: (isDriver || isAdmin) ? '/dashboard' : null,
        }}
      />
      
      {/* Loads Tab */}
      <Tabs.Screen
        name="loads"
        options={{
          title: isShipper ? 'My Loads' : 'Loads',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
          href: (isDriver || isShipper || isAdmin) ? '/loads' : null,
        }}
      />
      
      {/* Service Finder / Backhauls Tab (Driver only) */}
      <Tabs.Screen
        name="service-finder"
        options={{
          title: 'Backhauls',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
          href: isDriver ? '/service-finder' : null,
        }}
      />
      
      {/* Shipper Dashboard / Service Finder Tab */}
      <Tabs.Screen
        name="shipper"
        options={{
          title: isShipper ? 'Dashboard' : (isDriver ? 'Service Finder' : 'Shipper'),
          tabBarIcon: ({ color, size }) => isShipper ? <Home color={color} size={size} /> : <MapPin color={color} size={size} />,
          href: (isShipper || isDriver) ? '/shipper' : null,
        }}
      />
      
      {/* Shipper Post Loads Tab */}
      <Tabs.Screen
        name="shipper-post"
        options={{
          title: 'Post Loads',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
          href: isShipper ? '/shipper-post' : null,
        }}
      />
      
      {/* Analytics / Reports Tab */}
      <Tabs.Screen
        name="shipper-analytics"
        options={{
          title: isAdmin ? 'Reports' : 'Analytics',
          tabBarIcon: ({ color, size }) => isAdmin ? <FileText color={color} size={size} /> : <BarChart3 color={color} size={size} />,
          href: (isShipper || isAdmin) ? '/shipper-analytics' : null,
        }}
      />
      
      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          href: (isDriver || isShipper || isAdmin) ? '/profile' : null,
        }}
      />
      
      {/* Admin Tab */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          href: isAdmin ? '/admin' : null,
        }}
      />
    </Tabs>
  );
}