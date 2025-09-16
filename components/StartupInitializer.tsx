import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initAuth } from '@/auth/initAuth';

interface StartupInitializerProps {
  children: React.ReactNode;
}

export function StartupInitializer({ children }: StartupInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  
  console.log('[StartupInitializer] Component rendered, isInitializing:', isInitializing);

  useEffect(() => {
    let isMounted = true;

    async function performStartupInit() {
      try {
        console.log('[StartupInitializer] Starting app initialization...');
        
        // QUICK FIX: Skip Firebase initialization to prevent hanging
        console.log('[StartupInitializer] Skipping Firebase init to prevent hanging');
        
        // Very minimal delay, then proceed immediately
        await new Promise(resolve => setTimeout(resolve, 50));
        
        console.log('[StartupInitializer] App initialization completed (quick mode)');
        
        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (error: any) {
        console.warn('[StartupInitializer] Initialization failed:', error);
        
        // Always proceed to avoid blocking the app
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    performStartupInit();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show minimal loading screen during initialization
  if (isInitializing) {
    console.log('[StartupInitializer] Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b5fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Render the app
  console.log('[StartupInitializer] Rendering children');
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
});