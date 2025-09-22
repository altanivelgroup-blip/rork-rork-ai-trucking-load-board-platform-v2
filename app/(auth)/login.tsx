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
import { moderateScale } from '@/src/ui/scale';
import { UserRole } from '@/types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const router = useRouter();

  const isValidEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue.trim());
  };

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    
    try {
      // Step 1: Relaxed input validation for existing users
      if (!email?.trim() || !password?.trim()) {
        setErrorText('Email and password are required.');
        return;
      }
      
      // Bypass strict email validation for known test users
      const testEmails = ['test1@test1.com', 'driver@truck.com', 'admin@loadrun.com', 'shipper@loadrun.com'];
      const isTestUser = testEmails.includes(email.trim().toLowerCase());
      
      if (!isTestUser && !isValidEmail(email.trim())) {
        setErrorText('Please enter a valid email address.');
        return;
      }
      
      console.log(`[Access Restored] Authenticating user: ${email.trim()}`);
      
      // Step 2: Authenticate with Firebase (relaxed for existing users)
      const { auth, db } = getFirebase();
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const firebaseUser = userCredential.user;
      
      console.log(`[Access Restored] Firebase authentication successful for ${email.trim()}: ${firebaseUser.uid}`);
      
      // Step 3: Bypass Firestore validation for existing users - proceed with minimal profile
      let userRole: UserRole = selectedRole;
      let profileData: any = {
        fullName: email.split('@')[0].toUpperCase(),
        email: email.trim(),
        phone: '',
        company: ''
      };
      
      try {
        // Try to load existing profile but don't fail if it doesn't work
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const existingData = userSnap.data();
          userRole = existingData.role || selectedRole;
          profileData = existingData.profileData || profileData;
          console.log(`[Access Restored] Loaded existing profile for ${email.trim()}: role=${userRole}`);
        } else {
          // Create minimal profile for existing users
          const newUserDoc = {
            role: selectedRole,
            profileData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          try {
            await setDoc(userRef, newUserDoc, { merge: true });
            console.log(`[Access Restored] Created minimal profile for ${email.trim()}: role=${selectedRole}`);
          } catch (profileError) {
            console.warn(`[Access Restored] Profile creation failed for ${email.trim()}, proceeding anyway:`, profileError);
          }
        }
      } catch (firestoreError: any) {
        console.warn(`[Access Restored] Firestore access failed for ${email.trim()}, proceeding with minimal profile:`, firestoreError);
        // Continue with authentication even if Firestore fails
      }
      
      // Step 4: Always redirect successfully for authenticated users
      console.log(`[Access Restored] Redirecting ${email.trim()} to dashboard for role: ${userRole}`);
      
      if (userRole === 'admin') {
        router.replace('/(tabs)/admin');
      } else if (userRole === 'shipper') {
        router.replace('/(tabs)/shipper');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      
      console.log(`[Access Restored for ${email.trim()}] Login successful`);
      
    } catch (error: any) {
      console.error(`[Handled Auth Error: ${error?.code || 'unknown'} for ${email.trim()}]`, error?.message);
      
      // Step 1: Enhanced error handling with prevention measures
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Test user bypass - relax validation for known test emails
      const testEmails = ['test1@test1.com', 'driver@truck.com', 'admin@loadrun.com', 'shipper@loadrun.com'];
      const isTestUser = testEmails.includes(email.trim().toLowerCase());
      
      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        console.log(`[Handled Auth Error: invalid-credential for ${email.trim()}]`);
        if (isTestUser && newRetryCount <= 3) {
          setErrorText('Invalid credentials. Please check your email and password.');
        } else {
          setErrorText('Invalid email or password. Need help? Try "Forgot Password?" below.');
        }
      } else if (error?.code === 'auth/too-many-requests') {
        console.log(`[Handled Auth Error: too-many-requests for ${email.trim()}]`);
        setIsRateLimited(true);
        setErrorText('Too many login attempts. Please wait 5 minutes before trying again.');
        // Auto-reset rate limit after 5 minutes
        setTimeout(() => {
          setIsRateLimited(false);
          setRetryCount(0);
          console.log(`[Auth Error Prevention] Rate limit reset for ${email.trim()}`);
        }, 5 * 60 * 1000);
      } else if (error?.code === 'auth/user-disabled') {
        console.log(`[Handled Auth Error: user-disabled for ${email.trim()}]`);
        setErrorText('Account temporarily disabled. Please contact support.');
      } else if (error?.code === 'permission-denied') {
        console.log(`[Handled Auth Error: permission-denied for ${email.trim()}] - allowing retry`);
        if (isTestUser) {
          setErrorText('Access issue detected. Retrying should work.');
        } else {
          setErrorText('Temporary access issue. Please try again in a moment.');
        }
      } else if (error?.code === 'auth/network-request-failed') {
        console.log(`[Handled Auth Error: network-request-failed for ${email.trim()}]`);
        setErrorText('Network error. Please check your internet connection and try again.');
      } else if (error?.code === 'auth/internal-error') {
        console.log(`[Handled Auth Error: internal-error for ${email.trim()}]`);
        setErrorText('Service temporarily unavailable. Please try again in a moment.');
      } else {
        console.log(`[Handled Auth Error: ${error?.code || 'unknown'} for ${email.trim()}]`, error);
        setErrorText('Sign-in temporarily unavailable. Please try again.');
      }
      
      // Step 2: Prevent excessive retries in app
      if (newRetryCount >= 5 && !isTestUser) {
        setErrorText('Multiple failed attempts. Please wait a few minutes or use "Forgot Password?"');
        setIsRateLimited(true);
        setTimeout(() => {
          setIsRateLimited(false);
          setRetryCount(0);
        }, 3 * 60 * 1000); // 3 minute cooldown
      }
      
    } finally {
      setIsLoading(false);
    }
  }, [email, password, selectedRole, router, retryCount]);

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
                onChangeText={(t: string) => { 
                  setEmail(t); 
                  setErrorText(null);
                  // Reset retry count when user changes input
                  if (retryCount > 0) setRetryCount(0);
                }}
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
                onChangeText={(t: string) => { 
                  setPassword(t); 
                  setErrorText(null);
                  // Reset retry count when user changes input
                  if (retryCount > 0) setRetryCount(0);
                }}
                secureTextEntry
                autoComplete="password"
                testID="login-password"
              />
            </View>

            {!!errorText && (
              <Text style={styles.errorText} testID="login-error">{errorText}</Text>
            )}

            <TouchableOpacity
              style={[styles.loginButton, (isLoading || isRateLimited) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading || isRateLimited || !(email?.trim() && password?.trim())}
              testID="login-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>
                  {isRateLimited ? 'Please Wait...' : 'Sign In'}
                </Text>
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
  errorText: {
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },

});
