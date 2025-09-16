import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] SIMPLE FIX - Starting');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log('[IndexScreen] SIMPLE FIX - Auth state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role
  });

  useEffect(() => {
    if (isLoading) {
      console.log('[IndexScreen] SIMPLE FIX - Auth loading, waiting...');
      return;
    }

    console.log('[IndexScreen] SIMPLE FIX - Auth ready, navigating...');
    
    // Navigate immediately when auth is ready
    try {
      if (isAuthenticated && user) {
        const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
        console.log('[IndexScreen] SIMPLE FIX - Authenticated, going to:', targetRoute);
        router.replace(targetRoute);
      } else {
        console.log('[IndexScreen] SIMPLE FIX - Not authenticated, going to login');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('[IndexScreen] SIMPLE FIX - Navigation error:', error);
      // Fallback to login
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, user?.role, user, router]);

  // Show loading screen while auth initializes
  console.log('[IndexScreen] SIMPLE FIX - Showing loading screen');
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

