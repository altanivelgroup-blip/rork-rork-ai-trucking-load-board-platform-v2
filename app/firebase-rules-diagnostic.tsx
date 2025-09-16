import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

export default function FirebaseRulesDiagnosticScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    console.log(`[Rules Diagnostic] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStorageRules = async () => {
    if (!user) {
      addLog('❌ No authenticated user found');
      return;
    }

    addLog('🔍 Starting Storage Rules Diagnostic...');
    addLog(`👤 User ID: ${user.uid}`);
    addLog(`📧 User Email: ${user.email}`);

    try {
      // Test 1: Create a test image blob
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const response = await fetch(testImageData);
      const blob = await response.blob();
      addLog('✅ Test image blob created');

      // Test 2: Try uploading to different paths
      const testPaths = [
        `loadPhotos/${user.uid}/TEST-LOAD-${Date.now()}/test-image.jpg`,
        `loadPhotos/anonymous/TEST-LOAD-${Date.now()}/test-image.jpg`,
        `loadPhotos/test-path/test-image.jpg`
      ];

      for (const path of testPaths) {
        try {
          addLog(`🔄 Testing upload to: ${path}`);
          const storageRef = ref(storage, path);
          
          // Attempt upload
          const uploadResult = await uploadBytes(storageRef, blob);
          addLog(`✅ Upload successful to: ${path}`);
          
          // Test download URL generation
          const downloadURL = await getDownloadURL(uploadResult.ref);
          addLog(`✅ Download URL generated: ${downloadURL.substring(0, 50)}...`);
          
          // Test fetch from URL
          const fetchResponse = await fetch(downloadURL);
          if (fetchResponse.ok) {
            addLog(`✅ Fetch successful from URL`);
          } else {
            addLog(`❌ Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }
          
        } catch (error: any) {
          addLog(`❌ Upload failed to ${path}: ${error.message}`);
          addLog(`❌ Error code: ${error.code || 'unknown'}`);
        }
      }

    } catch (error: any) {
      addLog(`❌ Storage test failed: ${error.message}`);
    }
  };

  const testFirestoreRules = async () => {
    if (!user) {
      addLog('❌ No authenticated user found');
      return;
    }

    addLog('🔍 Starting Firestore Rules Diagnostic...');

    try {
      // Test photo metadata write
      const photoId = `test-photo-${Date.now()}`;
      const photoData = {
        userId: user.uid,
        loadId: 'TEST-LOAD',
        fileName: 'test-image.jpg',
        uploadedAt: new Date(),
        url: 'https://example.com/test.jpg'
      };

      // Test different paths
      const testPaths = [
        `photos/${photoId}`,
        `loadPhotos/${user.uid}/TEST-LOAD/metadata/${photoId}`
      ];

      for (const path of testPaths) {
        try {
          addLog(`🔄 Testing Firestore write to: ${path}`);
          await setDoc(doc(db, path), photoData);
          addLog(`✅ Firestore write successful to: ${path}`);
        } catch (error: any) {
          addLog(`❌ Firestore write failed to ${path}: ${error.message}`);
          addLog(`❌ Error code: ${error.code || 'unknown'}`);
        }
      }

    } catch (error: any) {
      addLog(`❌ Firestore test failed: ${error.message}`);
    }
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setLogs([]);
    
    addLog('🚀 Starting Full Firebase Rules Diagnostic');
    addLog('='.repeat(50));
    
    await testStorageRules();
    addLog('='.repeat(50));
    await testFirestoreRules();
    addLog('='.repeat(50));
    addLog('✅ Diagnostic complete');
    
    setIsRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logText = logs.join('\\n');
    if (Platform.OS === 'web') {
      console.log('=== DIAGNOSTIC LOGS ===');
      console.log(logText);
      addLog('📋 Logs copied to console (check browser dev tools)');
    } else {
      console.log('=== DIAGNOSTIC LOGS ===');
      console.log(logText);
      addLog('📋 Logs copied to console');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Firebase Rules Diagnostic</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runFullDiagnostic}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running...' : 'Run Full Diagnostic'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={clearLogs}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={copyLogs}
        >
          <Text style={styles.buttonText}>Copy Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={`log-${index}-${log.substring(0, 10)}`} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  logText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
  },
});