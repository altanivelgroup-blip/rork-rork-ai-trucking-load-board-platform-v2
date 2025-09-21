import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase } from '@/utils/firebase';
import { theme } from '@/constants/theme';

export default function HeaderAuthAction() {
  const { user, logout } = useAuth();
  const router = useRouter();

  console.log('[HeaderAuthAction] 🎯 HARD RESET NAVIGATION - Current state:', {
    hasUser: !!user,
    userEmail: user?.email,
    userRole: user?.role
  });

  const { auth } = getFirebase();
  const isFirebaseSignedIn = !!auth?.currentUser;
  const showAccount = !!user && isFirebaseSignedIn;
  
  // HARD RESET: Always provide sign-in option if no proper user
  const label = showAccount ? 'Account' : 'Sign In';
  const target = showAccount ? '/account' : '/signin';

  return (
    <TouchableOpacity
      onPress={async () => {
        console.log('[HeaderAuthAction] 🎯 HARD RESET NAVIGATION - Button pressed:', { label, target });
        
        try {
          if (showAccount) {
            router.push(target as any);
          } else {
            // HARD RESET: If no user, force logout and go to signin
            console.log('[HeaderAuthAction] 🔥 HARD RESET - No proper user, forcing logout and signin');
            
            if (logout) {
              await logout();
            }
            
            // Force navigation to signin
            router.replace('/signin');
          }
        } catch (e) {
          console.error('[HeaderAuthAction] ❌ HARD RESET - Navigation error:', e);
          // Emergency fallback
          router.replace('/signin');
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  text: {
    color: theme.colors.primary,
    fontWeight: '600' as const,
    fontSize: 14,
  },
});
