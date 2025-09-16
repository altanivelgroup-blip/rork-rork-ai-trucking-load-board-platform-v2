import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('[Index] EMERGENCY FIX - Immediate navigation to login');
    
    // Immediate navigation without any delays or complex logic
    const navigate = () => {
      try {
        router.replace('/(auth)/login');
        console.log('[Index] EMERGENCY FIX - Navigation successful');
      } catch (error) {
        console.error('[Index] EMERGENCY FIX - Navigation failed:', error);
        // Fallback navigation
        setTimeout(() => {
          try {
            router.push('/(auth)/login');
          } catch (fallbackError) {
            console.error('[Index] EMERGENCY FIX - Fallback navigation failed:', fallbackError);
          }
        }, 100);
      }
    };
    
    // Navigate immediately
    navigate();
  }, [router]);

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