import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { Redirect } from "expo-router";
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [forceLogin, setForceLogin] = useState(false);

  useEffect(() => {
    // Much shorter timeout to prevent long loading
    const timer = setTimeout(() => {
      setInitializing(false);
      setDebugInfo(`Auth: loading=${isLoading}, authenticated=${isAuthenticated}, user=${user?.role || 'none'}`);
    }, 500); // Reduced to 500ms

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user]);

  console.log('[Index] Auth state:', { 
    isLoading, 
    isAuthenticated, 
    userRole: user?.role,
    initializing,
    userId: user?.id
  });

  // Force login if user clicks the button
  if (forceLogin) {
    console.log('[Index] Force redirecting to login');
    return <Redirect href="/login" />;
  }

  // Show loading while auth is initializing (but not for too long)
  if ((isLoading || initializing) && !forceLogin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Starting LoadRun...</Text>
        {debugInfo && (
          <Text style={styles.debugText}>{debugInfo}</Text>
        )}
        <Pressable 
          style={styles.skipButton}
          onPress={() => setForceLogin(true)}
        >
          <Text style={styles.skipButtonText}>Skip to Login</Text>
        </Pressable>
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
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  debugText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
  },
  skipButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});
