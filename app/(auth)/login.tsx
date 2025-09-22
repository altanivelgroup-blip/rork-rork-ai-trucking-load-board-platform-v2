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
  const router = useRouter();

  const isValidEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue.trim());
  };

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    
    try {
      // Step 1: Input validation
      if (!email?.trim() || !password?.trim()) {
        setErrorText('Email and password are required.');
        return;
      }
      
      if (!isValidEmail(email.trim())) {
        setErrorText('Please enter a valid email address.');
        return;
      }
      
      console.log('[Sign-In Rewritten] Authenticating user:', email.trim());
      
      // Step 2: Authenticate with Firebase
      const { auth, db } = getFirebase();
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const firebaseUser = userCredential.user;
      
      console.log('[Sign-In Rewritten] Firebase authentication successful:', firebaseUser.uid);
      
      // Step 3: Load or create profile in Firestore 'users' collection
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      let userRole: UserRole = selectedRole;
      let profileData: any;
      
      if (userSnap.exists()) {
        // Load existing profile
        const existingData = userSnap.data();
        userRole = existingData.role || selectedRole;
        profileData = existingData.profileData || {};
        console.log('[Sign-In Rewritten] Loaded existing profile for role:', userRole);
      } else {
        // Create new profile document with UID as doc ID
        const defaultName = email.split('@')[0];
        profileData = {
          fullName: defaultName,
          email: email.trim(),
          phone: '',
          company: ''
        };
        
        const newUserDoc = {
          role: selectedRole,
          profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(userRef, newUserDoc, { merge: true });
        userRole = selectedRole;
        console.log('[Sign-In Rewritten] Created new profile for role:', userRole);
      }
      
      // Step 4: Redirect based on role
      console.log('[Sign-In Rewritten] Redirecting to dashboard for role:', userRole);
      
      if (userRole === 'admin') {
        router.replace('/(tabs)/admin');
      } else if (userRole === 'shipper') {
        router.replace('/(tabs)/shipper');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      
      console.log(`Sign-In Rewritten: Success for ${firebaseUser.uid}`);
      
    } catch (error: any) {
      console.error('[Sign-In Rewritten] Authentication failed:', error?.code, error?.message);
      
      // Handle specific Firebase auth errors
      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        setErrorText('Invalid credentials');
      } else if (error?.code === 'auth/too-many-requests') {
        setErrorText('Too many failed attempts. Please try again later.');
      } else {
        setErrorText(error?.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, selectedRole, router]);

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
                onChangeText={(t: string) => { setEmail(t); setErrorText(null); }}
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
                onChangeText={(t: string) => { setPassword(t); setErrorText(null); }}
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
          
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => router.push('/test-signin-debug')}
          >
            <Text style={styles.debugButtonText}>🔧 Debug Sign-In Issues</Text>
          </TouchableOpacity>
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
  debugButton: {
    backgroundColor: '#e74c3c',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  debugButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
