import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { Stack } from 'expo-router';

interface UserData {
  email: string;
  password: string;
  role: 'driver' | 'shipper';
  equipment?: string;
  membership?: string;
  createdAt: any;
}

const USERS_DATA: { id: string; data: UserData }[] = [
  {
    id: 'GHroZRK12HMHO31hRIiFj9KhCLw1',
    data: {
      email: 'driver@truck.com',
      password: 'T23456',
      role: 'driver',
      equipment: 'truck',
      createdAt: serverTimestamp()
    }
  },
  {
    id: 'w39pn3sLbXb84APbHFpId07SVXq2',
    data: {
      email: 'driver@cargovan.com',
      password: 'C23456',
      role: 'driver',
      equipment: 'cargo van',
      createdAt: serverTimestamp()
    }
  },
  {
    id: 'Eleuh7e8kpTJR0jRBCVT5NMCS3t1',
    data: {
      email: 'driver@boxtruck.com',
      password: 'B23456',
      role: 'driver',
      equipment: 'box truck',
      createdAt: serverTimestamp()
    }
  },
  {
    id: 'EeZBwn3rvpM8kTr62pncpTnE0zn2',
    data: {
      email: 'driver@reefer.com',
      password: 'R23456',
      role: 'driver',
      equipment: 'reefer',
      createdAt: serverTimestamp()
    }
  },
  {
    id: 'YzKrEiADCjPqV9ZW3w7cTpnOlnU2',
    data: {
      email: 'driver@flatbed.com',
      password: 'F23456',
      role: 'driver',
      equipment: 'flatbed',
      createdAt: serverTimestamp()
    }
  },
  {
    id: 'jVkPdd6dv6aYqz8WDNaWw2vFwB02',
    data: {
      email: 'base@shipper.com',
      password: 'B23456',
      role: 'shipper',
      membership: 'base',
      createdAt: serverTimestamp()
    }
  },
  {
    id: 'w2RbjgaWTWNpdBCnn0Dkn5bZnNu2',
    data: {
      email: 'pro@shipper.com',
      password: 'P23456',
      role: 'shipper',
      membership: 'pro',
      createdAt: serverTimestamp()
    }
  }
];

export default function SetupUsersScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
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

  const setupUsers = async () => {
    try {
      console.log('[SETUP_USERS] 🚀 Starting user setup...');
      setIsLoading(true);
      setResults([]);
      
      // Ensure Firebase auth
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      
      const { db } = getFirebase();
      const setupResults: string[] = [];
      
      console.log(`[SETUP_USERS] 📝 Creating ${USERS_DATA.length} user documents...`);
      
      for (const user of USERS_DATA) {
        try {
          const userDoc = doc(db, 'users', user.id);
          await setDoc(userDoc, user.data);
          
          const successMsg = `✅ Created user: ${user.data.email} (${user.data.role}${user.data.equipment ? ` - ${user.data.equipment}` : ''}${user.data.membership ? ` - ${user.data.membership}` : ''})`;
          setupResults.push(successMsg);
          console.log(`[SETUP_USERS] ${successMsg}`);
          
        } catch (userError: any) {
          const errorMsg = `❌ Failed to create ${user.data.email}: ${userError.message}`;
          setupResults.push(errorMsg);
          console.error(`[SETUP_USERS] ${errorMsg}`);
        }
      }
      
      setResults(setupResults);
      
      const successCount = setupResults.filter(r => r.includes('✅')).length;
      const errorCount = setupResults.filter(r => r.includes('❌')).length;
      
      console.log(`[SETUP_USERS] 🎉 Setup complete: ${successCount} success, ${errorCount} errors`);
      
      if (errorCount === 0) {
        Alert.alert('Success!', `All ${successCount} users created successfully`);
      } else {
        Alert.alert('Partial Success', `${successCount} users created, ${errorCount} failed`);
      }
      
    } catch (error: any) {
      console.error('[SETUP_USERS] ❌ Setup failed:', error);
      setResults([`Setup failed: ${error.message}`]);
      Alert.alert('Error', `Setup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Setup Users Collection' }} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Firestore Users Collection Setup</Text>
        <Text style={styles.subtitle}>Create 7 user documents with specified UIDs</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users to Create:</Text>
          {USERS_DATA.map((user, index) => (
            <View key={user.id} style={styles.userItem}>
              <Text style={styles.userIndex}>{index + 1}.</Text>
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{user.data.email}</Text>
                <Text style={styles.userMeta}>
                  {user.data.role} • {user.data.equipment || user.data.membership}
                </Text>
                <Text style={styles.userId}>ID: {user.id}</Text>
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
              {isLoading ? 'Checking...' : 'Check Existing Users'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.setupButton]} 
            onPress={setupUsers}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating...' : 'Create All Users'}
            </Text>
          </TouchableOpacity>
        </View>
        
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
  setupButton: {
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