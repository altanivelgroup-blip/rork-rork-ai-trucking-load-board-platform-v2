import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from "expo-router";
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Give auth a moment to initialize
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  console.log('[Index] Auth state:', { 
    isLoading, 
    isAuthenticated, 
    userRole: user?.role,
    initializing 
  });

  // Show loading while auth is initializing
  if (isLoading || initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading LoadRun...</Text>
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated && user) {
    if (user.role === 'shipper') {
      console.log('[Index] Redirecting authenticated shipper to shipper tab');
      return <Redirect href="/(tabs)/shipper" />;
    } else if (user.role === 'admin') {
      console.log('[Index] Redirecting authenticated admin to admin dashboard');
      return <Redirect href="/(tabs)/admin" />;
    } else {
      console.log('[Index] Redirecting authenticated driver to dashboard');
      return <Redirect href="/(tabs)/dashboard" />;
    }
  }

  // Not authenticated - go to login
  console.log('[Index] Redirecting to login');
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
});
