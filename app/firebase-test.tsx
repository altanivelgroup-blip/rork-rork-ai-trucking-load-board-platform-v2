import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { testFirebaseConnection } from '@/lib/firebase';

export default function FirebaseTestScreen() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await testFirebaseConnection();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message || 'Test failed',
        code: error.code || 'unknown'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Firebase Test' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Firebase Connection Test</Text>
          
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={runTest}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Run Firebase Test'}
            </Text>
          </TouchableOpacity>

          {testResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Test Result:</Text>
              <View style={[styles.resultBox, testResult.success ? styles.success : styles.error]}>
                <Text style={styles.resultText}>
                  Status: {testResult.success ? 'SUCCESS' : 'FAILED'}
                </Text>
                
                {testResult.success ? (
                  <>
                    <Text style={styles.resultText}>Project ID: {testResult.projectId}</Text>
                    <Text style={styles.resultText}>User ID: {testResult.userId}</Text>
                    <Text style={styles.resultText}>Documents Found: {testResult.docsFound}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.resultText}>Error: {testResult.error}</Text>
                    {testResult.code && (
                      <Text style={styles.resultText}>Code: {testResult.code}</Text>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What this test does:</Text>
            <Text style={styles.infoText}>• Initializes Firebase services</Text>
            <Text style={styles.infoText}>• Tests authentication</Text>
            <Text style={styles.infoText}>• Queries the &apos;loads&apos; collection</Text>
            <Text style={styles.infoText}>• Shows connection details</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

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
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultBox: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  success: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  error: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
});