import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, db, getFirebase } from '@/utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  testResult: {
    fontSize: 14,
    marginBottom: 5,
  },
  success: {
    color: '#34C759',
  },
  error: {
    color: '#FF3B30',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function AppTestScreen() {
  const router = useRouter();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: Record<string, any> = {};

    try {
      // Test 1: Firebase Configuration
      console.log('[AppTest] Testing Firebase configuration...');
      try {
        const firebase = getFirebase();
        results.firebaseConfig = {
          status: 'success',
          projectId: firebase.app.options.projectId,
          authDomain: firebase.app.options.authDomain,
        };
      } catch (error: any) {
        results.firebaseConfig = {
          status: 'error',
          error: error.message,
        };
      }

      // Test 2: Firebase Auth
      console.log('[AppTest] Testing Firebase auth...');
      try {
        const currentUser = auth.currentUser;
        results.firebaseAuth = {
          status: 'success',
          hasCurrentUser: !!currentUser,
          userEmail: currentUser?.email || 'none',
          userId: currentUser?.uid || 'none',
        };
      } catch (error: any) {
        results.firebaseAuth = {
          status: 'error',
          error: error.message,
        };
      }

      // Test 3: Test Login
      console.log('[AppTest] Testing login...');
      try {
        const testCredential = await signInWithEmailAndPassword(
          auth,
          'driver@test1.com',
          'RealUnlock123'
        );
        results.testLogin = {
          status: 'success',
          userId: testCredential.user.uid,
          email: testCredential.user.email,
        };
      } catch (error: any) {
        results.testLogin = {
          status: 'error',
          error: error.message,
          code: error.code,
        };
      }

      setTestResults(results);
    } catch (error: any) {
      console.error('[AppTest] Test suite failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const renderTestResult = (testName: string, result: any) => {
    if (!result) return null;

    const isSuccess = result.status === 'success';
    return (
      <View key={testName} style={styles.section}>
        <Text style={styles.sectionTitle}>{testName}</Text>
        <Text style={[styles.testResult, isSuccess ? styles.success : styles.error]}>
          Status: {result.status}
        </Text>
        {Object.entries(result).map(([key, value]) => {
          if (key === 'status') return null;
          return (
            <Text key={key} style={styles.testResult}>
              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>App Diagnostic Test</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={runTests}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Tests...' : 'Run Tests Again'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#34C759' }]} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>

        {Object.entries(testResults).map(([testName, result]) => 
          renderTestResult(testName, result)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}