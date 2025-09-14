import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { ensureFirebaseAuth, getFirebase } from '@/utils/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';

export default function FirebaseStorageTestScreen() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();

  const testFirebaseStoragePermissions = async () => {
    setIsLoading(true);
    setTestResult('Testing Firebase Storage permissions...\n');
    
    try {
      // Step 1: Ensure user is signed in
      if (!user) {
        setTestResult(prev => prev + 'No user signed in. Signing in as test shipper...\n');
        await login('test@shipper.com', 'password123', 'shipper');
        setTestResult(prev => prev + '✅ User signed in successfully\n');
      }
      
      // Step 2: Ensure Firebase authentication
      setTestResult(prev => prev + 'Ensuring Firebase authentication...\n');
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      setTestResult(prev => prev + '✅ Firebase authentication successful\n');
      
      // Step 3: Get Firebase services
      const { auth, storage } = getFirebase();
      if (!auth?.currentUser?.uid) {
        throw new Error('No authenticated Firebase user found');
      }
      setTestResult(prev => prev + `✅ Firebase user authenticated: ${auth.currentUser.uid}\n`);
      
      // Step 4: Create a test blob
      const testData = 'This is a test file for Firebase Storage permissions';
      const blob = new Blob([testData], { type: 'text/plain' });
      setTestResult(prev => prev + '✅ Test blob created\n');
      
      // Step 5: Try to upload to Firebase Storage
      const testPath = `loadPhotos/${auth.currentUser.uid}/test-${Date.now()}/test.txt`;
      setTestResult(prev => prev + `Uploading to path: ${testPath}\n`);
      
      const storageRef = ref(storage, testPath);
      const uploadResult = await uploadBytes(storageRef, blob);
      setTestResult(prev => prev + '✅ File uploaded successfully\n');
      
      // Step 6: Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      setTestResult(prev => prev + `✅ Download URL obtained: ${downloadURL.substring(0, 50)}...\n`);
      
      setTestResult(prev => prev + '\n🎉 ALL TESTS PASSED! Firebase Storage is working correctly.\n');
      
    } catch (error: any) {
      console.error('[Firebase Storage Test] Error:', error);
      setTestResult(prev => prev + `\n❌ TEST FAILED: ${error.message}\n`);
      setTestResult(prev => prev + `Error code: ${error.code || 'unknown'}\n`);
      
      if (error.code === 'storage/unauthorized') {
        setTestResult(prev => prev + '\n💡 This indicates a Firebase Storage rules issue.\n');
        setTestResult(prev => prev + 'Check that storage.rules allows authenticated users to write to loadPhotos/**\n');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Firebase Storage Test',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
        }} 
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Firebase Storage Permission Test</Text>
        <Text style={styles.subtitle}>
          This test verifies that Firebase Storage permissions are working correctly for photo uploads.
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testFirebaseStoragePermissions}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Storage Test'}
          </Text>
        </TouchableOpacity>
        
        {testResult ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Test Results:</Text>
            <Text style={styles.resultText}>{testResult}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  resultContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flex: 1,
  },
  resultTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});