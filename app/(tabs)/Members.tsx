import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export default function Members() {
  console.log('[Members] mounted');
  return (
    <View style={styles.container} testID="MembersScreen">
      <Text style={styles.title} accessibilityRole="header">Members</Text>
      <Text style={styles.body}>Members screen works</Text>
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
