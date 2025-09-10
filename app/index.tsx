import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('[Index] Scheduling redirect to login');
    // Delay navigation to ensure the navigation system is ready
    const timer = setTimeout(() => {
      try {
        router.replace('/(auth)/login');
      } catch (error) {
        console.warn('[Index] Navigation error:', error);
        // Retry after a longer delay if first attempt fails
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1000);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.title} testID="splashTitle">
        LoadBoard AI
      </Text>
      <Text style={styles.subtitle} testID="splashSubtitle">
        Redirecting to sign in...
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