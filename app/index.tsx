import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log('[Index] Forcing redirect to login on refresh/navigation');
    // Immediate redirect for faster startup
    router.replace('/(auth)/login');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.white }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 20, color: theme.colors.gray, textAlign: 'center', fontSize: 18, fontWeight: '600' }} testID="splashTitle">
        LoadBoard AI
      </Text>
      <Text style={{ marginTop: 10, color: theme.colors.gray, textAlign: 'center', fontSize: 14 }} testID="splashSubtitle">
        Redirecting to sign in...
      </Text>
    </View>
  );
}
