import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useEffect(() => {
    console.log('[Index] Checking auth state...');
    
    // Wait for auth to initialize, then redirect appropriately
    const timer = setTimeout(() => {
      try {
        if (user) {
          console.log('[Index] User authenticated, redirecting to dashboard');
          router.replace('/(tabs)/dashboard');
        } else {
          console.log('[Index] No user, redirecting to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.warn('[Index] Navigation error:', error);
        // Fallback to login on error
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 500);
      }
    }, 300); // Slightly longer delay to ensure auth is ready

    return () => clearTimeout(timer);
  }, [router, user]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.title} testID="splashTitle">
        LoadBoard AI
      </Text>
      <Text style={styles.subtitle} testID="splashSubtitle">
        {user ? 'Loading dashboard...' : 'Redirecting to sign in...'}
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
    color: theme.colors.gray,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 10,
    color: theme.colors.gray,
    textAlign: 'center',
    fontSize: 14,
  },
});