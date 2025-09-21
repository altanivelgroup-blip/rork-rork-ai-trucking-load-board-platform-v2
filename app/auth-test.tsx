import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function AuthTestScreen() {
  const [email, setEmail] = useState('test@driver.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const { user, login, isAuthenticated } = useAuth();
  const router = useRouter();

  const addStatus = (message: string) => {
    console.log('[AuthTest]', message);
    setStatus(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectFirebaseAuth = async () => {
    setLoading(true);
    addStatus('🔥 Testing direct Firebase authentication...');
    
    try {
      const { auth } = getFirebase();
      addStatus(`Firebase auth instance: ${!!auth}`);
      
      if (!auth) {
        addStatus('❌ Firebase auth not available');
        return;
      }
      
      addStatus(`Current user before: ${auth.currentUser?.uid || 'none'}`);
      
      // Try to sign in
      const result = await signInWithEmailAndPassword(auth, email, password);
      addStatus(`✅ Direct Firebase sign in successful: ${result.user.uid}`);
      addStatus(`User email: ${result.user.email}`);
      addStatus(`Is anonymous: ${result.user.isAnonymous}`);
      
    } catch (error: any) {
      addStatus(`❌ Direct Firebase auth failed: ${error.code} - ${error.message}`);
      
      if (error.code === 'auth/user-not-found') {
        addStatus('🔧 User not found, trying to create account...');
        try {
          const { auth } = getFirebase();
          const createResult = await createUserWithEmailAndPassword(auth, email, password);
          addStatus(`✅ Account created: ${createResult.user.uid}`);
        } catch (createError: any) {
          addStatus(`❌ Account creation failed: ${createError.code} - ${createError.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const testAuthHook = async () => {
    setLoading(true);
    addStatus('🎯 Testing useAuth hook login...');
    
    try {
      await login(email, password, 'driver');
      addStatus('✅ Auth hook login successful');
    } catch (error: any) {
      addStatus(`❌ Auth hook login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEnsureAuth = async () => {
    setLoading(true);
    addStatus('🔐 Testing ensureFirebaseAuth...');
    
    try {
      const result = await ensureFirebaseAuth();
      addStatus(`ensureFirebaseAuth result: ${result}`);
      
      const { auth } = getFirebase();
      addStatus(`Current user after: ${auth.currentUser?.uid || 'none'}`);
      addStatus(`Is anonymous: ${auth.currentUser?.isAnonymous || 'N/A'}`);
    } catch (error: any) {
      addStatus(`❌ ensureFirebaseAuth failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentState = () => {
    const { auth } = getFirebase();
    addStatus('📊 Current authentication state:');
    addStatus(`Firebase user: ${auth.currentUser?.uid || 'none'}`);
    addStatus(`Firebase email: ${auth.currentUser?.email || 'none'}`);
    addStatus(`Firebase anonymous: ${auth.currentUser?.isAnonymous || 'N/A'}`);
    addStatus(`useAuth user: ${user?.id || 'none'}`);
    addStatus(`useAuth email: ${user?.email || 'none'}`);
    addStatus(`useAuth role: ${user?.role || 'none'}`);
    addStatus(`isAuthenticated: ${isAuthenticated}`);
  };

  useEffect(() => {
    checkCurrentState();
  }, [user, isAuthenticated]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Authentication Test' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Credentials</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password:</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Tests</Text>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={checkCurrentState}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Current State</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testEnsureAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test ensureFirebaseAuth</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testDirectFirebaseAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Direct Firebase Auth</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testAuthHook}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test useAuth Hook</Text>
          </TouchableOpacity>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.loadingText}>Testing...</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Log</Text>
          <ScrollView style={styles.statusContainer}>
            {status.map((msg, index) => (
              <Text key={index} style={styles.statusText}>
                {msg}
              </Text>
            ))}
          </ScrollView>
        </View>
        
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
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
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: theme.colors.gray,
    marginTop: theme.spacing.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.gray,
  },
  statusContainer: {
    maxHeight: 200,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});