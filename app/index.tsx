import React, { useEffect, useState } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] CRASH FIX - Starting with navigation state check');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Always call hooks in the same order
  const navState = useRootNavigationState();

  console.log('[IndexScreen] CRASH FIX - State:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    navReady: !!navState,
    hasNavigated
  });

  useEffect(() => {
    if (isLoading) {
      console.log('[IndexScreen] CRASH FIX - Auth loading, waiting...');
      return;
    }
    
    if (!navState) {
      console.log('[IndexScreen] CRASH FIX - Navigation state not ready, waiting...');
      return;
    }
    
    if (hasNavigated) {
      console.log('[IndexScreen] CRASH FIX - Already navigated, skipping...');
      return;
    }

    console.log('[IndexScreen] CRASH FIX - Auth and nav ready, navigating...');
    
    // Add small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
        setHasNavigated(true);
        if (isAuthenticated && user) {
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          console.log('[IndexScreen] CRASH FIX - Authenticated, going to:', targetRoute);
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] CRASH FIX - Not authenticated, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] CRASH FIX - Navigation error:', error);
        // Fallback to login
        router.replace('/(auth)/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user?.role, user, router, navState, hasNavigated, setHasNavigated]);

  // Show loading screen while auth initializes
  console.log('[IndexScreen] EMERGENCY FIX - Showing loading screen');
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>Loading...</Text>
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

