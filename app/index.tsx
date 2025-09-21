import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';

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
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
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
  const [isClearing, setIsClearing] = useState(false);

  console.log('[Index] Auth state:', {
    hasAuthState: !!authState,
    isLoading: authState?.isLoading,
    hasUser: !!authState?.user,
    userRole: authState?.user?.role,
    userEmail: authState?.user?.email
  });

  const clearAllData = async () => {
    setIsClearing(true);
    try {
      // Clear all possible cached user data
      const keysToRemove = [
        'auth:user:profile',
        'auth:user:profile_backup',
        'profile:cache',
        'profile:persistent',
        'driver:profile:backup',
        'auth:user:persistent',
        'profile:emergency',
        'profile:recovery',
        'user:session:backup',
        'auth:permanent:cache'
      ];
      
      for (const key of keysToRemove) {
        try {
          await AsyncStorage.removeItem(key);
          console.log('[Index] Cleared:', key);
        } catch (error) {
          console.warn('[Index] Failed to clear:', key, error);
        }
      }
      
      // Also clear web storage if available
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          for (const key of keysToRemove) {
            try {
              window.localStorage.removeItem(key);
            } catch (e) {}
          }
        }
        if (window.sessionStorage) {
          for (const key of keysToRemove) {
            try {
              window.sessionStorage.removeItem(key);
            } catch (e) {}
          }
        }
      }
      
      console.log('[Index] All cached data cleared, reloading...');
      // Force reload
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('[Index] Error clearing data:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Show loading while auth is initializing
  if (!authState || authState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking session…</Text>
        
        {/* Debug: Show clear cache button during loading */}
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={clearAllData}
          disabled={isClearing}
        >
          <Text style={styles.clearButtonText}>
            {isClearing ? 'Clearing...' : 'Clear All Cache & Restart'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.debugText}>
          If stuck on loading, tap above to clear all cached data
        </Text>
      </SafeAreaView>
    );
  }

  const user = authState.user;

  // If no user or user is guest, redirect to sign in
  if (!user || user.email === 'guest@example.com') {
    console.log('[Index] No authenticated user found, redirecting to sign in');
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
