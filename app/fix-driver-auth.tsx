import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase } from '@/utils/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, Shield, CheckCircle, AlertCircle, UserPlus } from 'lucide-react-native';

export default function FixDriverAuthScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('driver@truck.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log('[FixAuth]', message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const createFirebaseUser = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const firebase = getFirebase();
      
      if (!firebase.auth || !firebase.db) {
        addResult('❌ Firebase not initialized properly');
        return;
      }
      
      addResult('🔧 Starting Firebase user creation process...');
      
      // Step 1: Try to sign in first
      try {
        addResult('🔍 Checking if user already exists...');
        const signInResult = await signInWithEmailAndPassword(firebase.auth, email, password);
        addResult(`✅ User already exists and signed in: ${signInResult.user.email}`);
        addResult(`✅ User ID: ${signInResult.user.uid}`);
        
        // Update the auth hook
        await auth.login(email, password, 'driver');
        addResult('✅ Auth hook updated successfully');
        
        addResult('🎉 User is ready to use the app!');
        return;
      } catch (signInError: any) {
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          addResult('ℹ️ User does not exist, creating new user...');
        } else {
          addResult(`⚠️ Sign in failed: ${signInError.code} - ${signInError.message}`);
          addResult('ℹ️ Attempting to create user anyway...');
        }
      }
      
      // Step 2: Create the user
      try {
        addResult('👤 Creating Firebase user...');
        const createResult = await createUserWithEmailAndPassword(firebase.auth, email, password);
        addResult(`✅ Firebase user created: ${createResult.user.email}`);
        addResult(`✅ User ID: ${createResult.user.uid}`);
        
        // Step 3: Create user profile in Firestore
        addResult('📝 Creating user profile in Firestore...');
        const userDoc = doc(firebase.db, 'users', createResult.user.uid);
        await setDoc(userDoc, {
          email: createResult.user.email,
          role: 'driver',
          createdAt: serverTimestamp(),
          displayName: 'Test Driver',
          phone: '',
          company: 'Test Company'
        });
        addResult('✅ User profile created in Firestore');
        
        // Step 4: Create driver profile
        addResult('🚛 Creating driver profile...');
        const driverDoc = doc(firebase.db, 'drivers', createResult.user.uid);
        await setDoc(driverDoc, {
          email: createResult.user.email,
          displayName: 'Test Driver',
          role: 'driver',
          phone: '',
          company: 'Test Company',
          primaryVehicle: 'truck',
          vehicleMake: 'Ford',
          vehicleModel: 'F-350',
          vehicleYear: '2020',
          fuelType: 'diesel',
          mpgRated: 8.5,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addResult('✅ Driver profile created in Firestore');
        
        // Step 5: Update the auth hook
        addResult('🔄 Updating auth hook...');
        await auth.login(email, password, 'driver');
        addResult('✅ Auth hook updated successfully');
        
        addResult('🎉 User creation complete! You can now use all app features.');
        
      } catch (createError: any) {
        addResult(`❌ User creation failed: ${createError.code} - ${createError.message}`);
        
        if (createError.code === 'auth/email-already-in-use') {
          addResult('ℹ️ Email already in use, trying to sign in...');
          try {
            const signInResult = await signInWithEmailAndPassword(firebase.auth, email, password);
            addResult(`✅ Signed in successfully: ${signInResult.user.email}`);
            await auth.login(email, password, 'driver');
            addResult('✅ Auth hook updated successfully');
            addResult('🎉 User is ready to use the app!');
          } catch (finalError: any) {
            addResult(`❌ Final sign in failed: ${finalError.code} - ${finalError.message}`);
          }
        }
      }
      
    } catch (error: any) {
      addResult(`❌ Process failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCurrentAuth = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('🔍 Testing current authentication status...');
      
      // Test auth hook
      addResult(`Auth Hook - User: ${auth.user?.email || 'None'}`);
      addResult(`Auth Hook - Role: ${auth.user?.role || 'None'}`);
      addResult(`Auth Hook - Authenticated: ${auth.isAuthenticated}`);
      addResult(`Auth Hook - Firebase Auth: ${auth.isFirebaseAuthenticated}`);
      
      // Test Firebase
      const firebase = getFirebase();
      if (firebase.auth?.currentUser) {
        addResult(`Firebase - User: ${firebase.auth.currentUser.email}`);
        addResult(`Firebase - UID: ${firebase.auth.currentUser.uid}`);
        addResult(`Firebase - Email Verified: ${firebase.auth.currentUser.emailVerified}`);
      } else {
        addResult('Firebase - No current user');
      }
      
      addResult('✅ Authentication test complete');
      
    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signInExistingUser = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('🔑 Signing in existing user...');
      
      // Sign in via auth hook
      await auth.login(email, password, 'driver');
      addResult('✅ Signed in via auth hook');
      
      // Verify Firebase auth
      const firebase = getFirebase();
      if (firebase.auth?.currentUser) {
        addResult(`✅ Firebase user: ${firebase.auth.currentUser.email}`);
      } else {
        addResult('⚠️ No Firebase user after sign in');
      }
      
      addResult('🎉 Sign in complete!');
      
    } catch (error: any) {
      addResult(`❌ Sign in failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Fix Driver Authentication' }} />
      
      <ScrollView style={styles.content}>
        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <User size={16} color={theme.colors.primary} />
              <Text style={styles.statusLabel}>App User:</Text>
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

        {/* User Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Credentials</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={testCurrentAuth}
              disabled={loading}
            >
              <CheckCircle size={16} color={theme.colors.white} />
              <Text style={styles.buttonText}>Test Current Auth</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={signInExistingUser}
              disabled={loading}
            >
              <User size={16} color={theme.colors.primary} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sign In Existing User</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.createButton]} 
              onPress={createFirebaseUser}
              disabled={loading}
            >
              <UserPlus size={16} color={theme.colors.white} />
              <Text style={styles.buttonText}>Create Firebase User</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results ({results.length})</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <Text style={styles.resultText}>{result}</Text>
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
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
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
    backgroundColor: theme.colors.white,
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
  createButton: {
    backgroundColor: theme.colors.success,
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
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontFamily: 'monospace',
  },
});