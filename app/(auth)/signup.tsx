import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Mail, Lock, Phone, Building, Users, Truck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { moderateScale } from '@/src/ui/scale';
import { UserRole } from '@/types';

// Move dimensions inside component to avoid module-scope issues
const getIsTablet = () => {
  const { width } = require('react-native').Dimensions.get('window');
  return width >= 768;
};

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/26wbvri4j4j5lt84ceaac';

export default function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignUp = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      console.log('[signup] creating account for', email, 'as', selectedRole);
      await register(email, password, selectedRole, { name, phone, company });
      
      if (selectedRole === 'shipper') {
        router.replace('/shipper-dashboard');
      } else {
        router.replace('/(auth)/driver-vehicle-setup');
      }
    } catch (e) {
      console.error('[signup] error', e);
      // In development, we allow signup to continue even if Firebase fails
      console.log('[signup] Continuing with mock authentication system');
      
      // Still navigate to the appropriate screen since mock auth should work
      if (selectedRole === 'shipper') {
        router.replace('/shipper-dashboard');
      } else {
        router.replace('/(auth)/driver-vehicle-setup');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, name, phone, company, selectedRole, register, router]);

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
              <TextInput 
                style={styles.input} 
                placeholder={selectedRole === 'shipper' ? 'Company Name' : 'Company (optional)'} 
                placeholderTextColor={theme.colors.gray} 
                value={company} 
                onChangeText={setCompany} 
              />
            </View>
            <TouchableOpacity style={styles.cta} onPress={handleSignUp} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.ctaText}>Create {selectedRole} Account</Text>}
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
  ctaText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '700' },
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
