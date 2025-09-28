import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Home, User, Package, MapPin, PlusCircle, BarChart3, Settings } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  // Always call useAuth hook first to maintain consistent hook order
  const authState = useAuth();
  
  // Safely destructure after hook is called
  const user = authState?.user;
  const isLoading = authState?.isLoading;

  // Don't redirect if still loading
  if (isLoading) {
    console.log('[TabsLayout] Auth still loading, waiting...');
    return null; // Let the index.tsx handle loading state
  }

  if (!user) {
    console.log('[TabsLayout] No user -> redirecting to /login');
    return <Redirect href="/login" />;
  }
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com' || user?.email === 'admin@test1.com';
  
  console.log('[TabsLayout] Rendering with user:', {
    email: user?.email,
    role: user?.role,
    isDriver,
    isShipper,
    isAdmin,
    userObject: user
  });

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
          overflow: 'hidden',
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      {/* Shipper Dashboard Tab (Always visible for shippers) - Position 1 for shippers */}
      <Tabs.Screen
        name="shipper"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          href: isShipper ? '/shipper' : null,
        }}
      />
      
      {/* Loads Tab - Dedicated Shipper Navigation - Position 2 for shippers */}
      <Tabs.Screen
        name="loads"
        options={{
          title: isShipper ? 'My Loads' : 'Loads',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
          href: isShipper ? '/loads' : (isDriver || isAdmin) ? '/loads' : null,
        }}
      />
      
      {/* Dashboard Tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          href: (isDriver || isAdmin) ? '/dashboard' : null,
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
      
      {/* Shipper Post Loads Tab (Always visible for shippers) */}
      <Tabs.Screen
        name="shipper-post"
        options={{
          title: 'Post Loads',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
          href: isShipper ? '/shipper-post' : null,
        }}
      />
      
      {/* Analytics Tab (Only visible for shippers) */}
      <Tabs.Screen
        name="shipper-analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
          href: isShipper ? '/shipper-analytics' : null,
        }}
      />
      
      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          href: (isDriver || isAdmin || isShipper) ? '/profile' : null,
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