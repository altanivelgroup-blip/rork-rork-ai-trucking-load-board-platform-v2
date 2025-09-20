import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function HeaderAuthAction() {
  const { user } = useAuth();
  const router = useRouter();

  const label = useMemo(() => (user ? 'Account' : 'Sign In'), [user]);
  const target = useMemo(() => (user ? '/account' : '/signin'), [user]);

  return (
    <TouchableOpacity
      onPress={() => {
        try {
          router.push(target as any);
        } catch (e) {
          console.warn('header nav error', e);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={user ? 'header-account' : 'header-signin'}
      style={styles.button}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
});
