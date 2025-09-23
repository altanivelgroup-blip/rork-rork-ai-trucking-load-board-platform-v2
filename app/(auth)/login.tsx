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
import { Mail, Lock, Truck, Building, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { moderateScale } from '@/src/ui/scale';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

type UserRole = 'driver' | 'shipper' | 'admin';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleLogin = useCallback(async (role: UserRole) => {
    setIsLoading(true);
    setErrorText(null);

    try {
      // Set predefined credentials based on role
      let loginEmail: string;
      let loginPassword: string;
      let userId: string;

      switch (role) {
        case 'driver':
          loginEmail = 'driver@test1.com';
          loginPassword = 'RealUnlock123';
          userId = 'OK0pPByFYicnOu6Z0B7tzR17Qz';
          break;
        case 'shipper':
          loginEmail = 'shipper@test1.com';
          loginPassword = 'RealShipper123';
          userId = 'pu2bP7pzfuW39mgNDtO6im2ZQof';
          break;
        case 'admin':
          loginEmail = 'admin@test1.com';
          loginPassword = 'RealBoss123';
          userId = 'IFHGF8LVUTQY6mnBqw5rblU167';
          break;
        default:
          setErrorText('Invalid role selected');
          return;
      }

      console.log(`[Login] Authenticating as ${role}: ${loginEmail}`);

      // Firebase authentication
      const { auth, db } = getFirebase();
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const firebaseUser = userCredential.user;

      console.log(`[Login] Firebase Success: UID ${firebaseUser.uid}`);

      // Store emergency access data for immediate auth state
      const emergencyUserData = {
        id: firebaseUser.uid,
        email: loginEmail,
        role: role,
        name: loginEmail.split('@')[0].toUpperCase(),
        phone: '',
        membershipTier: role === 'admin' ? 'enterprise' : 'basic',
        createdAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('auth:emergency:user', JSON.stringify(emergencyUserData));
      console.log(`[Login] Emergency access stored for ${role}`);

      // Also ensure Firestore has the user data
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const profileData = {
          fullName: emergencyUserData.name,
          email: loginEmail,
          phone: '',
          company: role === 'shipper' ? 'Test Logistics' : ''
        };
        
        const userDoc = {
          role: role,
          profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(userRef, userDoc, { merge: true });
        console.log(`[Login] User profile saved to Firestore for ${role}`);
      } catch (firestoreError) {
        console.warn(`[Login] Firestore save failed (continuing anyway):`, firestoreError);
      }

      // Small delay to let auth state update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Route based on selected role with more explicit navigation
      console.log(`[Login] Navigating to ${role} dashboard`);
      
      // Force navigation with router.push first, then replace
      switch (role) {
        case 'driver':
          console.log('[Login] Pushing to driver dashboard');
          router.push('/(tabs)/dashboard');
          setTimeout(() => router.replace('/(tabs)/dashboard'), 100);
          break;
        case 'shipper':
          console.log('[Login] Pushing to shipper dashboard');
          router.push('/(tabs)/shipper');
          setTimeout(() => router.replace('/(tabs)/shipper'), 100);
          break;
        case 'admin':
          console.log('[Login] Pushing to admin dashboard');
          router.push('/(tabs)/admin');
          setTimeout(() => router.replace('/(tabs)/admin'), 100);
          break;
      }
    } catch (error: any) {
      console.error(`[Login] Error for ${role}:`, error.code, error.message);
      setErrorText(`${role} login failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleCustomLogin = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      if (!email?.trim() || !password?.trim()) {
        setErrorText("Email and password are required.");
        return;
      }

      const emailTrimmed = email.trim().toLowerCase();
      const passwordTrimmed = password.trim();

      console.log(`[Login] Custom login: ${emailTrimmed}`);

      // Firebase authentication
      const { auth, db } = getFirebase();
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
      const firebaseUser = userCredential.user;

      console.log(`[Login] Firebase Success: UID ${firebaseUser.uid}`);

      // Store emergency access data for immediate auth state
      const emergencyUserData = {
        id: firebaseUser.uid,
        email: emailTrimmed,
        role: 'driver', // Default role for custom login
        name: emailTrimmed.split('@')[0].toUpperCase(),
        phone: '',
        membershipTier: 'basic',
        createdAt: new Date().toISOString()
      };
      
      // Try to fetch role from Firestore
      let userRole = 'driver';
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          userRole = userData.role ? userData.role.toLowerCase() : 'driver';
          console.log(`[Login] Fetched role from Firestore: ${userRole}`);
          
          // Update emergency data with correct role
          emergencyUserData.role = userRole;
          emergencyUserData.membershipTier = userRole === 'admin' ? 'enterprise' : 'basic';
        } else {
          console.log(`[Login] No Firestore profile found, using default role: driver`);
        }
      } catch (firestoreError) {
        console.warn(`[Login] Firestore fetch failed, using default role:`, firestoreError);
      }
      
      await AsyncStorage.setItem('auth:emergency:user', JSON.stringify(emergencyUserData));
      console.log(`[Login] Emergency access stored for custom login with role: ${userRole}`);

      // Small delay to let auth state update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Route based on role with more explicit navigation
      console.log(`[Login] Navigating to ${userRole} dashboard`);
      
      // Force navigation with router.push first, then replace
      if (userRole === "driver") {
        console.log('[Login] Pushing to driver dashboard');
        router.push("/(tabs)/dashboard");
        setTimeout(() => router.replace("/(tabs)/dashboard"), 100);
      } else if (userRole === "shipper") {
        console.log('[Login] Pushing to shipper dashboard');
        router.push("/(tabs)/shipper");
        setTimeout(() => router.replace("/(tabs)/shipper"), 100);
      } else if (userRole === "admin") {
        console.log('[Login] Pushing to admin dashboard');
        router.push("/(tabs)/admin");
        setTimeout(() => router.replace("/(tabs)/admin"), 100);
      } else {
        console.log(`[Login] Unknown role, defaulting to driver`);
        router.push("/(tabs)/dashboard");
        setTimeout(() => router.replace("/(tabs)/dashboard"), 100);
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
            {/* Role Selection Buttons */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>Select Your Role</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[styles.roleButton, styles.driverButton]}
                  onPress={() => handleRoleLogin('driver')}
                  disabled={isLoading}
                  testID="driver-login-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.white} size="small" />
                  ) : (
                    <>
                      <Truck size={24} color={theme.colors.white} />
                      <Text style={styles.roleButtonText}>DRIVER</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, styles.shipperButton]}
                  onPress={() => handleRoleLogin('shipper')}
                  disabled={isLoading}
                  testID="shipper-login-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.white} size="small" />
                  ) : (
                    <>
                      <Building size={24} color={theme.colors.white} />
                      <Text style={styles.roleButtonText}>SHIPPER</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, styles.adminButton]}
                  onPress={() => handleRoleLogin('admin')}
                  disabled={isLoading}
                  testID="admin-login-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.white} size="small" />
                  ) : (
                    <>
                      <Shield size={24} color={theme.colors.white} />
                      <Text style={styles.roleButtonText}>ADMIN</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Custom Login Form */}
            <View style={styles.customLoginSection}>
              <Text style={styles.customLoginTitle}>Custom Login</Text>
              
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
                onPress={handleCustomLogin}
                disabled={isLoading || !(email?.trim() && password?.trim())}
                testID="custom-login-submit"
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {!!errorText && (
              <Text style={styles.errorText} testID="login-error">{errorText}</Text>
            )}

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
  roleSection: {
    marginBottom: theme.spacing.lg,
  },
  roleSectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    gap: theme.spacing.xs,
  },
  driverButton: {
    backgroundColor: '#2563eb', // Blue
  },
  shipperButton: {
    backgroundColor: '#16a34a', // Green
  },
  adminButton: {
    backgroundColor: '#dc2626', // Red
  },
  roleButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.lightGray,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  customLoginSection: {
    marginBottom: theme.spacing.md,
  },
  customLoginTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
});