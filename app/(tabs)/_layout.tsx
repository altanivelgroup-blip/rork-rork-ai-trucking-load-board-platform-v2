import React from 'react';
import { Tabs } from 'expo-router';
import { Home, User, Package, MapPin, PlusCircle, BarChart3, Settings } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  // Always call useAuth hook first to maintain consistent hook order
  const authState = useAuth();
  
  // Safely destructure after hook is called
  const user = authState?.user;
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';
  
  console.log('[TabsLayout] Rendering with user role:', user?.role);

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
          href: isShipper ? '/my-loads' : (isDriver || isAdmin) ? '/loads' : null,
        }}
      />
      
      {/* Service Finder Tab (Driver only - hidden from Admin) */}
      <Tabs.Screen
        name="service-finder"
        options={{
          title: 'Service Finder',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
          href: (isDriver && !isAdmin) ? '/service-finder' : null,
        }}
      />
      
      {/* Shipper Dashboard Tab (Shipper only) */}
      <Tabs.Screen
        name="shipper"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          href: isShipper ? '/shipper' : null,
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
          title: isAdmin ? 'Report Analytics' : 'Analytics',
          tabBarIcon: ({ color, size }) => isAdmin ? <BarChart3 color={color} size={size} /> : <BarChart3 color={color} size={size} />,
          href: isAdmin ? '/reports' : (isShipper ? '/shipper-analytics' : null),
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