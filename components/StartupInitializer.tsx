import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initAuth } from '@/auth/initAuth';

interface StartupInitializerProps {
  children: React.ReactNode;
}

export function StartupInitializer({ children }: StartupInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function performStartupInit() {
      try {
        console.log('[StartupInitializer] Starting app initialization...');
        
        // Initialize Firebase auth at startup
        await initAuth();
        
        console.log('[StartupInitializer] App initialization completed');
        
        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (error: any) {
        console.warn('[StartupInitializer] Initialization failed:', error);
        
        if (isMounted) {
          setInitError(error?.message || 'Initialization failed');
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

  // Show error if initialization failed (but still render children)
  if (initError) {
    console.warn('[StartupInitializer] Proceeding despite initialization error:', initError);
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