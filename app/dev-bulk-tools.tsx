import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import BulkToolsScreen from '@/screens/dev/BulkTools';
import { useAuth } from '@/hooks/useAuth';

function useDevGate(): { allowed: boolean; reason?: string } {
  const { user } = useAuth();
  const allowedEmails = useMemo(() => [
    'robertlv996@gmail.com',
    'altanivelgroup@gmail.com',
  ] as const, []);

  const isDevFlag = typeof __DEV__ !== 'undefined' && __DEV__;
  const byEmail = !!user?.email && (allowedEmails as readonly string[]).includes(user.email ?? '');
  const allowed = isDevFlag || byEmail;
  const reason = allowed ? undefined : 'Not authorized';
  return { allowed, reason };
}

export default function DevBulkToolsRoute() {
  const gate = useDevGate();

  if (!gate.allowed) {
    console.log('[DevBulkTools] access denied');
    return (
      <View style={styles.denied} testID="devbulk-denied">
        <Stack.Screen options={{ title: 'Dev Tools' }} />
        <Text style={styles.deniedTitle}>Restricted</Text>
        <Text style={styles.deniedText}>You are not authorized to view this screen.</Text>
        <Text style={styles.deniedText}>Login with an allowed account.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="devbulk-root">
      <Stack.Screen options={{ title: 'Bulk Tools (Dev)' }} />
      <BulkToolsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.lightGray },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  deniedTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  deniedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
});
