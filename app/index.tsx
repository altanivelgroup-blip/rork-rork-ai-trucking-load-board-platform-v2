import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] CLEAN START - Simple navigation without hooks');
  
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

  useEffect(() => {
    if (isLoading) {
      console.log('[IndexScreen] Still loading auth...');
      return;
    }
    
    if (hasNavigated) {
      console.log('[IndexScreen] Already navigated, skipping...');
      return;
    }

    console.log('[IndexScreen] Ready to navigate...');
    
    // Simple navigation with minimal delay
    const timer = setTimeout(() => {
      try {
        setHasNavigated(true);
        if (isAuthenticated && user) {
          const targetRoute = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          console.log('[IndexScreen] Authenticated, going to:', targetRoute);
          router.replace(targetRoute);
        } else {
          console.log('[IndexScreen] Not authenticated, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] Navigation error:', error);
        setHasNavigated(false);
        // Simple fallback
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 500);
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

