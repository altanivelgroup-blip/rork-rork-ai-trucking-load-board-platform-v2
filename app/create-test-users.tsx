import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { Stack } from 'expo-router';

interface TestUser {
  email: string;
  password: string;
  role: 'driver' | 'shipper' | 'admin';
  name: string;
}

const YOUR_TEST_USERS: TestUser[] = [
  {
    email: 'driver@test1.com',
    password: 'RealUnlock123',
    role: 'driver',
    name: 'DRIVER'
  },
  {
    email: 'shipper@test1.com',
    password: 'RealShipper123',
    role: 'shipper',
    name: 'SHIPPER'
  },
  {
    email: 'admin@test1.com',
    password: 'RealBoss123',
    role: 'admin',
    name: 'ADMIN'
  }
];

export default function CreateTestUsersScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const createTestUsers = async () => {
    try {
      console.log('[CREATE_TEST_USERS] 🚀 Creating your test users...');
      setIsLoading(true);
      setResults([]);
      
      // Ensure Firebase auth
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      
      const { auth, db } = getFirebase();
      const setupResults: string[] = [];
      
      for (const user of YOUR_TEST_USERS) {
        try {
          console.log(`[CREATE_TEST_USERS] Creating: ${user.email}`);
          
          // Create Firebase Auth user
          const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
          const firebaseUser = userCredential.user;
          
          // Create Firestore profile
          const userDoc = doc(db, 'users', firebaseUser.uid);
          await setDoc(userDoc, {
            role: user.role,
            profileData: {
              fullName: user.name,
              email: user.email,
              phone: '',
              company: user.role === 'shipper' ? 'Test Logistics' : ''
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          const successMsg = `✅ Created: ${user.email} (${user.role}) - UID: ${firebaseUser.uid}`;
          setupResults.push(successMsg);
          console.log(`[CREATE_TEST_USERS] ${successMsg}`);
          
          // Sign out to avoid conflicts
          await signOut(auth);
          
        } catch (userError: any) {
          const errorMsg = `❌ Failed: ${user.email} - ${userError.message}`;
          setupResults.push(errorMsg);
          console.error(`[CREATE_TEST_USERS] ${errorMsg}`);
        }
        
        // Small delay between creations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setResults(setupResults);
      
      const successCount = setupResults.filter(r => r.includes('✅')).length;
      const errorCount = setupResults.filter(r => r.includes('❌')).length;
      
      console.log(`[CREATE_TEST_USERS] 🎉 Setup complete: ${successCount} success, ${errorCount} errors`);
      
      if (errorCount === 0) {
        Alert.alert('Success!', `All ${successCount} test users created successfully. You can now sign in with your credentials.`);
      } else {
        Alert.alert('Partial Success', `${successCount} users created, ${errorCount} failed`);
      }
      
    } catch (error: any) {
      console.error('[CREATE_TEST_USERS] ❌ Setup failed:', error);
      setResults([`Setup failed: ${error.message}`]);
      Alert.alert('Error', `Setup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Create Your Test Users' }} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Create Your Test Users</Text>
        <Text style={styles.subtitle}>This will create the test users you want to use</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users to Create:</Text>
          {YOUR_TEST_USERS.map((user, index) => (
            <View key={user.email} style={styles.userItem}>
              <Text style={styles.userIndex}>{index + 1}.</Text>
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userMeta}>
                  {user.role} • Password: {user.password}
                </Text>
              </View>
            </View>
          ))}
        </View>
        
        <TouchableOpacity 
          style={[styles.button, styles.createButton]} 
          onPress={createTestUsers}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating Users...' : 'Create Test Users'}
          </Text>
        </TouchableOpacity>
        
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Results:</Text>
            {results.map((result, index) => (
              <Text key={index} style={[
                styles.resultItem,
                result.includes('✅') && styles.successResult,
                result.includes('❌') && styles.errorResult
              ]}>
                {result}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userIndex: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 12,
    minWidth: 20,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  resultItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    paddingVertical: 4,
  },
  successResult: {
    color: '#34C759',
  },
  errorResult: {
    color: '#FF3B30',
  },
});