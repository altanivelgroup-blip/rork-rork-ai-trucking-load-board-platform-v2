import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] NAV FIX - Starting with safe navigation state check');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Remove problematic navigation state hook - not needed for basic navigation
  // const navState = useRootNavigationState();
  const navState = null; // Skip nav state check to avoid getState error

  console.log('[IndexScreen] NAV FIX - State:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    navReady: !!navState,
    hasNavigated,
    navStateType: typeof navState
  });

  useEffect(() => {
    if (isLoading) {
      console.log('[IndexScreen] NAV FIX - Auth loading, waiting...');
      return;
    }
    
    // Navigation works without explicit nav state check
    // Removed useRootNavigationState() to fix getState error
    if (hasNavigated) {
      console.log('[IndexScreen] NAV FIX - Already navigated, skipping...');
      return;
    }

    console.log('[IndexScreen] NAV FIX - Auth ready, navigating without nav state dependency...');
    
    // Add small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
        setHasNavigated(true);
        if (isAuthenticated && user) {
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          console.log('[IndexScreen] NAV FIX - Authenticated, going to:', targetRoute);
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] NAV FIX - Not authenticated, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] NAV FIX - Navigation error:', error);
        // Reset navigation flag to retry
        setHasNavigated(false);
        // Fallback to login after delay
        setTimeout(() => {
          try {
            router.replace('/(auth)/login');
          } catch (fallbackError) {
            console.error('[IndexScreen] NAV FIX - Fallback navigation failed:', fallbackError);
          }
        }, 500);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user?.role, user, router, hasNavigated]);

  // Show loading screen while auth initializes
  console.log('[IndexScreen] NAV FIX - Showing loading screen');
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>Loading...</Text>
      {!isLoading && (
        <Text style={styles.subText}>Initializing navigation...</Text>
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
    marginBottom: 8,
  },
  subText: {
    fontSize: 12,
    color: '#999',
  },
});

