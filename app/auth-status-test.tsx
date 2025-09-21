import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { RefreshCw, User, Shield, AlertCircle, CheckCircle } from 'lucide-react-native';

export default function AuthStatusTestScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string, details?: any) => {
    const result = {
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    console.log(`[AuthTest] ${test}: ${status} - ${message}`, details);
    setTestResults(prev => [...prev, result]);
  };

  const runAuthTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Check useAuth hook
      addResult('useAuth Hook', 'success', `User: ${auth.user?.email || 'None'}, Role: ${auth.user?.role || 'None'}`, {
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        hasSignedInThisSession: auth.hasSignedInThisSession,
        isFirebaseAuthenticated: auth.isFirebaseAuthenticated
      });

      // Test 2: Check Firebase initialization
      const firebase = getFirebase();
      if (firebase.auth && firebase.db) {
        addResult('Firebase Init', 'success', 'Firebase initialized successfully', {
          hasAuth: !!firebase.auth,
          hasDb: !!firebase.db,
          currentUser: firebase.auth.currentUser?.email || 'None'
        });
        setFirebaseStatus({
          initialized: true,
          currentUser: firebase.auth.currentUser,
          userEmail: firebase.auth.currentUser?.email,
          userId: firebase.auth.currentUser?.uid
        });
      } else {
        addResult('Firebase Init', 'error', 'Firebase not properly initialized', firebase);
      }

      // Test 3: Try to ensure Firebase auth
      try {
        const authSuccess = await ensureFirebaseAuth();
        addResult('Ensure Firebase Auth', authSuccess ? 'success' : 'warning', 
          authSuccess ? 'Firebase auth ensured' : 'Firebase auth failed', 
          { success: authSuccess }
        );
      } catch (error: any) {
        addResult('Ensure Firebase Auth', 'error', `Failed: ${error.message}`, error);
      }

      // Test 4: Try to sign in with driver@truck.com
      if (firebase.auth) {
        try {
          console.log('[AuthTest] Attempting to sign in with driver@truck.com...');
          const userCredential = await signInWithEmailAndPassword(firebase.auth, 'driver@truck.com', 'password123');
          addResult('Firebase Sign In', 'success', `Signed in as ${userCredential.user.email}`, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            emailVerified: userCredential.user.emailVerified
          });
        } catch (signInError: any) {
          addResult('Firebase Sign In', 'error', `Sign in failed: ${signInError.code}`, {
            code: signInError.code,
            message: signInError.message
          });
          
          // If user doesn't exist, try to create it
          if (signInError.code === 'auth/user-not-found') {
            try {
              console.log('[AuthTest] User not found, attempting to create...');
              const createResult = await createUserWithEmailAndPassword(firebase.auth, 'driver@truck.com', 'password123');
              addResult('Firebase Create User', 'success', `Created user ${createResult.user.email}`, {
                uid: createResult.user.uid,
                email: createResult.user.email
              });
            } catch (createError: any) {
              addResult('Firebase Create User', 'error', `Create failed: ${createError.code}`, createError);
            }
          }
        }
      }

      // Test 5: Check final auth state
      const finalFirebase = getFirebase();
      if (finalFirebase.auth?.currentUser) {
        addResult('Final Auth State', 'success', `Authenticated as ${finalFirebase.auth.currentUser.email}`, {
          uid: finalFirebase.auth.currentUser.uid,
          email: finalFirebase.auth.currentUser.email,
          emailVerified: finalFirebase.auth.currentUser.emailVerified
        });
      } else {
        addResult('Final Auth State', 'warning', 'No authenticated user', null);
      }

    } catch (error: any) {
      addResult('Test Suite', 'error', `Test suite failed: ${error.message}`, error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithAuth = async () => {
    try {
      await auth.login('driver@truck.com', 'password123', 'driver');
      addResult('Auth Hook Login', 'success', 'Signed in via auth hook', null);
    } catch (error: any) {
      addResult('Auth Hook Login', 'error', `Login failed: ${error.message}`, error);
    }
  };

  useEffect(() => {
    runAuthTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} color={theme.colors.success} />;
      case 'error': return <AlertCircle size={20} color={theme.colors.danger} />;
      case 'warning': return <AlertCircle size={20} color={theme.colors.warning} />;
      default: return <AlertCircle size={20} color={theme.colors.gray} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Auth Status Test' }} />
      
      <ScrollView style={styles.content}>
        {/* Current Auth Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Auth Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <User size={16} color={theme.colors.primary} />
              <Text style={styles.statusLabel}>User:</Text>
              <Text style={styles.statusValue}>{auth.user?.email || 'None'}</Text>
            </View>
            <View style={styles.statusRow}>
              <Shield size={16} color={theme.colors.primary} />
              <Text style={styles.statusLabel}>Role:</Text>
              <Text style={styles.statusValue}>{auth.user?.role || 'None'}</Text>
            </View>
            <View style={styles.statusRow}>
              <CheckCircle size={16} color={auth.isAuthenticated ? theme.colors.success : theme.colors.danger} />
              <Text style={styles.statusLabel}>Authenticated:</Text>
              <Text style={styles.statusValue}>{auth.isAuthenticated ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.statusRow}>
              <CheckCircle size={16} color={auth.isFirebaseAuthenticated ? theme.colors.success : theme.colors.danger} />
              <Text style={styles.statusLabel}>Firebase Auth:</Text>
              <Text style={styles.statusValue}>{auth.isFirebaseAuthenticated ? 'Yes' : 'No'}</Text>
            </View>
          </View>
        </View>

        {/* Firebase Status */}
        {firebaseStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Firebase Status</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Initialized:</Text>
                <Text style={styles.statusValue}>{firebaseStatus.initialized ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Current User:</Text>
                <Text style={styles.statusValue}>{firebaseStatus.userEmail || 'None'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>User ID:</Text>
                <Text style={styles.statusValue}>{firebaseStatus.userId || 'None'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={runAuthTests}
              disabled={loading}
            >
              <RefreshCw size={16} color={theme.colors.white} />
              <Text style={styles.buttonText}>Refresh Tests</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={signInWithAuth}
              disabled={loading}
            >
              <User size={16} color={theme.colors.primary} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sign In via Auth Hook</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results ({testResults.length})</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                {getStatusIcon(result.status)}
                <Text style={styles.resultTest}>{result.test}</Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.resultDetails}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
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
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.gray,
    minWidth: 100,
  },
  statusValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  buttonContainer: {
    gap: theme.spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  resultCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  resultTest: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.dark,
  },
  resultMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  resultDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
});