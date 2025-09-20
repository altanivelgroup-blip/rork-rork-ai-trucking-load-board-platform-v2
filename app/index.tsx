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
      console.log('[IndexScreen] ✅ SIGN IN NAV FIX: Navigating authenticated user for role:', user.role);
      
      // Immediate navigation without delay to fix sign-in flow
      try {
        if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
          console.log('[IndexScreen] 🔄 Navigating to admin dashboard');
          router.replace('/(tabs)/admin');
        } else if (user.role === 'shipper') {
          console.log('[IndexScreen] 🔄 Navigating to shipper dashboard');
          router.replace('/(tabs)/shipper');
        } else {
          console.log('[IndexScreen] 🔄 Navigating to driver dashboard');
          router.replace('/(tabs)/dashboard');
        }
      } catch (navError) {
        console.error('[IndexScreen] Navigation error:', navError);
        // Fallback to login if navigation fails
        router.replace('/(auth)/login');
      }
    } else {
      console.log('[IndexScreen] ✅ SIGN IN NAV FIX: No authenticated user, navigating to login');
      try {
        router.replace('/(auth)/login');
      } catch (navError) {
        console.error('[IndexScreen] Navigation to login failed:', navError);
      }
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

