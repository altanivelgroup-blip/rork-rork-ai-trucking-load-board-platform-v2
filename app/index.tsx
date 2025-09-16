import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] NAVIGATION FIX - Starting app with simplified navigation...');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  console.log('[IndexScreen] NAVIGATION FIX - Auth state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    hasNavigated
  });

  useEffect(() => {
    console.log('[IndexScreen] NAVIGATION FIX - Navigation effect triggered');
    
    // Prevent multiple navigation attempts
    if (hasNavigated) {
      console.log('[IndexScreen] NAVIGATION FIX - Already navigated, skipping');
      return;
    }
    
    // Wait for auth to finish loading
    if (isLoading) {
      console.log('[IndexScreen] NAVIGATION FIX - Auth still loading...');
      return;
    }

    // Add a small delay to ensure navigation is ready
    const navigationTimer = setTimeout(() => {
      try {
        // Navigate based on auth state
        if (isAuthenticated && user) {
          console.log('[IndexScreen] NAVIGATION FIX - User authenticated, navigating to dashboard');
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] NAVIGATION FIX - User not authenticated, navigating to login');
          router.replace('/(auth)/login');
        }
        setHasNavigated(true);
      } catch (error) {
        console.error('[IndexScreen] NAVIGATION FIX - Navigation error:', error);
        // Fallback to login on any navigation error
        router.replace('/(auth)/login');
        setHasNavigated(true);
      }
    }, 100);

    return () => clearTimeout(navigationTimer);
  }, [isLoading, isAuthenticated, user, router, hasNavigated]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>LoadRun</Text>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#666" />
        <Text style={styles.subText}>Initializing...</Text>
      </View>
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
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
});

