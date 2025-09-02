import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Mail, Lock, Phone, Building } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { moderateScale } from '@/src/ui/scale';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/26wbvri4j4j5lt84ceaac';

export default function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignUp = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      console.log('[signup] creating account for', email);
      await register(email, password, { name, phone, company });
      router.replace('/dashboard');
    } catch (e) {
      console.error('[signup] error', e);
      Alert.alert('Sign Up Failed', 'Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, name, phone, company, register, router]);

  return (
    <>

      <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: AUTH_ICON_URL }}
                style={styles.logoImage}
                resizeMode="cover"
                accessibilityLabel="App icon"
                testID="signup-logo-image"
              />
            </View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Start moving smarter</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.gray} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            </View>
            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.gray} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            </View>
            <View style={styles.inputContainer}>
              <UserPlus size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={theme.colors.gray} value={name} onChangeText={setName} />
            </View>
            <View style={styles.inputContainer}>
              <Phone size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={theme.colors.gray} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            <View style={styles.inputContainer}>
              <Building size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Company (optional)" placeholderTextColor={theme.colors.gray} value={company} onChangeText={setCompany} />
            </View>
            <TouchableOpacity style={styles.cta} onPress={handleSignUp} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.ctaText}>Create Account</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.secondary}>
              <Text style={styles.secondaryText}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  logoContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(24),
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  logoImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(24),
  },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  form: { marginTop: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.dark },
  cta: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.sm },
  ctaText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: theme.spacing.md },
  secondaryText: { color: theme.colors.primary },
});
