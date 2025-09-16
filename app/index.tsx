import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] NAVIGATION FIX - Starting with safe navigation');
  
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [navigationReady, setNavigationReady] = useState(false);

  console.log('[IndexScreen] NAVIGATION FIX - State:', {
    navigationReady,
    isLoading,
    isAuthenticated,
    userRole: user?.role
  });

  // Use a timeout to ensure navigation is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[IndexScreen] NAVIGATION FIX - Navigation ready timeout reached');
      setNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('[IndexScreen] NAVIGATION FIX - Navigation effect triggered');
    
    // Wait for navigation to be ready
    if (!navigationReady) {
      console.log('[IndexScreen] NAVIGATION FIX - Navigation not ready, waiting...');
      return;
    }

    // Wait for auth to initialize
    if (isLoading) {
      console.log('[IndexScreen] NAVIGATION FIX - Auth still loading, waiting...');
      return;
    }

    console.log('[IndexScreen] NAVIGATION FIX - Ready to navigate, auth state:', { isAuthenticated, userRole: user?.role });
    
    try {
      if (isAuthenticated && user) {
        const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
        console.log('[IndexScreen] NAVIGATION FIX - Redirecting authenticated user to:', targetRoute);
        router.replace(targetRoute);
      } else {
        console.log('[IndexScreen] NAVIGATION FIX - Redirecting to login');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('[IndexScreen] NAVIGATION FIX - Navigation error:', error);
      // Fallback to login on any navigation error
      try {
        router.replace('/(auth)/login');
      } catch (fallbackError) {
        console.error('[IndexScreen] NAVIGATION FIX - Fallback navigation also failed:', fallbackError);
      }
    }
  }, [navigationReady, isLoading, isAuthenticated, user?.role, user, router]);

  // Show loading screen while navigation initializes
  if (!navigationReady || isLoading) {
    console.log('[IndexScreen] NAVIGATION FIX - Showing loading screen');
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Fallback view (should not be reached)
  console.log('[IndexScreen] NAVIGATION FIX - Showing fallback view');
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Initializing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

