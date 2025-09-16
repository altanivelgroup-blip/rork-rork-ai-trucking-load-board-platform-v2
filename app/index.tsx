import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] NAVIGATION FIX - Starting with safe navigation check');
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log('[IndexScreen] NAVIGATION FIX - State check:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    isNavigationReady
  });
  
  // Set navigation ready after a short delay to ensure everything is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[IndexScreen] NAVIGATION FIX - Setting navigation ready');
      setIsNavigationReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('[IndexScreen] NAVIGATION FIX - Navigation effect triggered');
    
    // Wait for both auth and navigation to be ready
    if (isLoading) {
      console.log('[IndexScreen] NAVIGATION FIX - Auth still loading, waiting...');
      return;
    }
    
    if (!isNavigationReady) {
      console.log('[IndexScreen] NAVIGATION FIX - Navigation not ready, waiting...');
      return;
    }

    console.log('[IndexScreen] NAVIGATION FIX - Ready to navigate, auth state:', { isAuthenticated, userRole: user?.role });
    
    // Small delay to ensure everything is mounted
    const timer = setTimeout(() => {
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
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user?.role, user, router, isNavigationReady]);

  // Show loading screen while auth or navigation initializes
  if (isLoading || !isNavigationReady) {
    const loadingReason = isLoading ? 'Auth loading...' : 'Navigation initializing...';
    console.log('[IndexScreen] NAVIGATION FIX - Showing loading screen:', loadingReason);
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.text}>{loadingReason}</Text>
      </View>
    );
  }

  // Fallback view (should not be reached)
  console.log('[IndexScreen] NAVIGATION FIX - Showing fallback view');
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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

