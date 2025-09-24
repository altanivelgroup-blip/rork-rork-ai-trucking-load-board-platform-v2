import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ShipperLoginScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { auth, db } = getFirebase();

  const handleLogin = useCallback(async () => {
    console.log('[ShipperLogin] start');
    setIsLoading(true);
    setError(null);

    const email: string = 'shipper@test1.com';
    const password: string = 'RealShipper123';
    const expectedRoute: string = '/(tabs)/shipper';

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user?.uid ?? '';
      console.log('[ShipperLogin] signed in', { uid });

      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.warn('[ShipperLogin] user doc missing');
        setError('No user profile found.');
        return;
      }
      const data = snap.data() as { role?: string } | undefined;
      const docRole = (data?.role ?? '').toString().toLowerCase();
      if (docRole !== 'shipper') {
        console.warn('[ShipperLogin] role mismatch', { expected: 'shipper', got: docRole });
        setError(`Role mismatch. Expected shipper, got ${docRole || 'unknown'}.`);
        return;
      }

      console.log('[ShipperLogin] navigating', expectedRoute);
      router.replace(expectedRoute as any);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Login failed';
      console.error('[ShipperLogin] error', msg);
      setError(`SHIPPER login failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [auth, db, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} testID="shipperLoginTitle">Shipper Login</Text>
        <Text style={styles.subtitle} testID="shipperLoginSubtitle">Quick sign-in for testing</Text>

        <TouchableOpacity
          testID="shipperLoginButton"
          accessibilityRole="button"
          accessibilityLabel="Shipper Login"
          style={[styles.button, styles.shipperButton]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>SIGN IN AS SHIPPER</Text>
        </TouchableOpacity>

        {isLoading && (
          <ActivityIndicator testID="shipperLoginLoading" size="large" color="#16a34a" style={styles.loader} />
        )}
        {!!error && (
          <Text testID="shipperLoginError" style={styles.error}>{error}</Text>
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
  shipperButton: {
    backgroundColor: '#16a34a',
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