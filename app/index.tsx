import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from "expo-router";
import { theme } from '@/constants/theme';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[Index] Starting app initialization...');
        
        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('[Index] App ready, redirecting to login');
        setIsReady(true);
      } catch (err: any) {
        console.error('[Index] Initialization failed:', err);
        setError(err.message || 'Failed to initialize app');
        // Still redirect after error to prevent infinite loading
        setTimeout(() => setIsReady(true), 2000);
      }
    };

    initializeApp();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.errorText}>Loading LoadRun...</Text>
        <Text style={styles.subText}>Initializing app components</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading LoadRun...</Text>
        <Text style={styles.subText}>Preparing your experience</Text>
      </View>
    );
  }

  console.log('[Index] Redirecting to login');
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    textAlign: 'center',
  },
  errorText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.error || '#ef4444',
    textAlign: 'center',
  },
  subText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
});
