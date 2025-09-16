import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] SIMPLE FIX - Starting with basic navigation');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log('[IndexScreen] SIMPLE FIX - Auth state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role
  });

  useEffect(() => {
    // Simple timeout to ensure everything is loaded
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log('[IndexScreen] SIMPLE FIX - Still loading, waiting...');
        return;
      }

      try {
        if (isAuthenticated && user) {
          console.log('[IndexScreen] SIMPLE FIX - Authenticated, going to dashboard');
          const route = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          router.replace(route);
        } else {
          console.log('[IndexScreen] SIMPLE FIX - Not authenticated, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] SIMPLE FIX - Navigation error, forcing login:', error);
        router.replace('/(auth)/login');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>LoadRun</Text>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.subText}>Loading...</Text>
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

