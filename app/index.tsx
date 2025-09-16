import React, { useEffect, useState } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] NAV STATE FIX - Checking navigation readiness');
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Always call hooks - handle errors in useEffect
  const navState = useRootNavigationState();
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log('[IndexScreen] NAV STATE FIX - State check:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    navReady: !!navState?.key,
    isNavigationReady,
    navError
  });
  
  // Check if navigation is ready
  useEffect(() => {
    try {
      if (navState?.key && !isNavigationReady) {
        console.log('[IndexScreen] NAV STATE FIX - Navigation is now ready');
        setIsNavigationReady(true);
        if (navError) setNavError(null); // Clear any previous error
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Navigation state error';
      console.log('[IndexScreen] NAV STATE FIX - Navigation state error:', errorMessage);
      setNavError(errorMessage);
    }
  }, [navState?.key, isNavigationReady, navError]);

  useEffect(() => {
    console.log('[IndexScreen] NAV STATE FIX - Navigation effect triggered');
    
    // Wait for both auth and navigation to be ready
    if (isLoading) {
      console.log('[IndexScreen] NAV STATE FIX - Auth still loading, waiting...');
      return;
    }
    
    if (!isNavigationReady && !navError) {
      console.log('[IndexScreen] NAV STATE FIX - Navigation not ready, waiting...');
      return;
    }
    
    // If there's a navigation error, proceed anyway after a delay
    if (navError) {
      console.log('[IndexScreen] NAV STATE FIX - Navigation error detected, proceeding with fallback navigation');
    }

    console.log('[IndexScreen] NAV STATE FIX - Ready to navigate, auth state:', { isAuthenticated, userRole: user?.role });
    
    // Small delay to ensure everything is mounted
    const timer = setTimeout(() => {
      try {
        if (isAuthenticated && user) {
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          console.log('[IndexScreen] NAV STATE FIX - Redirecting authenticated user to:', targetRoute);
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] NAV STATE FIX - Redirecting to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] NAV STATE FIX - Navigation error:', error);
        // Fallback to login on any navigation error
        try {
          router.replace('/(auth)/login');
        } catch (fallbackError) {
          console.error('[IndexScreen] NAV STATE FIX - Fallback navigation also failed:', fallbackError);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user?.role, user, router, isNavigationReady, navError]);

  // Show loading screen while auth or navigation initializes
  if (isLoading || (!isNavigationReady && !navError)) {
    const loadingReason = isLoading ? 'Auth loading...' : 'Navigation initializing...';
    console.log('[IndexScreen] NAV STATE FIX - Showing loading screen:', loadingReason);
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.text}>{loadingReason}</Text>
      </View>
    );
  }

  // Fallback view (should not be reached)
  console.log('[IndexScreen] NAV STATE FIX - Showing fallback view');
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>Initializing...</Text>
      {navError && (
        <Text style={styles.errorText}>Navigation Error: {navError}</Text>
      )}
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
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

