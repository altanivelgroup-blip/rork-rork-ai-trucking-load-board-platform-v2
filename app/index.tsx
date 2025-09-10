import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth();
  const [hasNavigated, setHasNavigated] = useState<boolean>(false);
  const [showManualNav, setShowManualNav] = useState<boolean>(false);

  useEffect(() => {
    console.log('[Index] Auth state - user:', !!user, 'isLoading:', isLoading, 'hasNavigated:', hasNavigated);
    
    // Don't navigate if still loading or already navigated
    if (isLoading || hasNavigated) {
      return;
    }

    let isMounted = true;

    // Show manual navigation after 3 seconds if auto-nav fails
    const manualNavTimer = setTimeout(() => {
      if (!hasNavigated && isMounted) {
        console.log('[Index] Auto-navigation timeout, showing manual options');
        setShowManualNav(true);
      }
    }, 3000);
    
    // Navigate based on auth state
    const navTimer = setTimeout(() => {
      if (hasNavigated || !isMounted) return;
      
      try {
        setHasNavigated(true);
        if (user) {
          console.log('[Index] User authenticated, redirecting to dashboard');
          router.replace('/(tabs)/dashboard');
        } else {
          console.log('[Index] No user, redirecting to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.warn('[Index] Navigation error:', error);
        if (isMounted) {
          setHasNavigated(false);
          setShowManualNav(true);
        }
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(navTimer);
      clearTimeout(manualNavTimer);
    };
  }, [router, user, isLoading, hasNavigated]);

  const handleManualLogin = () => {
    try {
      router.replace('/(auth)/login');
    } catch (error) {
      console.warn('[Index] Manual login navigation error:', error);
    }
  };

  const handleManualDashboard = () => {
    try {
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.warn('[Index] Manual dashboard navigation error:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.title} testID="splashTitle">
        LoadBoard AI
      </Text>
      <Text style={styles.subtitle} testID="splashSubtitle">
        {isLoading ? 'Loading...' : user ? 'Loading dashboard...' : 'Redirecting to sign in...'}
      </Text>
      
      {showManualNav && (
        <View style={styles.manualNav}>
          <Text style={styles.manualNavText}>Navigation seems stuck. Choose manually:</Text>
          <TouchableOpacity style={styles.navButton} onPress={handleManualLogin}>
            <Text style={styles.navButtonText}>Go to Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={handleManualDashboard}>
            <Text style={styles.navButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
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
  manualNav: {
    marginTop: 40,
    alignItems: 'center',
  },
  manualNavText: {
    color: theme.colors.gray,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  navButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 5,
    minWidth: 150,
  },
  navButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});