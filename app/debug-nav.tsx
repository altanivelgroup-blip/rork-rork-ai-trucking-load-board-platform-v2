import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function DebugNavScreen() {
  const router = useRouter();

  const testRoutes = [
    { name: 'Add Photo Test', path: '/add-photo-test' },
    { name: 'Settings', path: '/settings' },
    { name: 'Post Load', path: '/post-load' },
    { name: 'Contact', path: '/contact' },
    { name: 'Help Support', path: '/help-support' },
    { name: 'Dashboard', path: '/(tabs)/dashboard' },
    { name: 'Profile', path: '/(tabs)/profile' },
    ...(typeof __DEV__ !== 'undefined' && __DEV__ ? [{ name: 'Cron Test (Dev)', path: '/dev-cron' }] : [] as { name: string; path: string }[]),
  ];

  const testNavigation = (path: string, name: string) => {
    console.log(`[Debug] Testing navigation to ${name} (${path})`);
    try {
      router.push(path as any);
    } catch (error) {
      console.error(`[Debug] Navigation failed for ${name}:`, error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Navigation' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Navigation Test</Text>
        <Text style={styles.subtitle}>Test navigation to different screens</Text>
        
        {testRoutes.map((route) => (
          <TouchableOpacity
            key={route.path}
            style={styles.button}
            onPress={() => testNavigation(route.path, route.name)}
            testID={`debug-nav-${route.name.replace(/\s+/g, '-').toLowerCase()}`}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{route.name}</Text>
            <Text style={styles.buttonPath}>{route.path}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  buttonPath: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
});