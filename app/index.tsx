import React, { useEffect } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] CRASH FIX - Starting with enhanced navigation safety');
  
  const router = useRouter();
  const navState = useRootNavigationState();
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log('[IndexScreen] CRASH FIX - State:', {
    navReady: Boolean(navState?.key),
    isLoading,
    isAuthenticated,
    userRole: user?.role
  });

  useEffect(() => {
    console.log('[IndexScreen] CRASH FIX - Navigation effect triggered');
    
    // CRITICAL: Wait for navigation to be ready
    if (!navState?.key) {
      console.log('[IndexScreen] CRASH FIX - Navigation not ready, waiting...');
      return;
    }

    // CRITICAL: Wait for auth to initialize
    if (isLoading) {
      console.log('[IndexScreen] CRASH FIX - Auth still loading, waiting...');
      return;
    }

    console.log('[IndexScreen] CRASH FIX - Ready to navigate, auth state:', { isAuthenticated, userRole: user?.role });
    
    try {
      if (isAuthenticated && user) {
        const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
        console.log('[IndexScreen] CRASH FIX - Redirecting authenticated user to:', targetRoute);
        router.replace(targetRoute);
      } else {
        console.log('[IndexScreen] CRASH FIX - Redirecting to login');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('[IndexScreen] CRASH FIX - Navigation error:', error);
      // Fallback to login on any navigation error
      router.replace('/(auth)/login');
    }
  }, [navState?.key, isLoading, isAuthenticated, user?.role, user, router]);

  // Show loading screen while navigation initializes
  if (!navState?.key || isLoading) {
    console.log('[IndexScreen] CRASH FIX - Showing loading screen');
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Fallback view (should not be reached)
  console.log('[IndexScreen] CRASH FIX - Showing fallback view');
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

