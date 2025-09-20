import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function AccountScreen() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.hint}>Checking session…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Not signed in</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/signin')} testID="account-go-signin">
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.emailLabel}>Email</Text>
      <Text style={styles.email}>{user.email}</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.danger }]}
        onPress={async () => {
          await logout();
          router.replace('/signin');
        }}
        testID="account-signout"
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8, color: theme.colors.gray },
  container: { flex: 1, padding: 16, backgroundColor: theme.colors.white },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.dark, marginBottom: 16 },
  emailLabel: { color: theme.colors.gray, marginTop: 8 },
  email: { fontSize: 16, fontWeight: '600', marginBottom: 24 },
  button: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: theme.colors.white, fontWeight: '700' },
});
