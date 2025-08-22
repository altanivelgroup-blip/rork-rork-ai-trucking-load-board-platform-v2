import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');

  useEffect(() => {
    console.log('[Index] Auth state:', { isAuthenticated, isLoading, hasNavigated });
    setDebugInfo(`Auth: ${isAuthenticated ? 'Yes' : 'No'}, Loading: ${isLoading ? 'Yes' : 'No'}`);
    
    if (!isLoading && !hasNavigated) {
      setHasNavigated(true);
      setDebugInfo('Navigating...');
      
      const timer = setTimeout(() => {
        try {
          if (isAuthenticated) {
            console.log('[Index] Navigating to dashboard');
            router.replace('/(tabs)/dashboard');
          } else {
            console.log('[Index] Navigating to login');
            router.replace('/(auth)/login');
          }
        } catch (error) {
          console.error('[Index] Navigation error:', error);
          setDebugInfo('Navigation failed');
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, router, hasNavigated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.white, padding: 20 }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 20, color: theme.colors.gray, textAlign: 'center' }}>
        LoadBoard AI
      </Text>
      <Text style={{ marginTop: 10, color: theme.colors.gray, fontSize: 12, textAlign: 'center' }}>
        {debugInfo}
      </Text>
    </View>
  );
}
