import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
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
      const authReady = await ensureFirebaseAuth();
      if (authReady) {
        const { app, auth } = getFirebase();
        setInitStatus(`✅ Ready - Project: ${app.options.projectId}, User: ${auth.currentUser?.uid || 'none'}`);
      } else {
        setInitStatus("❌ Auth failed");
      }
    } catch (error) {
      setInitStatus(`❌ Error: ${error}`);
    }
  };

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log("[FirebaseTest] Starting test...");
      
      // Test Firebase initialization
      const authReady = await ensureFirebaseAuth();
      if (!authReady) {
        throw new Error("Firebase auth not ready");
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
      
      // Test basic Firebase services
      const result = {
        success: true,
        projectId: app.options.projectId,
        authDomain: app.options.authDomain,
        userId: auth.currentUser?.uid || "none",
        dbConnected: !!db,
        storageConnected: !!storage,
        writeTest,
        testDocumentId,
        writeError,
        timestamp: new Date().toISOString()
      };
      
      console.log("[FirebaseTest] Test completed:", result);
      setTestResult(result);
      
    } catch (error: any) {
      console.error("[FirebaseTest] Test failed:", error);
      setTestResult({ 
        success: false, 
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
          <Text style={styles.title}>Firebase Connection Test</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Status: {initStatus}</Text>
          </View>
          
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
                    {testResult.writeTest && (
                      <Text style={styles.resultText}>Write Test: {testResult.writeTest}</Text>
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
            <Text style={styles.infoTitle}>What this test does:</Text>
            <Text style={styles.infoText}>• Initializes Firebase services</Text>
            <Text style={styles.infoText}>• Tests authentication</Text>
            <Text style={styles.infoText}>• Queries the &apos;loads&apos; collection</Text>
            <Text style={styles.infoText}>• Writes a test document</Text>
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