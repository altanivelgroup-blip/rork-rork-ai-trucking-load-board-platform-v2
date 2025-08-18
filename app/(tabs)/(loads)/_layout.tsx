import { Stack } from 'expo-router';
import React from 'react';
import { theme } from '@/constants/theme';
import HeaderBack from '@/components/HeaderBack';

export default function LoadsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerTitleAlign: 'center',
        headerLeft: ({ tintColor }) => (
          <HeaderBack tintColor={tintColor ?? theme.colors.white} size={28} />
        ),
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Available Loads",
        }} 
      />
    </Stack>
  );
}