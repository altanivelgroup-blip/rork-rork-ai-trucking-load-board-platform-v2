import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] GETSTATE FIX - Starting without navigation state hook');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  console.log('[IndexScreen] GETSTATE FIX - State:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    hasNavigated
  });

  useEffect(() => {
    if (isLoading) {
      console.log('[IndexScreen] GETSTATE FIX - Auth loading, waiting...');
      return;
    }
    
    if (hasNavigated) {
      console.log('[IndexScreen] GETSTATE FIX - Already navigated, skipping...');
      return;
    }

    console.log('[IndexScreen] GETSTATE FIX - Auth ready, navigating...');
    
    // Simple navigation without nav state dependency
    const timer = setTimeout(() => {
      try {
        setHasNavigated(true);
        if (isAuthenticated && user) {
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          console.log('[IndexScreen] GETSTATE FIX - Authenticated, going to:', targetRoute);
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] GETSTATE FIX - Not authenticated, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] GETSTATE FIX - Navigation error:', error);
        setHasNavigated(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user?.role, user, router, hasNavigated]);

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

