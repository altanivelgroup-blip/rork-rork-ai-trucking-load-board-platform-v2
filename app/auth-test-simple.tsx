import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function AuthTestSimple() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();
  const authState = useAuth();

  const testLogin = async (role: 'driver' | 'shipper' | 'admin') => {
    setIsLoading(role);
    setResult(null);

    try {
      console.log(`[AuthTest] Testing ${role} login...`);
      
      const credentials = {
        driver: { email: 'driver@test1.com', password: 'RealUnlock123-' },
        shipper: { email: 'shipper@test1.com', password: 'RealShipper123' },
        admin: { email: 'admin@test1.com', password: 'RealBoss123' }
      };

      // Import Firebase auth functions
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('@/utils/firebase');
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials[role].email,
        credentials[role].password
      );
      
      console.log(`[AuthTest] Firebase authentication successful for ${userCredential.user.email}`);
      
      // Store emergency access data
      const emergencyUserData = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        role: role,
        name: userCredential.user.email?.split('@')[0]?.toUpperCase() || 'USER',
        phone: '',
        membershipTier: role === 'admin' ? 'enterprise' : 'basic',
        createdAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('auth:emergency:user', JSON.stringify(emergencyUserData));
      console.log(`[AuthTest] Emergency access data stored for ${role}`);
      
      setResult(`✅ ${role.toUpperCase()} login successful! User: ${userCredential.user.email}`);
      
      // Navigate after a short delay to show success
      setTimeout(() => {
        if (role === 'admin') {
          router.replace('/(tabs)/admin');
        } else if (role === 'shipper') {
          router.replace('/(tabs)/shipper');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      }, 2000);

    } catch (error: any) {
      console.error(`[AuthTest] ${role} login failed:`, error);
      setResult(`❌ ${role.toUpperCase()} login failed: ${error.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Authentication Test</Text>
        <Text style={styles.subtitle}>Test the three role-based logins</Text>
        
        <Text style={styles.authStatus}>
          Auth State: {authState?.isLoading ? 'Loading...' : authState?.user ? `Logged in as ${authState.user.role}` : 'Not logged in'}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.driverButton]}
            onPress={() => testLogin('driver')}
            disabled={!!isLoading}
          >
            {isLoading === 'driver' ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Test Driver Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shipperButton]}
            onPress={() => testLogin('shipper')}
            disabled={!!isLoading}
          >
            {isLoading === 'shipper' ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Test Shipper Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.adminButton]}
            onPress={() => testLogin('admin')}
            disabled={!!isLoading}
          >
            {isLoading === 'admin' ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Test Admin Login</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  authStatus: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  driverButton: {
    backgroundColor: theme.colors.primary,
  },
  shipperButton: {
    backgroundColor: theme.colors.secondary,
  },
  adminButton: {
    backgroundColor: theme.colors.warning,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  resultContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
    padding: theme.spacing.md,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});