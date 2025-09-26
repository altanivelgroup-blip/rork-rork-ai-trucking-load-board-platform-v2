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
import { Mail, Lock, Truck, User, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { moderateScale } from '@/src/ui/scale';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '@/types';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
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

      const emailTrimmed = email.trim().toLowerCase();
      const passwordTrimmed = password.trim();

      console.log(`[Login] Attempting login for ${emailTrimmed} as ${selectedRole}`);
      
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
      const firebaseUser = userCredential.user;

      console.log(`[Login] Firebase Success: UID ${firebaseUser.uid}`);

      // Store emergency access data with selected role
      const emergencyUserData = {
        id: firebaseUser.uid,
        email: emailTrimmed,
        role: selectedRole,
        name: emailTrimmed.split('@')[0].toUpperCase(),
        phone: '',
        membershipTier: selectedRole === 'admin' ? 'enterprise' : 'basic',
        createdAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('auth:emergency:user', JSON.stringify(emergencyUserData));
      console.log(`[Login] Emergency access stored for ${selectedRole}`);

      // Check if user exists in Firestore, if not create profile
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Create new user profile
          const profileData = {
            fullName: emergencyUserData.name,
            email: emailTrimmed,
            phone: '',
            company: selectedRole === 'shipper' ? 'My Company' : ''
          };
          
          const userDoc = {
            role: selectedRole,
            profileData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await setDoc(userRef, userDoc, { merge: true });
          console.log(`[Login] New user profile created for ${selectedRole}`);
        } else {
          console.log(`[Login] Existing user profile found`);
        }
      } catch (firestoreError) {
        console.warn(`[Login] Firestore operation failed (continuing anyway):`, firestoreError);
      }

      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Route based on selected role
      console.log(`[Login] Navigating to ${selectedRole} dashboard`);
      
      if (selectedRole === 'driver') {
        console.log('[Login] Routing to driver dashboard');
        router.replace('/(tabs)/dashboard');
      } else if (selectedRole === 'shipper') {
        console.log('[Login] Routing to shipper dashboard');
        router.replace('/(tabs)/shipper');
      } else if (selectedRole === 'admin') {
        console.log('[Login] Routing to admin dashboard');
        router.replace('/(tabs)/admin');
      }
      
    } catch (error: any) {
      console.error("[Login] Error:", error.code, error.message);
      setErrorText(`Login failed: ${error.message}. Check credentials.`);
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
              onPress={() => router.push('/auth-debug')}
              onLongPress={() => router.push('/dev-bulk-tools')}
              delayLongPress={500}
              style={styles.logoContainer}
            >
              <Image
                source={{ uri: AUTH_ICON_URL }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.title}>LoadRun</Text>
            <Text style={styles.subtitle}>AI Load Board for Car Haulers</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.roleSelectionTitle}>I am a: <Text style={styles.required}>*</Text></Text>
            
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'driver' && styles.roleButtonSelected]}
                onPress={() => setSelectedRole('driver')}
              >
                <Truck size={20} color={selectedRole === 'driver' ? theme.colors.white : theme.colors.primary} />
                <Text style={[styles.roleButtonText, selectedRole === 'driver' && styles.roleButtonTextSelected]}>Driver</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'shipper' && styles.roleButtonSelected]}
                onPress={() => setSelectedRole('shipper')}
              >
                <User size={20} color={selectedRole === 'shipper' ? theme.colors.white : theme.colors.primary} />
                <Text style={[styles.roleButtonText, selectedRole === 'shipper' && styles.roleButtonTextSelected]}>Shipper</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'admin' && styles.roleButtonSelected]}
                onPress={() => setSelectedRole('admin')}
              >
                <Settings size={20} color={selectedRole === 'admin' ? theme.colors.white : theme.colors.primary} />
                <Text style={[styles.roleButtonText, selectedRole === 'admin' && styles.roleButtonTextSelected]}>Admin</Text>
              </TouchableOpacity>
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
              />
            </View>

            {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

            <TouchableOpacity
              style={[styles.loginButton, styles.primaryButton, isLoading && styles.disabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, styles.secondaryButton, isLoading && styles.disabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/(auth)/reset-password')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
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
  roleSelectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  required: {
    color: theme.colors.danger,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
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
  roleButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  roleButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  roleButtonTextSelected: {
    color: theme.colors.white,
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
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: '#FF8C00',
  },
  disabled: {
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
