import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase } from '@/utils/firebase';
import { theme } from '@/constants/theme';

export default function HeaderAuthAction() {
  const { user } = useAuth();
  const router = useRouter();

  const { auth } = getFirebase();
  const isFirebaseSignedIn = !!auth?.currentUser;
  const showAccount = !!user && isFirebaseSignedIn;
  const label = showAccount ? 'Account' : 'Sign In';
  const target = showAccount ? '/account' : '/signin';

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
