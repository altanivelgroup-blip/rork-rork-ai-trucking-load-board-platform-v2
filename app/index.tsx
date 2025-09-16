import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  
  console.log('[Index] EMERGENCY LOGIN FIX - Forcing redirect to login page');
  
  useEffect(() => {
    // EMERGENCY FIX: Force immediate redirect to login
    const timer = setTimeout(() => {
      console.log('[Index] EMERGENCY LOGIN FIX - Executing redirect to login');
      router.replace('/(auth)/login');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  // Show loading while redirecting
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
});

