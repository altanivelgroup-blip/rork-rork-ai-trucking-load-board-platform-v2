import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export default function Home() {
  console.log('[Home] mounted');
  return (
    <View style={styles.container} testID="HomeScreen">
      <Text style={styles.title} accessibilityRole="header">Home</Text>
      <Text style={styles.body}>Home screen works</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: 8,
  },
  body: {
    fontSize: 18,
    color: theme.colors.gray,
  },
});
