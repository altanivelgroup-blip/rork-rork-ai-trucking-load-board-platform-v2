import { Stack } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { theme } from '@/constants/theme';
import HeaderBack from '@/components/HeaderBack';

export default function LoadsLayout() {
  const headerLeft = useCallback(({ tintColor }: { tintColor?: string }) => (
    <HeaderBack tintColor={tintColor ?? theme.colors.white} size={28} />
  ), []);

  const screenOptions = useMemo(() => ({
    headerStyle: {
      backgroundColor: theme.colors.primary,
    },
    headerTintColor: theme.colors.white,
    headerTitleStyle: {
      fontWeight: '600' as const,
    },
    headerTitleAlign: 'center' as const,
    headerLeft,
  }), [headerLeft]);

  const loadsOptions = useMemo(() => ({
    title: 'Available Loads',
  }), []);

  return (
    <Stack initialRouteName="loads" screenOptions={screenOptions}>
      <Stack.Screen name="loads" options={loadsOptions} />
    </Stack>
  );
}