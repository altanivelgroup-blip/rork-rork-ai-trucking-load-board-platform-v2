import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function HeaderAuthAction() {
  const { user, logout } = useAuth();
  const router = useRouter();

  console.log('[HeaderAuthAction] 🎯 SIGN IN NAVIGATION - Current state:', {
    hasUser: !!user,
    userEmail: user?.email,
    userRole: user?.role
  });

  // If user is signed in, show Sign Out button
  if (user) {
    return (
      <TouchableOpacity
        onPress={async () => {
          console.log('[HeaderAuthAction] 🎯 SIGN OUT - Starting logout process...');
          
          try {
            if (logout) {
              await logout();
            }
            console.log('[HeaderAuthAction] ✅ SIGN OUT - Logout successful, redirecting to signin');
            router.replace('/signin');
          } catch (e) {
            console.error('[HeaderAuthAction] ❌ SIGN OUT - Logout error:', e);
            // Force navigation to signin even if logout fails
            router.replace('/signin');
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
        testID="header-signout"
        style={[styles.button, styles.signOutButton]}
      >
        <Text style={[styles.text, styles.signOutText]}>Sign Out</Text>
      </TouchableOpacity>
    );
  }

  // If no user, show Sign In button
  return (
    <TouchableOpacity
      onPress={() => {
        console.log('[HeaderAuthAction] 🎯 SIGN IN NAVIGATION - Redirecting to signin');
        router.replace('/signin');
      }}
      accessibilityRole="button"
      accessibilityLabel="Sign In"
      testID="header-signin"
      style={styles.button}
    >
      <Text style={styles.text}>Sign In</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
  },
  text: {
    color: theme.colors.primary,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  signOutText: {
    color: '#FF3B30',
  },
});
