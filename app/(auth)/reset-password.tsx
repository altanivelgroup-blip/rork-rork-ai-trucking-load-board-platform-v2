import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = useCallback(async () => {
    if (!email) {
      Alert.alert('Missing email', 'Enter the email associated with your account.');
      return;
    }
    setIsLoading(true);
    try {
      console.log('[reset] sending reset email to', email);
      await resetPassword(email);
      Alert.alert('Email sent', 'Check your email for password reset instructions.');
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('[reset] error', e);
      Alert.alert('Reset failed', 'Unable to send reset email.');
    } finally {
      setIsLoading(false);
    }
  }, [email, resetPassword, router]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={20} color={theme.colors.dark} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>We'll email you a link to reset it</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.gray} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            </View>

            <TouchableOpacity style={styles.cta} onPress={handleReset} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.ctaText}>Send reset link</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.lg },
  backText: { marginLeft: 6, color: theme.colors.dark },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.dark },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 4 },
  form: { marginTop: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.dark },
  cta: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.sm },
  ctaText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '700' },
});
