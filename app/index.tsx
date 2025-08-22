import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';

export default function IndexScreen() {
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