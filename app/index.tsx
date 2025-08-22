import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log('[Index] Starting app, navigating to login');
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.white }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 20, color: theme.colors.gray, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>
        LoadBoard AI
      </Text>
    </View>
  );
}
