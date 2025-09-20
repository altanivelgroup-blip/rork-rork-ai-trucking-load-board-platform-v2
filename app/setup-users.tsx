import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { Stack } from 'expo-router';

interface TestUser {
  uid: string;
  email: string;
  password: string;
  role: 'driver' | 'shipper';
  equipment?: string;
  membership?: string;
}

interface UserData {
  email: string;
  password: string;
  role: 'driver' | 'shipper';
  equipment?: string;
  membership?: string;
  createdAt: any;
}

interface AuthResult {
  email: string;
  authUid: string;
  targetUid: string;
  success: boolean;
  error?: string;
}

const TEST_USERS: TestUser[] = [
  {
    uid: 'GHroZRK12HMHO31hRIiFj9KhCLw1',
    email: 'driver@truck.com',
    password: 'T23456',
    role: 'driver',
    equipment: 'truck'
  },
  {
    uid: 'w39pn3sLbXb84APbHFpId07SVXq2',
    email: 'driver@cargovan.com',
    password: 'C23456',
    role: 'driver',
    equipment: 'cargo van'
  },
  {
    uid: 'Eleuh7e8kpTJR0jRBCVT5NMCS3t1',
    email: 'driver@boxtruck.com',
    password: 'B23456',
    role: 'driver',
    equipment: 'box truck'
  },
  {
    uid: 'EeZBwn3rvpM8kTr62pncpTnE0zn2',
    email: 'driver@reefer.com',
    password: 'R23456',
    role: 'driver',
    equipment: 'reefer'
  },
  {
    uid: 'YzKrEiADCjPqV9ZW3w7cTpnOlnU2',
    email: 'driver@flatbed.com',
    password: 'F23456',
    role: 'driver',
    equipment: 'flatbed'
  },
  {
    uid: 'jVkPdd6dv6aYqz8WDNaWw2vFwB02',
    email: 'base@shipper.com',
    password: 'B23456',
    role: 'shipper',
    membership: 'base'
  },
  {
    uid: 'w2RbjgaWTWNpdBCnn0Dkn5bZnNu2',
    email: 'pro@shipper.com',
    password: 'P23456',
    role: 'shipper',
    membership: 'pro'
  }
];

const USERS_DATA: { id: string; data: UserData }[] = TEST_USERS.map(user => ({
  id: user.uid,
  data: {
    email: user.email,
    password: user.password,
    role: user.role,
    ...(user.equipment && { equipment: user.equipment }),
    ...(user.membership && { membership: user.membership }),
    createdAt: serverTimestamp()
  }
}));

export default function SetupUsersScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [authResults, setAuthResults] = useState<AuthResult[]>([]);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  const checkExistingUsers = async () => {
    try {
      console.log('[SETUP_USERS] 🔍 Checking existing users...');
      setIsLoading(true);
      setResults([]);
      
      // Ensure Firebase auth
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      
      const { db } = getFirebase();
      const usersCollection = collection(db, 'users');
      const snapshot = await getDocs(usersCollection);
      
      const existing = snapshot.docs.map(doc => `${doc.id}: ${doc.data().email}`);
      setExistingUsers(existing);
      
      const message = existing.length > 0 
        ? `Found ${existing.length} existing users`
        : 'No existing users found';
      
      setResults([message, ...existing]);
      console.log('[SETUP_USERS] ✅ Check complete:', message);
      
    } catch (error: any) {
      console.error('[SETUP_USERS] ❌ Check failed:', error);
      setResults([`Error checking users: ${error.message}`]);
      Alert.alert('Error', `Failed to check existing users: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createAuthUsers = async () => {
    try {
      console.log('[SETUP_USERS] 🔐 Creating Firebase Auth users...');
      setIsLoading(true);
      setAuthResults([]);
      
      // Ensure Firebase auth
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      
      const { auth } = getFirebase();
      const authSetupResults: AuthResult[] = [];
      
      console.log(`[SETUP_USERS] 🔐 Creating ${TEST_USERS.length} Firebase Auth users...`);
      
      for (const user of TEST_USERS) {
        try {
          console.log(`[SETUP_USERS] Creating auth user: ${user.email}`);
          
          const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
          const createdUser = userCredential.user;
          
          authSetupResults.push({
            email: user.email,
            authUid: createdUser.uid,
            targetUid: user.uid,
            success: true
          });
          
          console.log(`[SETUP_USERS] ✅ Auth user created: ${user.email} (UID: ${createdUser.uid})`);
          
          // Sign out immediately to avoid conflicts
          await signOut(auth);
          
        } catch (userError: any) {
          authSetupResults.push({
            email: user.email,
            authUid: '',
            targetUid: user.uid,
            success: false,
            error: userError.message
          });
          
          console.error(`[SETUP_USERS] ❌ Failed to create auth user ${user.email}: ${userError.message}`);
        }
        
        // Small delay between creations
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setAuthResults(authSetupResults);
      
      const successCount = authSetupResults.filter(r => r.success).length;
      const errorCount = authSetupResults.filter(r => !r.success).length;
      
      console.log(`[SETUP_USERS] 🎉 Auth setup complete: ${successCount} success, ${errorCount} errors`);
      
      if (errorCount === 0) {
        Alert.alert('Auth Success!', `All ${successCount} Firebase Auth users created successfully. Note: Auth UIDs are auto-generated and different from your target UIDs.`);
      } else {
        Alert.alert('Auth Partial Success', `${successCount} auth users created, ${errorCount} failed`);
      }
      
    } catch (error: any) {
      console.error('[SETUP_USERS] ❌ Auth setup failed:', error);
      Alert.alert('Error', `Auth setup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const setupFirestoreUsers = async () => {
    try {
      console.log('[SETUP_USERS] 🚀 Starting Firestore user setup...');
      setIsLoading(true);
      setResults([]);
      
      // Ensure Firebase auth
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      
      const { db } = getFirebase();
      const setupResults: string[] = [];
      
      console.log(`[SETUP_USERS] 📝 Creating ${USERS_DATA.length} Firestore user documents...`);
      
      for (const user of USERS_DATA) {
        try {
          const userDoc = doc(db, 'users', user.id);
          await setDoc(userDoc, user.data);
          
          const successMsg = `✅ Firestore doc: ${user.data.email} (${user.data.role}${user.data.equipment ? ` - ${user.data.equipment}` : ''}${user.data.membership ? ` - ${user.data.membership}` : ''}) - UID: ${user.id}`;
          setupResults.push(successMsg);
          console.log(`[SETUP_USERS] ${successMsg}`);
          
        } catch (userError: any) {
          const errorMsg = `❌ Failed Firestore doc for ${user.data.email}: ${userError.message}`;
          setupResults.push(errorMsg);
          console.error(`[SETUP_USERS] ${errorMsg}`);
        }
      }
      
      setResults(setupResults);
      
      const successCount = setupResults.filter(r => r.includes('✅')).length;
      const errorCount = setupResults.filter(r => r.includes('❌')).length;
      
      console.log(`[SETUP_USERS] 🎉 Firestore setup complete: ${successCount} success, ${errorCount} errors`);
      
      if (errorCount === 0) {
        Alert.alert('Firestore Success!', `All ${successCount} Firestore user documents created with your specified UIDs`);
      } else {
        Alert.alert('Firestore Partial Success', `${successCount} Firestore docs created, ${errorCount} failed`);
      }
      
    } catch (error: any) {
      console.error('[SETUP_USERS] ❌ Firestore setup failed:', error);
      setResults([`Firestore setup failed: ${error.message}`]);
      Alert.alert('Error', `Firestore setup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showManualInstructions = () => {
    Alert.alert(
      'Manual Firebase Console Setup',
      'For exact UID matching, you need to:\n\n' +
      '1. Go to Firebase Console > Authentication\n' +
      '2. Click "Add user" for each account\n' +
      '3. Enter email and password\n' +
      '4. After creation, click the user and copy the UID\n' +
      '5. Update your Firestore documents to use the actual Auth UIDs\n\n' +
      'This ensures perfect Auth UID to Firestore UID matching.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Setup Users Collection' }} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Firebase Users Setup</Text>
        <Text style={styles.subtitle}>Create 7 Firebase Auth users + Firestore documents with specified UIDs</Text>
        
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ Important Notes:</Text>
          <Text style={styles.warningText}>• Firebase Auth will generate new UIDs (cannot set custom UIDs)</Text>
          <Text style={styles.warningText}>• Firestore documents will use your specified UIDs as document IDs</Text>
          <Text style={styles.warningText}>• You'll need to manually link Auth UIDs to Firestore UIDs in your app logic</Text>
          <Text style={styles.warningText}>• Or manually create Auth users in Firebase Console with custom UIDs</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users to Create:</Text>
          {TEST_USERS.map((user, index) => (
            <View key={user.uid} style={styles.userItem}>
              <Text style={styles.userIndex}>{index + 1}.</Text>
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userMeta}>
                  {user.role} • {user.equipment || user.membership} • Password: {user.password}
                </Text>
                <Text style={styles.userId}>Target UID: {user.uid}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.checkButton]} 
            onPress={checkExistingUsers}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Checking...' : 'Check Existing Firestore Users'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.authButton]} 
            onPress={createAuthUsers}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating...' : 'Create Firebase Auth Users'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.setupButton]} 
            onPress={setupFirestoreUsers}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating...' : 'Create Firestore Documents'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.manualButton]} 
            onPress={showManualInstructions}
          >
            <Text style={styles.buttonText}>
              Manual Setup Instructions
            </Text>
          </TouchableOpacity>
        </View>
        
        {authResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Firebase Auth Results:</Text>
            {authResults.map((result, index) => (
              <View key={`auth-${index}`} style={styles.authResultItem}>
                <Text style={[
                  styles.resultItem,
                  result.success ? styles.successResult : styles.errorResult
                ]}>
                  {result.success ? '✅' : '❌'} {result.email}
                </Text>
                {result.success && (
                  <Text style={styles.uidText}>
                    Auth UID: {result.authUid} | Target UID: {result.targetUid}
                  </Text>
                )}
                {!result.success && result.error && (
                  <Text style={styles.errorText}>Error: {result.error}</Text>
                )}
              </View>
            ))}
          </View>
        )}
        
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Firestore Results:</Text>
            {results.map((result, index) => (
              <Text key={`firestore-${index}`} style={[
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
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#34C759',
  },
  authButton: {
    backgroundColor: '#FF9500',
  },
  setupButton: {
    backgroundColor: '#007AFF',
  },
  manualButton: {
    backgroundColor: '#5856D6',
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
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  authResultItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  uidText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});