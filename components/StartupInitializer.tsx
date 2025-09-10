import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initAuth } from '@/auth/initAuth';

interface StartupInitializerProps {
  children: React.ReactNode;
}

export function StartupInitializer({ children }: StartupInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function performStartupInit() {
      try {
        console.log('[StartupInitializer] Starting app initialization...');
        
        // Initialize Firebase auth at startup (non-blocking)
        initAuth().catch((error) => {
          console.warn('[StartupInitializer] Firebase init failed, continuing anyway:', error);
        });
        
        // Small delay to let things settle, then proceed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[StartupInitializer] App initialization completed');
        
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

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b5fff" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </View>
    );
  }

  // Render the app
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