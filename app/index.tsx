import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Settings, Zap, AlertTriangle } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showManualNav, setShowManualNav] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const navigationAttempted = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('[Index] LOADING FIX - Starting with 5s timeout protection');
    
    // STEP 2: Force advance after 5 seconds maximum
    timeoutRef.current = setTimeout(() => {
      console.log('[Index] LOADING FIX - 5s timeout reached, forcing navigation');
      setLoadingTimeout(true);
      setShowManualNav(true);
      
      if (!navigationAttempted.current) {
        console.log('[Index] LOADING FIX - Timeout forcing navigation to login');
        try {
          router.replace('/(auth)/login');
          navigationAttempted.current = true;
        } catch (error) {
          console.warn('[Index] LOADING FIX - Timeout navigation failed:', error);
        }
      }
    }, 5000);
    
    // Show manual navigation after 2 seconds as backup
    const manualNavTimeout = setTimeout(() => {
      setShowManualNav(true);
    }, 2000);
    
    // Try immediate navigation
    const immediateNavigation = setTimeout(() => {
      if (!navigationAttempted.current) {
        try {
          console.log('[Index] LOADING FIX - Attempting immediate navigation to login');
          router.replace('/(auth)/login');
          navigationAttempted.current = true;
        } catch (error) {
          console.warn('[Index] LOADING FIX - Immediate navigation failed:', error);
        }
      }
    }, 100);
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearTimeout(manualNavTimeout);
      clearTimeout(immediateNavigation);
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
          {loadingTimeout && (
            <View style={styles.timeoutWarning}>
              <AlertTriangle color={theme.colors.warning} size={24} />
              <Text style={styles.timeoutText}>Loading timeout - Manual navigation available</Text>
            </View>
          )}
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
            style={styles.navButton}
            onPress={() => handleManualNavigation('/loading-fix-test')}
          >
            <Settings color={theme.colors.white} size={20} />
            <Text style={styles.navButtonText}>Loading Fix Test</Text>
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
  timeoutWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  timeoutText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});