import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { auth } from '@/utils/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function FirebaseConnectionTest() {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [storageStatus, setStorageStatus] = useState<string>('Not tested');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthStatus(`✅ Authenticated: ${user.uid}`);
        addResult(`Auth: User signed in - ${user.uid}`);
      } else {
        setAuthStatus('❌ Not authenticated');
        addResult('Auth: No user signed in');
      }
    });

    return unsubscribe;
  }, []);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStorageConnection = async () => {
    try {
      setStorageStatus('Testing...');
      addResult('Storage: Starting connection test');

      // Test 1: Get storage instance
      const storageInstance = getStorage();
      addResult(`Storage: Instance created - ${storageInstance.app.name}`);

      // Test 2: Create a reference
      const testRef = ref(storageInstance, 'test/connection-test.txt');
      addResult('Storage: Reference created');

      // Test 3: Try to upload a small text blob
      const testData = new Blob(['Firebase storage connection test'], { type: 'text/plain' });
      await uploadBytes(testRef, testData);
      addResult('Storage: Upload successful');

      // Test 4: Get download URL
      const downloadURL = await getDownloadURL(testRef);
      addResult(`Storage: Download URL obtained - ${downloadURL.substring(0, 50)}...`);

      setStorageStatus('✅ Storage connection successful');
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      setStorageStatus(`❌ Storage error: ${errorMsg}`);
      addResult(`Storage: Error - ${errorMsg}`);
      
      if (error?.code) {
        addResult(`Storage: Error code - ${error.code}`);
      }
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Firebase Connection Test</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Authentication Status:</Text>
          <Text style={styles.statusText}>{authStatus}</Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Storage Status:</Text>
          <Text style={styles.statusText}>{storageStatus}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable onPress={testStorageConnection} style={styles.button}>
            <Text style={styles.buttonText}>Test Storage Connection</Text>
          </Pressable>
          
          <Pressable onPress={clearResults} style={[styles.button, styles.secondaryButton]}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear Results</Text>
          </Pressable>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map((result, index) => (
            <Text key={`result-${index}-${result.substring(0, 10)}`} style={styles.resultText}>
              {result}
            </Text>
          ))}
          {testResults.length === 0 && (
            <Text style={styles.noResults}>No test results yet</Text>
          )}
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
    padding: 16,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  secondaryButtonText: {
    color: theme.colors.dark,
  },
  resultsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 12,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noResults: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});