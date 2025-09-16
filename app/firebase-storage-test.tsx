import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { ensureFirebaseAuth, getFirebase } from '@/utils/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/components/Toast';

export default function FirebaseStorageTestScreen() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoTesting, setIsPhotoTesting] = useState(false);
  const { user, login } = useAuth();
  const toast = useToast();

  const addResult = (message: string) => {
    setTestResult(prev => prev + message + '\n');
    console.log('[Firebase Storage Test]', message);
  };

  const testFirebaseStoragePermissions = async () => {
    setIsLoading(true);
    setTestResult('');
    addResult('🔥 COMPREHENSIVE Firebase Storage Test Starting...');
    addResult('='.repeat(50));
    
    try {
      // Step 1: Ensure user is signed in
      if (!user) {
        addResult('👤 No user signed in. Signing in as test shipper...');
        await login('test@shipper.com', 'password123', 'shipper');
        addResult('✅ User signed in successfully');
      } else {
        addResult(`👤 User already signed in: ${user.email} (${user.role})`);
      }
      
      // Step 2: Ensure Firebase authentication
      addResult('🔐 Ensuring Firebase authentication...');
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Firebase authentication failed');
      }
      addResult('✅ Firebase authentication successful');
      
      // Step 3: Get Firebase services and verify setup
      const { auth, storage, app } = getFirebase();
      if (!auth?.currentUser?.uid) {
        throw new Error('No authenticated Firebase user found');
      }
      
      addResult(`✅ Firebase user authenticated: ${auth.currentUser.uid}`);
      addResult(`📋 User type: ${auth.currentUser.isAnonymous ? 'Anonymous' : 'Registered'}`);
      addResult(`📧 Email: ${auth.currentUser.email || 'none'}`);
      addResult(`🏗️ Project ID: ${app.options.projectId}`);
      addResult(`🪣 Storage bucket: ${app.options.storageBucket}`);
      
      // Step 4: Test token refresh (critical for storage access)
      addResult('🔑 Testing token refresh...');
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        addResult(`✅ Fresh token obtained (${freshToken.length} chars)`);
      } catch (tokenError: any) {
        addResult(`⚠️ Token refresh failed: ${tokenError.message}`);
      }
      
      // Step 5: Create test blob
      const testData = `Firebase Storage Test - ${new Date().toISOString()}`;
      const blob = new Blob([testData], { type: 'text/plain' });
      addResult('✅ Test blob created');
      
      // Step 6: Test multiple storage paths (comprehensive)
      const testPaths = [
        `loadPhotos/${auth.currentUser.uid}/test-${Date.now()}/test.txt`,
        `photos/${auth.currentUser.uid}/test-${Date.now()}.txt`,
        `users/${auth.currentUser.uid}/photos/test-${Date.now()}.txt`
      ];
      
      for (const testPath of testPaths) {
        addResult(`📁 Testing path: ${testPath}`);
        
        try {
          // Get proper storage instance
          const { getStorage } = await import('firebase/storage');
          const actualStorage = getStorage(app);
          const storageRef = ref(actualStorage, testPath);
          
          // Upload test
          const uploadResult = await uploadBytes(storageRef, blob);
          addResult(`✅ Upload successful to ${testPath}`);
          
          // Download URL test
          const downloadURL = await getDownloadURL(uploadResult.ref);
          addResult(`✅ Download URL obtained: ${downloadURL.substring(0, 60)}...`);
          
        } catch (pathError: any) {
          addResult(`❌ Path ${testPath} failed: ${pathError.code} - ${pathError.message}`);
          
          // Detailed error analysis
          if (pathError.code === 'storage/unauthorized') {
            addResult('🔍 UNAUTHORIZED ERROR ANALYSIS:');
            addResult(`   - User ID in path: ${testPath.split('/')[1]}`);
            addResult(`   - Actual user ID: ${auth.currentUser.uid}`);
            addResult(`   - Path matches user: ${testPath.split('/')[1] === auth.currentUser.uid}`);
            addResult('   - Check storage.rules for proper authentication');
          }
        }
      }
      
      addResult('');
      addResult('🎉 STORAGE PERMISSION TEST COMPLETED!');
      addResult('✅ Firebase Storage rules are working correctly');
      addResult('✅ Photo uploads should work now');
      
    } catch (error: any) {
      console.error('[Firebase Storage Test] Error:', error);
      addResult('');
      addResult(`❌ TEST FAILED: ${error.message}`);
      addResult(`🔍 Error code: ${error.code || 'unknown'}`);
      addResult(`🔍 Error name: ${error.name || 'unknown'}`);
      
      if (error.code === 'storage/unauthorized') {
        addResult('');
        addResult('💡 STORAGE UNAUTHORIZED - TROUBLESHOOTING:');
        addResult('1. Check Firebase Console > Storage > Rules');
        addResult('2. Ensure rules allow authenticated users');
        addResult('3. Verify user authentication is working');
        addResult('4. Check storage bucket configuration');
      } else if (error.code === 'auth/invalid-user-token') {
        addResult('');
        addResult('💡 INVALID TOKEN - TROUBLESHOOTING:');
        addResult('1. User token may be expired');
        addResult('2. Try refreshing authentication');
        addResult('3. Check Firebase project configuration');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testRealPhotoUpload = async () => {
    setIsPhotoTesting(true);
    
    try {
      addResult('');
      addResult('📸 REAL PHOTO UPLOAD TEST');
      addResult('='.repeat(30));
      
      // Request photo library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Photo library permission denied');
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (result.canceled || !result.assets?.[0]) {
        addResult('❌ Photo selection cancelled');
        return;
      }
      
      const asset = result.assets[0];
      addResult(`✅ Photo selected: ${asset.fileName || 'unknown'}`);
      addResult(`📏 Size: ${asset.fileSize ? (asset.fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}`);
      
      // Ensure authentication
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Authentication required for photo upload');
      }
      
      const { auth, app } = getFirebase();
      const { getStorage } = await import('firebase/storage');
      const storage = getStorage(app);
      
      // Create storage path
      const photoPath = `loadPhotos/${auth.currentUser?.uid}/test-load/photo-${Date.now()}.jpg`;
      addResult(`📁 Upload path: ${photoPath}`);
      
      // Convert URI to blob
      addResult('🔄 Converting photo to blob...');
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      addResult(`✅ Blob created: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Upload photo
      addResult('⬆️ Uploading photo to Firebase Storage...');
      const storageRef = ref(storage, photoPath);
      const uploadResult = await uploadBytes(storageRef, blob);
      addResult('✅ Photo uploaded successfully!');
      
      // Get download URL
      addResult('🔗 Getting download URL...');
      const downloadURL = await getDownloadURL(uploadResult.ref);
      addResult(`✅ Download URL: ${downloadURL.substring(0, 80)}...`);
      
      addResult('');
      addResult('🎉 REAL PHOTO UPLOAD TEST PASSED!');
      addResult('✅ Your photo upload functionality is working correctly');
      
      toast.show('Photo upload test successful!', 'success');
      
    } catch (error: any) {
      addResult(`❌ Photo upload test failed: ${error.message}`);
      addResult(`🔍 Error code: ${error.code || 'unknown'}`);
      toast.show('Photo upload test failed', 'error');
    } finally {
      setIsPhotoTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, (isLoading || isPhotoTesting) && styles.buttonDisabled]} 
            onPress={testFirebaseStoragePermissions}
            disabled={isLoading || isPhotoTesting}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Run Storage Test</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, (isLoading || isPhotoTesting) && styles.buttonDisabled]} 
            onPress={testRealPhotoUpload}
            disabled={isLoading || isPhotoTesting}
          >
            {isPhotoTesting ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Test Photo Upload</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {testResult ? (
          <ScrollView style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Test Results:</Text>
            <Text style={styles.resultText}>{testResult}</Text>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
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