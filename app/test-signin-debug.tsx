import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function TestSignInDebug() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const router = useRouter();

  const addResult = (message: string) => {
    console.log('[DEBUG]', message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCredentials = {
    email: 'test1@test1.com',
    password: 'test22'
  };

  const createTestAccount = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔧 Creating test account...');
      const { auth, db } = getFirebase();
      
      // Try to create the account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        testCredentials.email, 
        testCredentials.password
      );
      
      addResult(`✅ Account created successfully: ${userCredential.user.uid}`);
      
      // Create profile in Firestore
      const profileData = {
        fullName: 'Test User',
        email: testCredentials.email,
        phone: '',
        company: ''
      };
      
      const userDoc = {
        role: 'driver',
        profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, userDoc, { merge: true });
      
      addResult('✅ Profile saved to Firestore');
      addResult('🎉 Test account ready! You can now sign in.');
      
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        addResult('ℹ️ Account already exists - this is good!');
        addResult('✅ You can proceed to test sign-in');
      } else {
        addResult(`❌ Failed to create account: ${error?.code} - ${error?.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testSignIn = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔐 Testing sign-in...');
      addResult(`📧 Email: ${testCredentials.email}`);
      addResult(`🔑 Password: ${testCredentials.password}`);
      
      const { auth, db } = getFirebase();
      
      // Try to sign in
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        testCredentials.email, 
        testCredentials.password
      );
      
      addResult(`✅ Sign-in successful: ${userCredential.user.uid}`);
      addResult(`📧 User email: ${userCredential.user.email}`);
      
      // Check if profile exists in Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        addResult(`✅ Profile found in Firestore`);
        addResult(`👤 Role: ${userData.role}`);
        addResult(`📝 Name: ${userData.profileData?.fullName || 'Not set'}`);
        
        // Navigate to dashboard
        addResult('🚀 Redirecting to dashboard...');
        setTimeout(() => {
          router.replace('/(tabs)/dashboard');
        }, 2000);
      } else {
        addResult('⚠️ No profile found in Firestore - creating one...');
        
        const profileData = {
          fullName: 'Test User',
          email: testCredentials.email,
          phone: '',
          company: ''
        };
        
        const userDoc = {
          role: 'driver',
          profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(userRef, userDoc, { merge: true });
        addResult('✅ Profile created in Firestore');
        
        setTimeout(() => {
          router.replace('/(tabs)/dashboard');
        }, 2000);
      }
      
    } catch (error: any) {
      addResult(`❌ Sign-in failed: ${error?.code}`);
      addResult(`📝 Error message: ${error?.message}`);
      
      if (error?.code === 'auth/user-not-found') {
        addResult('💡 Solution: Try creating the account first');
      } else if (error?.code === 'auth/wrong-password') {
        addResult('💡 Solution: Check if password is correct');
      } else if (error?.code === 'auth/invalid-credential') {
        addResult('💡 Solution: Email or password is incorrect');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccountExists = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔍 Checking if account exists...');
      const { auth } = getFirebase();
      
      // Try to sign in to see if account exists
      try {
        await signInWithEmailAndPassword(auth, testCredentials.email, testCredentials.password);
        addResult('✅ Account exists and password is correct');
        
        // Sign out immediately
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        addResult('🔓 Signed out for testing purposes');
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') {
          addResult('❌ Account does not exist');
          addResult('💡 You need to create the account first');
        } else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
          addResult('⚠️ Account exists but password is wrong');
          addResult('💡 Try a different password or reset it');
        } else {
          addResult(`❌ Error checking account: ${error?.code} - ${error?.message}`);
        }
      }
    } catch (error: any) {
      addResult(`❌ Failed to check account: ${error?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Sign-In Debug Tool</Text>
        <Text style={styles.subtitle}>Testing: {testCredentials.email}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.checkButton]} 
            onPress={checkAccountExists}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>1. Check if Account Exists</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.createButton]} 
            onPress={createTestAccount}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>2. Create Test Account</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.signInButton]} 
            onPress={testSignIn}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>3. Test Sign-In</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
        
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Results:</Text>
          {results.map((result, index) => (
            <Text key={index} style={styles.resultText}>{result}</Text>
          ))}
        </View>
        
        <TouchableOpacity 
          style={[styles.button, styles.backButton]} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
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
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#3498db',
  },
  createButton: {
    backgroundColor: '#2ecc71',
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    backgroundColor: theme.colors.gray,
    marginTop: theme.spacing.xl,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.gray,
  },
  resultsContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});