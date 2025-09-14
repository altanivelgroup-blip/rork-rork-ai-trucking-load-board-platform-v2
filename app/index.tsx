import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Settings, Zap } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showManualNav, setShowManualNav] = useState(false);

  useEffect(() => {
    console.log('[Index] App launched - redirecting to login immediately');
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let manualNavTimeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Immediately redirect to login as the first screen
    try {
      router.replace('/(auth)/login');
    } catch (error) {
      console.warn('[Index] Navigation error:', error);
      // Fallback with minimal delay if immediate navigation fails
      timeoutId = setTimeout(() => {
        try {
          router.replace('/(auth)/login');
        } catch (secondError) {
          console.warn('[Index] Second navigation attempt failed:', secondError);
          // Show manual navigation options after 3 seconds
          manualNavTimeoutId = setTimeout(() => {
            setShowManualNav(true);
          }, 3000);
        }
      }, 50);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (manualNavTimeoutId) {
        clearTimeout(manualNavTimeoutId);
      }
    };
  }, [router]);

  const handleManualNavigation = (route: string) => {
    if (!route || route.trim().length === 0) {
      console.error('[Index] Invalid route provided');
      return;
    }
    
    try {
      router.push(route as any);
    } catch (error) {
      console.error('[Index] Manual navigation failed:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.title} testID="splashTitle">
        LoadRush
      </Text>
      <Text style={styles.subtitle} testID="splashSubtitle">
        AI Load Board for Car Haulers
      </Text>
      
      {showManualNav && (
        <View style={styles.manualNavContainer}>
          <Text style={styles.manualNavTitle}>Navigation Options</Text>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => handleManualNavigation('/platform-sanity-check')}
          >
            <TrendingUp color={theme.colors.white} size={20} />
            <Text style={styles.navButtonText}>Platform Health Check</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => handleManualNavigation('/api-sanity-check')}
          >
            <Zap color={theme.colors.white} size={20} />
            <Text style={styles.navButtonText}>API Health Check</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => handleManualNavigation('/firebase-sanity-check')}
          >
            <Settings color={theme.colors.white} size={20} />
            <Text style={styles.navButtonText}>Firebase Diagnostics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, styles.primaryButton]}
            onPress={() => handleManualNavigation('/(auth)/login')}
          >
            <Text style={styles.navButtonText}>Continue to Login</Text>
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
  manualNavContainer: {
    marginTop: 40,
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  manualNavTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 20,
    textAlign: 'center',
  },
  navButton: {
    backgroundColor: theme.colors.gray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    maxWidth: 300,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    marginTop: 8,
  },
  navButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});