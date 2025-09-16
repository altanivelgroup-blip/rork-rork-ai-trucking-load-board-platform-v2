import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    console.log('[IndexScreen] Auth state:', { isLoading, isAuthenticated, userRole: user?.role });
    
    if (isLoading) {
      console.log('[IndexScreen] Still loading auth state...');
      return;
    }
    
    if (isAuthenticated && user) {
      console.log('[IndexScreen] ✅ PERMANENT FIX: Navigating authenticated user for role:', user.role);
      
      // Add small delay to ensure navigation state is ready
      setTimeout(() => {
        try {
          if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
            router.replace({ pathname: '/(tabs)/admin' });
          } else if (user.role === 'shipper') {
            router.replace({ pathname: '/(tabs)/shipper' });
          } else {
            router.replace({ pathname: '/(tabs)/dashboard' });
          }
        } catch (navError) {
          console.error('[IndexScreen] Navigation error:', navError);
          router.replace({ pathname: '/(auth)/login' });
        }
      }, 100);
    } else {
      console.log('[IndexScreen] ✅ PERMANENT FIX: No authenticated user, navigating to login');
      setTimeout(() => {
        try {
          router.replace({ pathname: '/(auth)/login' });
        } catch (navError) {
          console.error('[IndexScreen] Navigation to login failed:', navError);
        }
      }, 100);
    }
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

