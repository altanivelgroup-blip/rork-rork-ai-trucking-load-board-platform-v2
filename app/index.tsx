import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        console.log('[Index] Auth loaded, isAuthenticated:', isAuthenticated);
        if (isAuthenticated) {
          console.log('[Index] User authenticated, navigating to dashboard');
          router.replace('/(tabs)/(loads)');
        } else {
          console.log('[Index] User not authenticated, navigating to login');
          router.replace('/(auth)/login');
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.white }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 20, color: theme.colors.gray, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>
        LoadBoard AI
      </Text>
      <Text style={{ marginTop: 10, color: theme.colors.gray, textAlign: 'center', fontSize: 14 }}>
        {isLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </Text>
    </View>
  );
}
