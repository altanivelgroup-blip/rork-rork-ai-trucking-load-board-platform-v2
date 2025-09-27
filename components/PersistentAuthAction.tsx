import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function PersistentAuthAction() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const top = Math.max(insets.top, 8);

  const onSignOut = async () => {
    try {
      console.log('[PersistentAuthAction] Sign out tap');
      await logout?.();
    } catch (e) {
      console.warn('[PersistentAuthAction] Logout error, navigating to /login anyway', e);
    } finally {
      router.replace('/login');
    }
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.container, { top }]}> 
        <TouchableOpacity
          onPress={onSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
          testID="persistent-signout"
          style={styles.button}
        >
          <Text style={styles.text}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    zIndex: 1000,
  },
  button: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({ web: { cursor: 'pointer' as const }, default: {} }),
  },
  text: {
    color: '#FF3B30',
    fontWeight: '700' as const,
    fontSize: 14,
  },
});
