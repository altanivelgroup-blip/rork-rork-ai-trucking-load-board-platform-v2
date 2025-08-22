import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    // Redirect based on auth state
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading screen while determining auth state
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#0b1220',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}