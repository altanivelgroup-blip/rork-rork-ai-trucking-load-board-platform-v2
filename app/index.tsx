import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] Starting app...');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log('[IndexScreen] Auth state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role
  });

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      console.log('[IndexScreen] Auth still loading...');
      return;
    }

    // Navigate based on auth state
    if (isAuthenticated && user) {
      console.log('[IndexScreen] User authenticated, navigating to dashboard');
      const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
      router.replace(targetRoute);
    } else {
      console.log('[IndexScreen] User not authenticated, navigating to login');
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>Loading...</Text>
      <Text style={styles.subText}>Please wait...</Text>
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

