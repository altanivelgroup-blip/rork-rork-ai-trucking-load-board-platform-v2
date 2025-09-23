import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { moderateScale } from '@/src/ui/scale';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      if (!email?.trim() || !password?.trim()) {
        setErrorText("Email and password are required.");
        return;
      }

      const emailTrimmed = email.trim().toLowerCase(); // Use user input, no hardcoding
      const passwordTrimmed = password.trim();

      console.log(`[Login] Authenticating: ${emailTrimmed}`);

      // Firebase authentication
      const { auth, db } = getFirebase();
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
      const firebaseUser = userCredential.user;

      console.log(`[Login] Firebase Success: UID ${firebaseUser.uid}`);

      // Fetch role from Firestore using UID
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setErrorText("No profile found in Firestore for this user.");
        return;
      }

      const userData = userSnap.data();
      let userRole = userData.role ? userData.role.toLowerCase() : 'driver'; // Make lowercase, default to driver if missing

      console.log(`[Login] Fetched role: ${userRole}`);

      // Route based on role
      if (userRole === "driver") {
        router.replace("/(tabs)/dashboard");
      } else if (userRole === "shipper") {
        router.replace("/(tabs)/shipper");
      } else if (userRole === "admin") {
        router.replace("/(tabs)/admin");
      } else {
        console.log(`[Login] Unknown role, defaulting to driver`);
        router.replace("/(tabs)/dashboard"); // Default to driver if no match
      }
    } catch (error: any) {
      console.error("[Login] Error:", error.code, error.message);
      setErrorText(`Login failed: ${error.code} - Check email/password or Firebase config.`);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, router]);

  return (
    <SafeAreaView style={styles.container} testID="login-safe">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                console.log('[login] logo pressed -> navigating to auth-debug');
                try { router.push('/auth-debug'); } catch (e) { console.warn('nav error', e); }
              }}
              onLongPress={() => {
                console.log('[login] logo long-pressed -> navigating to dev-bulk-tools');
                try { router.push('/dev-bulk-tools'); } catch (e) { console.warn('nav error', e); }
              }}
              delayLongPress={500}
              style={styles.logoContainer}
              testID="login-logo-hotspot"
              accessibilityRole="imagebutton"
              accessibilityLabel="App logo"
            >
              <Image
                source={{ uri: AUTH_ICON_URL }}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="LoadRun AI Load Board for Car Haulers"
                testID="login-logo-image"
              />
            </TouchableOpacity>
            <Text style={styles.title} testID="login-title">LoadRun</Text>
            <Text style={styles.subtitle}>AI Load Board for Car Haulers</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                testID="login-email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                testID="login-password"
              />
            </View>

            {!!errorText && (
              <Text style={styles.errorText} testID="login-error">{errorText}</Text>
            )}

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading || !(email?.trim() && password?.trim())}
              testID="login-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/(auth)/reset-password')} testID="forgot-password-link">
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} testID="signup-link">
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  logoContainer: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  logoImage: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(24),
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
  signUpText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
});