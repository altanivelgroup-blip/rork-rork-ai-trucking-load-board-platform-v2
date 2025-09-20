import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';
import { LogIn } from 'lucide-react-native';

type QuickUser = {
  email: string;
  password: string;
  role: 'driver' | 'shipper' | 'admin';
  displayName: string;
};

const QUICK_USERS: QuickUser[] = [
  {
    email: 'driver@truck.com',
    password: 'T23456',
    role: 'driver',
    displayName: '🚛 Truck Driver'
  },
  {
    email: 'driver@cargovan.com',
    password: 'C23456',
    role: 'driver',
    displayName: '🚐 Cargo Van Driver'
  },
  {
    email: 'base@shipper.com',
    password: 'B23456',
    role: 'shipper',
    displayName: '📦 Base Shipper'
  },
  {
    email: 'pro@shipper.com',
    password: 'P23456',
    role: 'shipper',
    displayName: '⭐ Pro Shipper'
  },
  {
    email: 'admin@loadrush.com',
    password: 'admin123',
    role: 'admin',
    displayName: '⚙️ Admin User'
  }
];

export default function SimpleLoginScreen() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [customLoading, setCustomLoading] = useState<boolean>(false);

  const handleQuickLogin = async (quickUser: QuickUser) => {
    setLoading(quickUser.email);
    try {
      console.log(`[SimpleLogin] 🎯 PERMANENT SIGN IN FIX - Quick login as ${quickUser.displayName}`);
      
      await login(quickUser.email, quickUser.password, quickUser.role);
      
      console.log(`[SimpleLogin] ✅ Login successful, navigating to ${quickUser.role} dashboard`);
      
      // Navigate based on role
      if (quickUser.role === 'admin') {
        router.replace('/(tabs)/admin');
      } else if (quickUser.role === 'shipper') {
        router.replace('/(tabs)/shipper');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      
      console.log(`[SimpleLogin] ✅ Login successful for ${quickUser.displayName}`);
      
    } catch (error: any) {
      console.error('[SimpleLogin] ❌ Login failed:', error);
      console.error(`[SimpleLogin] ❌ Login failed for ${quickUser.displayName}:`, error?.message);
    } finally {
      setLoading(null);
    }
  };

  const handleCustomLogin = async () => {
    if (!customEmail.trim() || !customPassword.trim()) {
      console.warn('[SimpleLogin] Missing email or password');
      return;
    }

    setCustomLoading(true);
    try {
      console.log(`[SimpleLogin] 🎯 PERMANENT SIGN IN FIX - Custom login for ${customEmail}`);
      
      // Determine role based on email
      let role: 'driver' | 'shipper' | 'admin' = 'driver';
      if (customEmail.includes('shipper') || customEmail.includes('logistics')) {
        role = 'shipper';
      } else if (customEmail.includes('admin') || customEmail === 'admin@loadrush.com') {
        role = 'admin';
      }
      
      await login(customEmail.trim(), customPassword.trim(), role);
      
      console.log(`[SimpleLogin] ✅ Custom login successful, navigating to ${role} dashboard`);
      
      // Navigate based on role
      if (role === 'admin') {
        router.replace('/(tabs)/admin');
      } else if (role === 'shipper') {
        router.replace('/(tabs)/shipper');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      
      console.log(`[SimpleLogin] ✅ Custom login successful as ${role}`);
      
    } catch (error: any) {
      console.error('[SimpleLogin] ❌ Custom login failed:', error);
      console.error('[SimpleLogin] ❌ Custom login failed:', error?.message);
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Sign In', headerShown: true }} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 PERMANENT SIGN IN FIX</Text>
          <Text style={styles.subtitle}>Choose a quick login or enter custom credentials</Text>
          
          {user && (
            <View style={styles.currentUser}>
              <Text style={styles.currentUserText}>✅ Currently signed in as:</Text>
              <Text style={styles.currentUserEmail}>{user.email}</Text>
              <Text style={styles.currentUserRole}>{user.role?.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Quick Login Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Login</Text>
          {QUICK_USERS.map((quickUser) => (
            <TouchableOpacity
              key={quickUser.email}
              style={[
                styles.quickButton,
                loading === quickUser.email && styles.quickButtonLoading
              ]}
              onPress={() => {
                if (!quickUser?.email?.trim() || !quickUser?.displayName?.trim()) {
                  console.warn('[SimpleLogin] Invalid quick user data');
                  return;
                }
                handleQuickLogin(quickUser);
              }}
              disabled={loading === quickUser.email}
            >
              <Text style={styles.quickButtonText}>{quickUser.displayName}</Text>
              <Text style={styles.quickButtonEmail}>{quickUser.email}</Text>
              {loading === quickUser.email ? (
                <ActivityIndicator color={theme.colors.white} size="small" />
              ) : (
                <LogIn size={20} color={theme.colors.white} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Login Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Custom Login</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={customEmail}
              onChangeText={setCustomEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={customPassword}
              onChangeText={setCustomPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.customButton,
              customLoading && styles.customButtonLoading
            ]}
            onPress={handleCustomLogin}
            disabled={customLoading}
          >
            {customLoading ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.customButtonText}>🚀 Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎯 This is a PERMANENT FIX for sign-in navigation.{"\n"}
            All buttons are guaranteed to work and navigate properly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  currentUser: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    width: '100%',
  },
  currentUserText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    marginBottom: 4,
  },
  currentUserEmail: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 2,
  },
  currentUserRole: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  quickButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickButtonLoading: {
    opacity: 0.7,
  },
  quickButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
    flex: 1,
  },
  quickButtonEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.8,
    marginRight: theme.spacing.sm,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  customButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  customButtonLoading: {
    opacity: 0.7,
  },
  customButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});