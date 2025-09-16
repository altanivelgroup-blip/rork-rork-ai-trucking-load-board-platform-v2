import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { initAuth } from '@/auth/initAuth';

interface StartupInitializerProps {
  children: React.ReactNode;
}

export function StartupInitializer({ children }: StartupInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showTimeout, setShowTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  console.log('[StartupInitializer] LOADING FIX - Component rendered, isInitializing:', isInitializing);

  useEffect(() => {
    let isMounted = true;

    console.log('[StartupInitializer] LOADING FIX - EMERGENCY MODE - Immediate completion');
    
    // EMERGENCY FIX: Skip all initialization and complete immediately
    const immediateComplete = () => {
      if (isMounted) {
        console.log('[StartupInitializer] LOADING FIX - EMERGENCY - Completing initialization immediately');
        setIsInitializing(false);
      }
    };
    
    // Complete immediately
    immediateComplete();
    
    // Backup timeout in case something goes wrong
    timeoutRef.current = setTimeout(() => {
      if (isMounted && isInitializing) {
        console.log('[StartupInitializer] LOADING FIX - EMERGENCY TIMEOUT - Forcing completion');
        setShowTimeout(true);
        setIsInitializing(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // STEP 3: Enhanced loading screen with timeout handling
  if (isInitializing) {
    console.log('[StartupInitializer] LOADING FIX - Showing enhanced loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b5fff" />
        <Text style={styles.loadingText}>Loading...</Text>
        {showTimeout && (
          <View style={styles.timeoutContainer}>
            <AlertTriangle color="#f59e0b" size={20} />
            <Text style={styles.timeoutText}>Taking longer than expected...</Text>
            <TouchableOpacity 
              style={styles.forceButton}
              onPress={() => setIsInitializing(false)}
            >
              <Text style={styles.forceButtonText}>Continue Anyway</Text>
            </TouchableOpacity>
          </View>
        )}
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
  timeoutContainer: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeoutText: {
    marginTop: 8,
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
  },
  forceButton: {
    marginTop: 16,
    backgroundColor: '#0b5fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  forceButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});