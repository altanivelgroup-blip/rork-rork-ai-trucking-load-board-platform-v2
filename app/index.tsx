import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  console.log('[IndexScreen] FINAL FIX - Starting with bulletproof navigation');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  console.log('[IndexScreen] FINAL FIX - State:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    hasNavigated,
    isReady
  });

  // Wait for everything to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      console.log('[IndexScreen] FINAL FIX - Navigation system ready');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || hasNavigated || isLoading) {
      console.log('[IndexScreen] FINAL FIX - Waiting...', { isReady, hasNavigated, isLoading });
      return;
    }

    console.log('[IndexScreen] FINAL FIX - Ready to navigate');
    
    const navigate = async () => {
      try {
        setHasNavigated(true);
        
        // Give a small delay to ensure router is completely ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (isAuthenticated && user) {
          console.log('[IndexScreen] FINAL FIX - Authenticated user, going to dashboard');
          const route = user.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
          router.replace(route);
        } else {
          console.log('[IndexScreen] FINAL FIX - No authenticated user, going to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[IndexScreen] FINAL FIX - Navigation failed:', error);
        // Reset and try again after a delay
        setHasNavigated(false);
        setTimeout(() => {
          try {
            router.replace('/(auth)/login');
          } catch (fallbackError) {
            console.error('[IndexScreen] FINAL FIX - Fallback navigation also failed:', fallbackError);
          }
        }, 2000);
      }
    };

    navigate();
  }, [isReady, hasNavigated, isLoading, isAuthenticated, user, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.text}>LoadRun</Text>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.subText}>
          {!isReady ? 'Starting app...' : isLoading ? 'Checking authentication...' : 'Redirecting...'}
        </Text>
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

