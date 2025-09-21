import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { theme } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  resetContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  forceSigninButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  forceSigninButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default function Index() {
  const authState = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  console.log('[Index] 🎯 HARD RESET NAVIGATION - Auth state:', {
    hasAuthState: !!authState,
    isLoading: authState?.isLoading,
    hasUser: !!authState?.user,
    userRole: authState?.user?.role,
    userEmail: authState?.user?.email,
    isResetting,
    resetComplete
  });

  const performHardReset = async () => {
    console.log('[Index] 🔥 HARD RESET NAVIGATION - Starting complete auth reset...');
    setIsResetting(true);
    
    try {
      // Clear ALL auth-related storage
      const keysToRemove = [
        'auth:user:profile',
        'auth:user:profile_backup',
        'profile:cache',
        'profile:persistent',
        'auth:user:persistent',
        'analytics:initialized',
        'analytics:driver-profile',
        'analytics:backup',
        'live-analytics:enabled',
        'post-delivery:analytics:enabled',
        'auth:last-successful-login',
        'profile:history',
        'profile:recovery',
        'session:profile',
        'driver:profile:backup',
        'emergency:login',
        'profile:emergency',
        'profile:fallback',
        'backup:critical'
      ];
      
      // Remove all keys
      await Promise.all(keysToRemove.map(key => 
        AsyncStorage.removeItem(key).catch(() => {})
      ));
      
      // Get all keys and remove any that contain auth/profile patterns
      const allKeys = await AsyncStorage.getAllKeys();
      const authKeys = allKeys.filter(key => 
        key.includes('auth:') || 
        key.includes('profile:') || 
        key.includes('user:') ||
        key.includes('login:') ||
        key.includes('analytics:') ||
        key.includes('session:') ||
        key.includes('driver:') ||
        key.includes('shipper:') ||
        key.includes('emergency:')
      );
      
      await Promise.all(authKeys.map(key => 
        AsyncStorage.removeItem(key).catch(() => {})
      ));
      
      console.log('[Index] ✅ HARD RESET NAVIGATION - Cleared storage keys:', {
        specificKeys: keysToRemove.length,
        patternKeys: authKeys.length,
        total: keysToRemove.length + authKeys.length
      });
      
      // Force logout from auth hook
      if (authState?.logout) {
        await authState.logout();
      }
      
      setResetComplete(true);
      console.log('[Index] ✅ HARD RESET NAVIGATION - Reset complete!');
      
    } catch (error) {
      console.error('[Index] ❌ HARD RESET NAVIGATION - Reset failed:', error);
    } finally {
      setIsResetting(false);
    }
  };

  // Show loading while auth is initializing
  if (!authState || authState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {isResetting ? 'Resetting authentication...' : 'Loading...'}
        </Text>
        
        {/* Emergency reset options during loading */}
        <View style={styles.resetContainer}>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={performHardReset}
            disabled={isResetting}
          >
            <Text style={styles.resetButtonText}>
              {isResetting ? 'Resetting...' : 'HARD RESET AUTH'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.forceSigninButton}
            onPress={() => {
              console.log('[Index] 🎯 FORCE SIGNIN - Redirecting to signin');
              // Force redirect to signin
              window.location?.replace?.('/signin') || console.log('Force redirect not available');
            }}
          >
            <Text style={styles.forceSigninButtonText}>FORCE SIGN IN PAGE</Text>
          </TouchableOpacity>
          
          <Text style={styles.debugText}>
            If stuck loading, use HARD RESET AUTH to clear all data
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const user = authState.user;

  // If reset was completed or no user, redirect to sign in
  if (!user || resetComplete) {
    console.log('[Index] 🎯 HARD RESET NAVIGATION - No user or reset complete, redirecting to signin');
    return <Redirect href="/signin" />;
  }

  console.log('[Index] Authenticated user found, redirecting based on role:', user.role);
  
  // Redirect based on user role
  if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
    return <Redirect href="/(tabs)/admin" />;
  }
  if (user.role === 'shipper') {
    return <Redirect href="/(tabs)/shipper" />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
