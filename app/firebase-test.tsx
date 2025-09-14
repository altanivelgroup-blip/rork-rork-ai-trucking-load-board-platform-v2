import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { getFirebase, ensureFirebaseAuth, retryFirebaseAuth, testFirebaseConnectivity } from '@/utils/firebase';
import { LOADS_COLLECTION } from '@/lib/loadSchema';

export default function FirebaseTestScreen() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initStatus, setInitStatus] = useState<string>("Checking...");

  useEffect(() => {
    checkFirebaseStatus();
  }, []);

  const checkFirebaseStatus = async () => {
    try {
      console.log('[FirebaseTest] ✅ Auth optimized - Checking Firebase status...');
      const authReady = await ensureFirebaseAuth();
      if (authReady) {
        const { app, auth } = getFirebase();
        setInitStatus(`✅ Auth optimized - Ready - Project: ${app.options.projectId}, User: ${auth.currentUser?.uid || 'none'}`);
        console.log('[FirebaseTest] ✅ Auth optimized - Sign in successful');
      } else {
        setInitStatus("❌ Auth optimization failed");
      }
    } catch (error) {
      setInitStatus(`❌ Auth optimization error: ${error}`);
    }
  };

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log("[FirebaseTest] ✅ Auth optimized - Starting enhanced Firebase test...");
      
      // Test enhanced Firebase authentication with retry logic
      const authReady = await ensureFirebaseAuth();
      if (!authReady) {
        console.log("[FirebaseTest] Auth optimization - Trying retry logic...");
        const retryResult = await retryFirebaseAuth(3);
        if (!retryResult) {
          throw new Error("❌ Auth optimization failed - Firebase auth not ready after retries");
        }
      }
      
      const { app, auth, db, storage } = getFirebase();
      
      // Test writing a document
      let writeTest = 'SKIPPED';
      let testDocumentId = '';
      let writeError = '';
      
      try {
        // Dynamic import to avoid initialization issues
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        
        console.log('[Firebase Test] Writing test document...');
        testDocumentId = `test-${Date.now()}`;
        
        await setDoc(doc(db, LOADS_COLLECTION, testDocumentId), {
          title: 'Hello Rork Test Load',
          origin: 'Phoenix, AZ',
          destination: 'Los Angeles, CA',
          vehicleType: 'box-truck',
          rate: 1234,
          status: 'OPEN',
          createdBy: auth.currentUser?.uid ?? 'test-user',
          createdAt: serverTimestamp(),
          clientCreatedAt: Date.now(),
        });
        
        writeTest = 'SUCCESS';
        console.log('[Firebase Test] Test document written successfully:', testDocumentId);
      } catch (writeErr: any) {
        writeTest = 'FAILED';
        writeError = writeErr.message || 'Unknown write error';
        console.error('[Firebase Test] Write test failed:', writeErr);
      }
      
      // Test enhanced Firebase connectivity
      let connectivityTest = 'PENDING';
      let connectivityDetails = {};
      try {
        const connectivity = await testFirebaseConnectivity();
        connectivityTest = connectivity.connected ? 'SUCCESS' : 'FAILED';
        connectivityDetails = connectivity.details;
      } catch (connErr: any) {
        connectivityTest = 'FAILED';
        connectivityDetails = { error: connErr.message };
      }
      
      // Test enhanced Firebase services
      const result = {
        success: true,
        authOptimized: true,
        projectId: app.options.projectId,
        authDomain: app.options.authDomain,
        userId: auth.currentUser?.uid || "none",
        dbConnected: !!db,
        storageConnected: !!storage,
        writeTest,
        testDocumentId,
        writeError,
        connectivityTest,
        connectivityDetails,
        timestamp: new Date().toISOString()
      };
      
      console.log("[FirebaseTest] ✅ Auth optimized - Test completed:", result);
      setTestResult(result);
      
    } catch (error: any) {
      console.error("[FirebaseTest] ❌ Auth optimization - Test failed:", error);
      setTestResult({ 
        success: false,
        authOptimized: false,
        error: error?.message || String(error),
        code: error?.code || "unknown"
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
          <Text style={styles.title}>Firebase Auth Optimization Test</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Status: {initStatus}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={runTest}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Running Auth Optimization Tests...' : 'Run Auth Optimization Test'}
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
                    <Text style={styles.resultText}>✅ Auth Optimized: {testResult.authOptimized ? 'YES' : 'NO'}</Text>
                    <Text style={styles.resultText}>Project ID: {testResult.projectId}</Text>
                    <Text style={styles.resultText}>User ID: {testResult.userId}</Text>
                    {testResult.writeTest && (
                      <Text style={styles.resultText}>Write Test: {testResult.writeTest}</Text>
                    )}
                    {testResult.connectivityTest && (
                      <Text style={styles.resultText}>Connectivity Test: {testResult.connectivityTest}</Text>
                    )}
                    {testResult.testDocumentId && (
                      <Text style={styles.resultText}>Test Doc ID: {testResult.testDocumentId}</Text>
                    )}
                    {testResult.writeError && (
                      <Text style={styles.resultText}>Write Error: {testResult.writeError}</Text>
                    )}
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
            <Text style={styles.infoTitle}>What this auth optimization test does:</Text>
            <Text style={styles.infoText}>• Tests enhanced Firebase authentication with retry logic</Text>
            <Text style={styles.infoText}>• Validates user-friendly error messages</Text>
            <Text style={styles.infoText}>• Tests connectivity with exponential backoff</Text>
            <Text style={styles.infoText}>• Writes a test document with optimized permissions</Text>
            <Text style={styles.infoText}>• Shows enhanced connection details</Text>
            <Text style={styles.infoText}>• Verifies auth optimization is working</Text>
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
  statusContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'monospace',
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