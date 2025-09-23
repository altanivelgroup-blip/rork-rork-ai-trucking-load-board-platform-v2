import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function EmergencyLoginScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { auth, db } = getFirebase();

  const handleRoleLogin = useCallback(async (role: 'driver' | 'shipper' | 'admin') => {
    console.log('[EmergencyLogin] handleRoleLogin start', role);
    setIsLoading(true);
    setError(null);

    let email: string = '';
    let password: string = '';
    let expectedRoute: string = '';

    switch (role) {
      case 'driver':
        email = 'driver@test1.com';
        password = 'RealUnlock123';
        expectedRoute = '/(tabs)/dashboard';
        break;
      case 'shipper':
        email = 'shipper@test1.com';
        password = 'RealShipper123';
        expectedRoute = '/(tabs)/shipper';
        break;
      case 'admin':
        email = 'admin@test1.com';
        password = 'RealBoss123';
        expectedRoute = '/(tabs)/admin';
        break;
      default:
        setError('Unknown role');
        setIsLoading(false);
        return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user?.uid ?? '';
      console.log('[EmergencyLogin] signed in', { uid, role });

      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        console.warn('[EmergencyLogin] user doc missing');
        setError('No user profile found.');
        return;
      }
      const data = snap.data() as { role?: string } | undefined;
      const docRole = (data?.role ?? '').toString().toLowerCase();
      if (docRole !== role) {
        console.warn('[EmergencyLogin] role mismatch', { expected: role, got: docRole });
        setError(`Role mismatch. Expected ${role}, got ${docRole || 'unknown'}.`);
        return;
      }

      console.log('[EmergencyLogin] navigating', expectedRoute);
      router.replace(expectedRoute as any);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Login failed';
      console.error('[EmergencyLogin] error', msg);
      setError(`${role.toUpperCase()} login failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [auth, db, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} testID="emergencyLoginTitle">Emergency Role Login</Text>
        <Text style={styles.subtitle} testID="emergencyLoginSubtitle">Choose your role</Text>

        <TouchableOpacity
          testID="driverLoginButton"
          accessibilityRole="button"
          accessibilityLabel="Driver Login"
          style={[styles.button, styles.driverButton]}
          onPress={() => handleRoleLogin('driver')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>DRIVER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="shipperLoginButton"
          accessibilityRole="button"
          accessibilityLabel="Shipper Login"
          style={[styles.button, styles.shipperButton]}
          onPress={() => handleRoleLogin('shipper')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>SHIPPER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="adminLoginButton"
          accessibilityRole="button"
          accessibilityLabel="Admin Login"
          style={[styles.button, styles.adminButton]}
          onPress={() => handleRoleLogin('admin')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>ADMIN</Text>
        </TouchableOpacity>

        {isLoading && (
          <ActivityIndicator testID="loginLoading" size="large" color="#2563eb" style={styles.loader} />
        )}
        {!!error && (
          <Text testID="loginError" style={styles.error}>{error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 24,
  },
  button: {
    width: '80%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  driverButton: {
    backgroundColor: '#2563eb',
  },
  shipperButton: {
    backgroundColor: '#16a34a',
  },
  adminButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: 16,
  },
  error: {
    marginTop: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
});