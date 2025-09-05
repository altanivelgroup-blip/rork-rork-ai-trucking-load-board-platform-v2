import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export default function Loads() {
  console.log('[Loads] mounted');
  return <View style={styles.container} testID="LoadsScreen" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
});
