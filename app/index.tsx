import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is fully mounted before navigation
  useEffect(() => {
    console.log('[Index] EMERGENCY FIX - Component mounting...');
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      console.log('[Index] EMERGENCY FIX - Waiting for component to mount');
      return;
    }

    console.log('[Index] EMERGENCY FIX - Component mounted, starting navigation');
    
    // Wait for next tick to ensure Root Layout is fully rendered
    const navigationTimer = setTimeout(() => {
      try {
        console.log('[Index] EMERGENCY FIX - Attempting navigation to login');
        router.replace('/(auth)/login');
        console.log('[Index] EMERGENCY FIX - Navigation successful');
      } catch (error) {
        console.error('[Index] EMERGENCY FIX - Navigation failed:', error);
        
        // Multiple fallback attempts with increasing delays
        setTimeout(() => {
          try {
            console.log('[Index] EMERGENCY FIX - Fallback 1: push navigation');
            router.push('/(auth)/login');
          } catch (fallbackError) {
            console.error('[Index] EMERGENCY FIX - Fallback 1 failed:', fallbackError);
            
            // Final fallback
            setTimeout(() => {
              try {
                console.log('[Index] EMERGENCY FIX - Fallback 2: replace navigation');
                router.replace('/(auth)/login');
              } catch (finalError) {
                console.error('[Index] EMERGENCY FIX - All navigation attempts failed:', finalError);
              }
            }, 500);
          }
        }, 200);
      }
    }, 100);

    return () => {
      clearTimeout(navigationTimer);
    };
  }, [router, isMounted]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.title} testID="splashTitle">
        LoadRush
      </Text>
      <Text style={styles.subtitle} testID="splashSubtitle">
        AI Load Board for Car Haulers
      </Text>
      <Text style={styles.loadingText}>
        Navigating to login...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  title: {
    marginTop: 20,
    color: theme.colors.dark,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: theme.colors.gray,
    textAlign: 'center',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 20,
    color: theme.colors.primary,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});