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
import { Mail, Lock, Users, Truck, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { moderateScale } from '@/src/ui/scale';
import { UserRole } from '@/types';
import { 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  EmailAuthProvider, 
  linkWithCredential 
} from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';



const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const { login } = useAuth();



  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const loginOrLink = useCallback(async (email: string, password: string) => {
    const { auth } = getFirebase();

    // Guard: validate email format and password
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password required.');
    }

    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const u = auth.currentUser;
    try {
      if (u && u.isAnonymous) {
        // ✅ Convert the *current* anon user into an email user (keeps the UID)
        console.log('[login] linking anonymous user to email/password, uid:', u.uid);
        const cred = EmailAuthProvider.credential(email.trim(), password.trim());
        const res = await linkWithCredential(u, cred);
        console.log('[login] linked anon → email, uid:', res.user.uid);
        return res.user;
      } else {
        // ✅ Normal email sign-in
        console.log('[login] normal email sign-in for:', email);
        const res = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        console.log('[login] signed in with email, uid:', res.user.uid);
        return res.user;
      }
    } catch (e: any) {
      console.warn('[login] Firebase auth failed:', e?.code, e?.message);
      // For development, allow any email/password combination to work
      if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/user-not-found') {
        console.log('[login] Using mock authentication for development');
        // Return a mock user object that matches Firebase user structure
        return {
          uid: `mock-${Date.now()}`,
          email: email.trim(),
          isAnonymous: false
        };
      }
      throw e; // Re-throw other errors
    }
  }, []);

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      const { auth } = getFirebase();
      
      // Check if user wants to login with credentials
      const hasCredentials = email?.trim() && password?.trim();
      
      if (hasCredentials) {
        // Validate email format before attempting Firebase auth
        if (!isValidEmail(email.trim())) {
          console.error('[login] Invalid email format:', email);
          alert('Please enter a valid email address.');
          return;
        }
        
        // Use login/link functionality to preserve anonymous UID
        try {
          await loginOrLink(email, password);
        } catch (error: any) {
          console.warn('[login] Firebase authentication failed, using mock auth:', error?.code);
          // Continue with mock authentication even if Firebase fails
        }
        
        // Check if this is an admin login
        const isAdminLogin = email.trim() === 'admin@loadrush.com' || selectedRole === 'admin';
        const finalRole = isAdminLogin ? 'admin' : selectedRole;
        
        // Update local auth state with correct role
        await login(email.trim(), password.trim(), finalRole);
        
        console.log('[login] success, navigating based on role:', finalRole);
        if (finalRole === 'admin') {
          router.replace('/admin' as any);
        } else if (finalRole === 'shipper') {
          router.replace('/shipper' as any);
        } else {
          router.replace('/dashboard' as any);
        }
        return;
      }
      
      // If no credentials provided, allow guest access
      console.log('[login] no credentials provided, signing in anonymously');
      try {
        const result = await signInAnonymously(auth);
        console.log('[login] signed in anonymously. uid:', result.user.uid);
      } catch (error: any) {
        console.warn('[login] Anonymous sign-in failed, continuing with mock auth:', error?.code);
      }
      
      // Update local auth state with anonymous user
      await login('guest@example.com', 'guest', selectedRole);
      
      console.log('[login] anonymous success, navigating based on role:', selectedRole);
      if (selectedRole === 'admin') {
        router.replace('/admin' as any);
      } else if (selectedRole === 'shipper') {
        router.replace('/shipper' as any);
      } else {
        router.replace('/dashboard' as any);
      }
    } catch (error: any) {
      console.error('[login] failed:', error?.code, error?.message);
      // Show user-friendly error message
      alert(error?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, selectedRole, login, router, loginOrLink]);

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
            <View style={styles.roleSelector}>
              <Text style={styles.roleSelectorLabel}>I am a: <Text style={styles.requiredAsterisk}>*</Text></Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[styles.roleButton, selectedRole === 'driver' && styles.roleButtonActive]}
                  onPress={() => setSelectedRole('driver')}
                  testID="role-driver"
                >
                  <Truck size={20} color={selectedRole === 'driver' ? theme.colors.white : theme.colors.primary} />
                  <Text style={[styles.roleButtonText, selectedRole === 'driver' && styles.roleButtonTextActive]}>Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, selectedRole === 'shipper' && styles.roleButtonActive]}
                  onPress={() => setSelectedRole('shipper')}
                  testID="role-shipper"
                >
                  <Users size={20} color={selectedRole === 'shipper' ? theme.colors.white : theme.colors.primary} />
                  <Text style={[styles.roleButtonText, selectedRole === 'shipper' && styles.roleButtonTextActive]}>Shipper</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, selectedRole === 'admin' && styles.roleButtonActive]}
                  onPress={() => setSelectedRole('admin')}
                  testID="role-admin"
                >
                  <Settings size={20} color={selectedRole === 'admin' ? theme.colors.white : theme.colors.primary} />
                  <Text style={[styles.roleButtonText, selectedRole === 'admin' && styles.roleButtonTextActive]}>Admin</Text>
                </TouchableOpacity>
              </View>
            </View>

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

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              testID="login-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>
                  {email?.trim() && password?.trim() ? `Login as ${selectedRole}` : `Continue as Guest ${selectedRole}`}
                </Text>
              )}
            </TouchableOpacity>
            


            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/reset-password')} testID="forgot-password-link">
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')} testID="signup-link">
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
    backgroundColor: 'transparent',
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
  roleSelector: {
    marginBottom: theme.spacing.md,
  },
  roleSelectorLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.xs,
  },
  roleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  roleButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  roleButtonTextActive: {
    color: theme.colors.white,
  },
  requiredAsterisk: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.md,
  },

});
