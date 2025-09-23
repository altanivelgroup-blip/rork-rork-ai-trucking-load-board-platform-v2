import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function AuthDebugScreen() {
  const [email, setEmail] = useState('driver@test1.com');
  const [password, setPassword] = useState('RealUnlock123');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const testCredentials = [
    { email: 'driver@test1.com', password: 'RealUnlock123', role: 'driver' },
    { email: 'shipper@test1.com', password: 'RealShipper123', role: 'shipper' },
    { email: 'admin@test1.com', password: 'RealBoss123', role: 'admin' },
  ];

  const testAuth = async () => {
    setLoading(true);
    setResult('Testing authentication...');
    
    try {
      const { auth, db } = getFirebase();
      console.log('Firebase config:', {
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain
      });
      
      setResult(prev => prev + '\n\nAttempting sign in...');
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;
      
      setResult(prev => prev + `\n✅ Sign in successful!\nUID: ${user.uid}\nEmail: ${user.email}`);
      
      // Check user document
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setResult(prev => prev + `\n\n📄 User document found:\nRole: ${userData.role}\nName: ${userData.profileData?.fullName || 'N/A'}`);
      } else {
        setResult(prev => prev + '\n\n⚠️ No user document found in Firestore');
      }
      
      // Navigate to appropriate screen based on role
      setTimeout(() => {
        router.replace('/(tabs)/dashboard');
      }, 2000);
      
    } catch (error: any) {
      console.error('Auth test error:', error);
      setResult(prev => prev + `\n\n❌ Error: ${error.code}\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAllCredentials = async () => {
    setLoading(true);
    setResult('Testing all credentials...');
    
    for (const cred of testCredentials) {
      try {
        setResult(prev => prev + `\n\nTesting ${cred.email}...`);
        const { auth } = getFirebase();
        const userCredential = await signInWithEmailAndPassword(auth, cred.email, cred.password);
        setResult(prev => prev + ` ✅ SUCCESS`);
        
        // Sign out immediately
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        
      } catch (error: any) {
        setResult(prev => prev + ` ❌ FAILED: ${error.code}`);
      }
    }
    
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Firebase Auth Debug</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Authentication'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]} 
          onPress={testAllCredentials}
          disabled={loading}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Test All Credentials
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.credentialsTitle}>Test Credentials:</Text>
        {testCredentials.map((cred, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.credentialItem}
            onPress={() => {
              setEmail(cred.email);
              setPassword(cred.password);
            }}
          >
            <Text style={styles.credentialText}>
              {cred.email} / {cred.password} ({cred.role})
            </Text>
          </TouchableOpacity>
        ))}
        
        <Text style={styles.result}>{result}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  credentialsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  credentialItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  credentialText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
  },
  result: {
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    minHeight: 200,
  },
});