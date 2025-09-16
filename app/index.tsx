import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] EMERGENCY FIX - Direct navigation to login');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  console.log('[IndexScreen] State:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    hasNavigated
  });

  // EMERGENCY FIX: Force navigation to login immediately
  useEffect(() => {
    if (hasNavigated) return;
    
    console.log('[IndexScreen] EMERGENCY FIX - Forcing navigation to login');
    setHasNavigated(true);
    
    // Navigate immediately to login - no waiting
    const timer = setTimeout(() => {
      try {
        console.log('[IndexScreen] EMERGENCY FIX - Navigating to login now');
        router.replace('/(auth)/login');
      } catch (error) {
        console.error('[IndexScreen] EMERGENCY FIX - Navigation failed:', error);
        // Try again
        setTimeout(() => {
          router.push('/(auth)/login');
        }, 100);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [router, hasNavigated]);

  // Secondary effect for authenticated users
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    
    console.log('[IndexScreen] User is authenticated, redirecting to dashboard');
    const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
    router.replace(targetRoute);
  }, [isLoading, isAuthenticated, user, router]);

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

