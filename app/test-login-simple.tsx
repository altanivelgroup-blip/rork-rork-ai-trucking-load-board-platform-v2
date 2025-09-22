import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { theme } from '@/constants/theme';

export default function TestLoginSimple() {
  const [email, setEmail] = useState('test1@test1.com');
  const [password, setPassword] = useState('test22');
  const [result, setResult] = useState('');

  const testLogin = async () => {
    try {
      setResult('Testing login...');
      
      const { auth, db } = getFirebase();
      console.log('Firebase auth available:', !!auth);
      console.log('Firebase db available:', !!db);
      
      // Try to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const firebaseUser = userCredential.user;
      
      console.log('Firebase user:', firebaseUser.uid, firebaseUser.email);
      
      // Check if user profile exists
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log('User profile data:', userData);
        setResult(`SUCCESS! 
User ID: ${firebaseUser.uid}
Email: ${firebaseUser.email}
Profile exists: Yes
Role: ${userData.role}
Name: ${userData.profileData?.fullName || 'Not set'}`);
      } else {
        setResult(`SUCCESS! 
User ID: ${firebaseUser.uid}
Email: ${firebaseUser.email}
Profile exists: No - needs to be created`);
      }
      
    } catch (error: any) {
      console.error('Login test failed:', error);
      setResult(`FAILED: ${error.code} - ${error.message}`);
      Alert.alert('Login Failed', `${error.code}: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Simple Login Test</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={testLogin}>
        <Text style={styles.buttonText}>Test Login</Text>
      </TouchableOpacity>
      
      {result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 16,
  },
  resultText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});