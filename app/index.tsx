import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] NAVIGATION FIX - Starting with safe navigation');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  console.log('[IndexScreen] NAVIGATION FIX - State:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    hasNavigated,
    navigationReady
  });

  // Wait for navigation to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setNavigationReady(true);
      console.log('[IndexScreen] NAVIGATION FIX - Navigation ready');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !navigationReady) {
      console.log('[IndexScreen] NAVIGATION FIX - Waiting for auth or navigation...', { isLoading, navigationReady });
      return;
    }
    
    if (hasNavigated) {
      console.log('[IndexScreen] NAVIGATION FIX - Already navigated, skipping...');
      return;
    }

    console.log('[IndexScreen] NAVIGATION FIX - Ready to navigate...');
    
    // Safe navigation with error handling
    const timer = setTimeout(() => {
      try {
        setHasNavigated(true);
        if (isAuthenticated && user) {
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          console.log('[IndexScreen] NAVIGATION FIX - Authenticated, going to:', targetRoute);
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] NAVIGATION FIX - Not authenticated, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] NAVIGATION FIX - Navigation error:', error);
        setHasNavigated(false);
        // Fallback: try again after a delay
        setTimeout(() => {
          try {
            router.replace('/(auth)/login');
          } catch (fallbackError) {
            console.error('[IndexScreen] NAVIGATION FIX - Fallback navigation failed:', fallbackError);
          }
        }, 1000);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user?.role, user, router, hasNavigated, navigationReady]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>Loading...</Text>
      {!isLoading && (
        <Text style={styles.subText}>Redirecting...</Text>
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

