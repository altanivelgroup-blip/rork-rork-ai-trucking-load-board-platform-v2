import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showManualNav, setShowManualNav] = useState<boolean>(false);

  useEffect(() => {
    console.log('[Index] Starting navigation...');
    
    let isMounted = true;

    // Show manual navigation after 1 second
    const manualNavTimer = setTimeout(() => {
      if (isMounted) {
        console.log('[Index] Showing manual navigation options');
        setShowManualNav(true);
      }
    }, 1000);
    
    // Auto-navigate to login immediately
    const navTimer = setTimeout(() => {
      if (!isMounted) return;
      
      try {
        console.log('[Index] Auto-navigating to login');
        router.replace('/(auth)/login');
      } catch (error) {
        console.warn('[Index] Navigation error:', error);
        if (isMounted) {
          setShowManualNav(true);
        }
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(navTimer);
      clearTimeout(manualNavTimer);
    };
  }, [router]);

  const handleManualLogin = () => {
    try {
      console.log('[Index] Manual navigation to login');
      router.replace('/(auth)/login');
    } catch (error) {
      console.warn('[Index] Manual login navigation error:', error);
    }
  };

  const handleManualDashboard = () => {
    try {
      console.log('[Index] Manual navigation to dashboard');
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
        Redirecting to sign in...
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