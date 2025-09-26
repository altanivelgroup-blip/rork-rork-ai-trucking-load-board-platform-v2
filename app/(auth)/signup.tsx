import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Mail, Lock, Phone, Building, Users, Truck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { moderateScale } from '@/src/ui/scale';
import { UserRole } from '@/types';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Move dimensions inside component to avoid module-scope issues
const getIsTablet = () => {
  const { width } = Dimensions.get('window');
  return width >= 768;
};

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/26wbvri4j4j5lt84ceaac';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isValidEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue.trim());
  };

  const handleSignUp = useCallback(async () => {
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
      
      if (password.length < 6) {
        setErrorText('Password must be at least 6 characters.');
        return;
      }
      
      console.log('[Sign-Up Rewritten] Creating account for:', email.trim(), 'as', selectedRole);
      
      // Step 2: Create user with Firebase Auth
      const { auth, db } = getFirebase();
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const firebaseUser = userCredential.user;
      
      console.log('[Sign-Up Rewritten] Firebase user created:', firebaseUser.uid);
      
      // Step 3: Save basic profile in Firestore 'users' collection (UID as doc ID)
      const defaultName = name.trim() || email.split('@')[0];
      const profileData = {
        fullName: defaultName,
        email: email.trim(),
        phone: phone.trim() || '',
        company: company.trim() || ''
      };
      
      const userDoc = {
        role: selectedRole,
        profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, userDoc, { merge: true });
      
      console.log('[Sign-Up Rewritten] Profile saved to Firestore for role:', selectedRole);
      
      // Step 4: Redirect based on role
      console.log('[Sign-Up Rewritten] Redirecting to dashboard for role:', selectedRole);
      
      if (selectedRole === 'admin') {
        router.replace('/(tabs)/admin');
      } else if (selectedRole === 'shipper') {
        router.replace('/(tabs)/shipper');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      
      console.log(`Sign-Up Rewritten: Success for ${firebaseUser.uid}`);
      
    } catch (error: any) {
      console.error('[Sign-Up Rewritten] Account creation failed:', error?.code, error?.message);
      
      // Handle specific Firebase auth errors
      if (error?.code === 'auth/email-already-in-use') {
        setErrorText('An account with this email already exists. Please try logging in instead.');
      } else if (error?.code === 'auth/weak-password') {
        setErrorText('Password is too weak. Please choose a stronger password.');
      } else if (error?.code === 'auth/invalid-email') {
        setErrorText('Please enter a valid email address.');
      } else if (error?.code === 'auth/network-request-failed') {
        setErrorText('Network error. Please check your connection and try again.');
      } else if (error?.code === 'auth/too-many-requests') {
        setErrorText('Too many attempts. Please wait a moment and try again.');
      } else {
        setErrorText(error?.message || 'Account creation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, name, phone, company, selectedRole, router]);

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
            <View style={styles.roleSelector}>
              <Text style={styles.roleSelectorLabel}>I am a:</Text>
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
                testID="signup-email"
              />
            </View>
            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Password (min 6 characters)" 
                placeholderTextColor={theme.colors.gray} 
                value={password} 
                onChangeText={(t: string) => { setPassword(t); setErrorText(null); }}
                secureTextEntry 
                autoComplete="new-password" 
                testID="signup-password"
              />
            </View>
            <View style={styles.inputContainer}>
              <UserPlus size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Full Name (optional)" 
                placeholderTextColor={theme.colors.gray} 
                value={name} 
                onChangeText={setName} 
                testID="signup-name"
              />
            </View>
            <View style={styles.inputContainer}>
              <Phone size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Phone (optional)" 
                placeholderTextColor={theme.colors.gray} 
                value={phone} 
                onChangeText={setPhone} 
                keyboardType="phone-pad" 
                testID="signup-phone"
              />
            </View>
            <View style={styles.inputContainer}>
              <Building size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder={selectedRole === 'shipper' ? 'Company Name' : 'Company (optional)'} 
                placeholderTextColor={theme.colors.gray} 
                value={company} 
                onChangeText={setCompany} 
                testID="signup-company"
              />
            </View>
            
            {!!errorText && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} testID="signup-error">{errorText}</Text>
                {errorText.includes('already exists') && (
                  <TouchableOpacity 
                    onPress={() => router.replace('/login')}
                    style={styles.loginRedirectButton}
                    testID="redirect-to-login"
                  >
                    <Text style={styles.loginRedirectText}>Go to Login</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity 
              style={[styles.cta, isLoading && styles.ctaDisabled]} 
              onPress={handleSignUp} 
              disabled={isLoading || !(email?.trim() && password?.trim())}
              testID="signup-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.ctaText}>Create {selectedRole} Account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.secondary}>
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
    width: getIsTablet() ? 160 : moderateScale(100),
    height: getIsTablet() ? 160 : moderateScale(100),
    borderRadius: moderateScale(24),
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  logoImage: {
    width: getIsTablet() ? 160 : moderateScale(100),
    height: getIsTablet() ? 160 : moderateScale(100),
    borderRadius: moderateScale(24),
  },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  form: { marginTop: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.dark },
  cta: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.sm },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '700' },
  errorContainer: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  loginRedirectButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  loginRedirectText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  secondary: { alignItems: 'center', marginTop: theme.spacing.md },
  secondaryText: { color: theme.colors.primary },
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
});
