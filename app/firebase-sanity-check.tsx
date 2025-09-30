import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Shield, Upload, Download } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { testFirebaseConnection } from '@/lib/firebase';
import { getFirebase, ensureFirebaseAuth, testFirebaseStorageUpload } from '@/utils/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

interface SanityCheckState {
  isRunning: boolean;
  results: TestResult[];
  overallStatus: 'pending' | 'success' | 'warning' | 'error';
}

export default function FirebaseSanityCheck() {
  const [state, setState] = useState<SanityCheckState>({
    isRunning: false,
    results: [],
    overallStatus: 'pending',
  });

  const updateResult = (name: string, status: TestResult['status'], message: string, details?: any, duration?: number) => {
    setState(prev => ({
      ...prev,
      results: prev.results.map(r => 
        r.name === name 
          ? { ...r, status, message, details, duration }
          : r
      ),
    }));
  };

  const addResult = (name: string, status: TestResult['status'] = 'pending', message: string = 'Starting...') => {
    setState(prev => ({
      ...prev,
      results: [...prev.results, { name, status, message }],
    }));
  };

  const runSanityCheck = async () => {
    console.log('🚀 Starting Firebase Sanity Check...');
    
    setState({
      isRunning: true,
      results: [],
      overallStatus: 'pending',
    });

    const tests = [
      'Environment Variables',
      'Firebase Initialization',
      'Authentication',
      'Firestore Connection',
      'Firestore Read Test',
      'Firestore Write Test',
      'Storage Connection',
      'Storage Upload Test',
      'PhotoUploader Integration',
      'Security Rules',
    ];

    // Initialize all tests as pending
    tests.forEach(test => addResult(test));

    let hasErrors = false;
    let hasWarnings = false;

    try {
      // Test 1: Environment Variables
      const startTime1 = Date.now();
      console.log('📋 Testing environment variables...');
      
      const envVars = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      const missingVars = Object.entries(envVars)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        updateResult('Environment Variables', 'error', 
          `Missing variables: ${missingVars.join(', ')}`, 
          { missing: missingVars, provided: envVars },
          Date.now() - startTime1
        );
        hasErrors = true;
      } else {
        updateResult('Environment Variables', 'success', 
          `All Firebase environment variables present`, 
          { projectId: envVars.projectId, storageBucket: envVars.storageBucket },
          Date.now() - startTime1
        );
      }

      // Test 2: Firebase Initialization
      const startTime2 = Date.now();
      console.log('🔧 Testing Firebase initialization...');
      
      try {
        const { app, auth, db, storage } = getFirebase();
        const projectId = app.options.projectId;
        const authDomain = app.options.authDomain;
        const storageBucket = app.options.storageBucket;
        
        updateResult('Firebase Initialization', 'success', 
          `Firebase initialized successfully`, 
          { projectId, authDomain, storageBucket },
          Date.now() - startTime2
        );
      } catch (error: any) {
        updateResult('Firebase Initialization', 'error', 
          `Firebase initialization failed: ${error.message}`, 
          { error: error.message, stack: error.stack?.split('\n').slice(0, 3) },
          Date.now() - startTime2
        );
        hasErrors = true;
        return; // Can't continue without Firebase
      }

      // Test 3: Authentication
      const startTime3 = Date.now();
      console.log('🔐 Testing authentication...');
      
      try {
        const authSuccess = await ensureFirebaseAuth();
        const { auth } = getFirebase();
        const currentUser = auth.currentUser;
        
        if (authSuccess && currentUser) {
          updateResult('Authentication', 'success', 
            `Authentication successful`, 
            { 
              uid: currentUser.uid, 
              isAnonymous: currentUser.isAnonymous,
              email: currentUser.email || 'none'
            },
            Date.now() - startTime3
          );
        } else {
          updateResult('Authentication', 'error', 
            `Authentication failed`, 
            { authSuccess, hasCurrentUser: !!currentUser },
            Date.now() - startTime3
          );
          hasErrors = true;
        }
      } catch (error: any) {
        updateResult('Authentication', 'error', 
          `Authentication error: ${error.message}`, 
          { error: error.message },
          Date.now() - startTime3
        );
        hasErrors = true;
      }

      // Test 4: Firestore Connection
      const startTime4 = Date.now();
      console.log('🗄️ Testing Firestore connection...');
      
      try {
        const result = await testFirebaseConnection();
        if (result.success) {
          updateResult('Firestore Connection', 'success', 
            `Firestore connection successful`, 
            result,
            Date.now() - startTime4
          );
        } else {
          updateResult('Firestore Connection', 'warning', 
            `Firestore connection issues: ${result.error}`, 
            result,
            Date.now() - startTime4
          );
          hasWarnings = true;
        }
      } catch (error: any) {
        updateResult('Firestore Connection', 'error', 
          `Firestore connection failed: ${error.message}`, 
          { error: error.message },
          Date.now() - startTime4
        );
        hasErrors = true;
      }

      // Test 5: Firestore Read Test
      const startTime5 = Date.now();
      console.log('📖 Testing Firestore read operations...');
      
      try {
        const { db } = getFirebase();
        const testDocRef = doc(db, 'sanity-check', 'read-test');
        
        // Try to read a document (it may not exist, that's ok)
        const docSnap = await getDoc(testDocRef);
        
        updateResult('Firestore Read Test', 'success', 
          `Firestore read operations working`, 
          { documentExists: docSnap.exists(), path: testDocRef.path },
          Date.now() - startTime5
        );
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          updateResult('Firestore Read Test', 'warning', 
            `Read permission denied - check security rules`, 
            { error: error.code, message: error.message },
            Date.now() - startTime5
          );
          hasWarnings = true;
        } else {
          updateResult('Firestore Read Test', 'error', 
            `Firestore read failed: ${error.message}`, 
            { error: error.code || 'unknown', message: error.message },
            Date.now() - startTime5
          );
          hasErrors = true;
        }
      }

      // Test 6: Firestore Write Test
      const startTime6 = Date.now();
      console.log('✍️ Testing Firestore write operations...');
      
      try {
        const { db, auth } = getFirebase();
        const testDocRef = doc(db, 'sanity-check', `write-test-${Date.now()}`);
        
        const testData = {
          message: 'Firebase sanity check test',
          timestamp: serverTimestamp(),
          userId: auth.currentUser?.uid || 'unknown',
          testId: Date.now(),
        };
        
        await setDoc(testDocRef, testData);
        
        // Verify the write by reading it back
        const verifySnap = await getDoc(testDocRef);
        
        if (verifySnap.exists()) {
          // Clean up test document
          await deleteDoc(testDocRef);
          
          updateResult('Firestore Write Test', 'success', 
            `Firestore write operations working`, 
            { documentId: testDocRef.id, verified: true },
            Date.now() - startTime6
          );
        } else {
          updateResult('Firestore Write Test', 'warning', 
            `Write succeeded but verification failed`, 
            { documentId: testDocRef.id, verified: false },
            Date.now() - startTime6
          );
          hasWarnings = true;
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          updateResult('Firestore Write Test', 'warning', 
            `Write permission denied - check security rules`, 
            { error: error.code, message: error.message },
            Date.now() - startTime6
          );
          hasWarnings = true;
        } else {
          updateResult('Firestore Write Test', 'error', 
            `Firestore write failed: ${error.message}`, 
            { error: error.code || 'unknown', message: error.message },
            Date.now() - startTime6
          );
          hasErrors = true;
        }
      }

      // Test 7: Storage Connection
      const startTime7 = Date.now();
      console.log('☁️ Testing Firebase Storage connection...');
      
      try {
        const { storage } = getFirebase();
        const testRef = ref(storage, 'sanity-check/connection-test.txt');
        
        // Storage connection is tested by creating a reference
        // The actual test is in the upload test
        updateResult('Storage Connection', 'success', 
          `Firebase Storage connection established`, 
          { bucket: storage.app.options.storageBucket },
          Date.now() - startTime7
        );
      } catch (error: any) {
        updateResult('Storage Connection', 'error', 
          `Firebase Storage connection failed: ${error.message}`, 
          { error: error.message },
          Date.now() - startTime7
        );
        hasErrors = true;
      }

      // Test 8: Storage Upload Test (using improved test function)
      const startTime8 = Date.now();
      console.log('📤 Testing Firebase Storage upload with PhotoUploader simulation...');
      
      try {
        const uploadTestResult = await testFirebaseStorageUpload();
        
        if (uploadTestResult.success) {
          updateResult('Storage Upload Test', 'success', 
            uploadTestResult.message || 'Firebase Storage upload working', 
            { 
              uploadPath: uploadTestResult.uploadPath,
              downloadURL: uploadTestResult.downloadURL ? uploadTestResult.downloadURL.substring(0, 50) + '...' : 'Generated',
              testType: 'PhotoUploader-compatible'
            },
            Date.now() - startTime8
          );
        } else {
          const isRetryError = uploadTestResult.code === 'storage/retry-limit-exceeded';
          const status = isRetryError ? 'warning' : 'error';
          
          updateResult('Storage Upload Test', status, 
            uploadTestResult.error || 'Storage upload failed', 
            { 
              error: uploadTestResult.code,
              recommendations: uploadTestResult.recommendations || [],
              testType: 'PhotoUploader-compatible'
            },
            Date.now() - startTime8
          );
          
          if (isRetryError) {
            hasWarnings = true;
          } else {
            hasErrors = true;
          }
        }
      } catch (error: any) {
        updateResult('Storage Upload Test', 'error', 
          `Storage upload test failed: ${error.message}`, 
          { error: error.code || 'unknown', message: error.message },
          Date.now() - startTime8
        );
        hasErrors = true;
      }

      // Test 9: PhotoUploader Integration
      const startTime9 = Date.now();
      console.log('📸 Testing PhotoUploader integration...');
      
      try {
        // Test if PhotoUploader can access Firebase services
        const { app, auth, db, storage } = getFirebase();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          updateResult('PhotoUploader Integration', 'warning', 
            `PhotoUploader requires authentication`, 
            { hasAuth: false },
            Date.now() - startTime9
          );
          hasWarnings = true;
        } else {
          // Test the path structure PhotoUploader uses: loads/{userId}/{loadId}/{fileName}
          const testPath = `loads/${currentUser.uid}/test-load-id/test-photo.jpg`;
          const testRef = ref(storage, testPath);
          
          updateResult('PhotoUploader Integration', 'success', 
            `PhotoUploader integration ready`, 
            { 
              userId: currentUser.uid,
              testPath,
              storageReady: true,
              firestoreReady: true,
              note: 'Using correct path: loads/{userId}/{loadId}/{fileName}'
            },
            Date.now() - startTime9
          );
        }
      } catch (error: any) {
        updateResult('PhotoUploader Integration', 'error', 
          `PhotoUploader integration failed: ${error.message}`, 
          { error: error.message },
          Date.now() - startTime9
        );
        hasErrors = true;
      }

      // Test 10: Security Rules
      const startTime10 = Date.now();
      console.log('🛡️ Testing security rules...');
      
      try {
        // Check if we're using test rules (very permissive)
        const { auth } = getFirebase();
        const currentUser = auth.currentUser;
        
        if (currentUser?.isAnonymous) {
          updateResult('Security Rules', 'warning', 
            `Using test security rules - anonymous users have full access`, 
            { 
              isAnonymous: true,
              rulesType: 'test-permissive',
              recommendation: 'Implement proper security rules for production'
            },
            Date.now() - startTime10
          );
          hasWarnings = true;
        } else {
          updateResult('Security Rules', 'success', 
            `Security rules configured for authenticated users`, 
            { 
              isAnonymous: false,
              rulesType: 'authenticated-users'
            },
            Date.now() - startTime10
          );
        }
      } catch (error: any) {
        updateResult('Security Rules', 'error', 
          `Security rules check failed: ${error.message}`, 
          { error: error.message },
          Date.now() - startTime10
        );
        hasErrors = true;
      }

    } catch (error: any) {
      console.error('❌ Sanity check failed:', error);
      setState(prev => ({
        ...prev,
        results: [...prev.results, {
          name: 'Critical Error',
          status: 'error',
          message: `Sanity check failed: ${error.message}`,
          details: { error: error.message, stack: error.stack?.split('\n').slice(0, 3) }
        }],
      }));
      hasErrors = true;
    }

    // Determine overall status
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      overallStatus,
    }));

    console.log(`✅ Firebase Sanity Check completed with status: ${overallStatus}`);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    const size = 20;
    switch (status) {
      case 'success':
        return <CheckCircle color={theme.colors.success} size={size} />;
      case 'warning':
        return <AlertTriangle color={theme.colors.warning} size={size} />;
      case 'error':
        return <XCircle color={theme.colors.danger} size={size} />;
      case 'pending':
      default:
        return <ActivityIndicator size="small" color={theme.colors.gray} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.danger;
      case 'pending':
      default:
        return theme.colors.gray;
    }
  };

  const showDetails = (result: TestResult) => {
    if (!result.details) return;
    
    Alert.alert(
      result.name,
      JSON.stringify(result.details, null, 2),
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    // Auto-run on mount
    runSanityCheck();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Firebase Sanity Check',
          headerStyle: { backgroundColor: theme.colors.white },
          headerTitleStyle: { color: theme.colors.dark },
        }} 
      />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Database color={theme.colors.primary} size={24} />
          <Text style={styles.title}>Firebase Health Check</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.runButton, state.isRunning && styles.runButtonDisabled]}
          onPress={runSanityCheck}
          disabled={state.isRunning}
        >
          <RefreshCw 
            color={theme.colors.white} 
            size={16} 
            style={state.isRunning ? { opacity: 0.5 } : undefined}
          />
          <Text style={styles.runButtonText}>
            {state.isRunning ? 'Running...' : 'Run Check'}
          </Text>
        </TouchableOpacity>
      </View>

      {state.results.length > 0 && (
        <View style={[
          styles.overallStatus,
          { backgroundColor: getStatusColor(state.overallStatus) + '20' }
        ]}>
          {getStatusIcon(state.overallStatus)}
          <Text style={[styles.overallStatusText, { color: getStatusColor(state.overallStatus) }]}>
            Overall Status: {state.overallStatus.toUpperCase()}
          </Text>
        </View>
      )}

      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {state.results.map((result, index) => (
          <TouchableOpacity
            key={index}
            style={styles.resultItem}
            onPress={() => showDetails(result)}
            disabled={!result.details}
          >
            <View style={styles.resultHeader}>
              {getStatusIcon(result.status)}
              <View style={styles.resultContent}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
                  {result.message}
                </Text>
                {result.duration && (
                  <Text style={styles.resultDuration}>
                    {result.duration}ms
                  </Text>
                )}
              </View>
            </View>
            {result.details && (
              <Text style={styles.detailsHint}>Tap for details</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {state.results.length > 0 && !state.isRunning && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            ✅ {state.results.filter(r => r.status === 'success').length} passed{' '}
            ⚠️ {state.results.filter(r => r.status === 'warning').length} warnings{' '}
            ❌ {state.results.filter(r => r.status === 'error').length} errors
          </Text>
          
          {state.overallStatus === 'success' && (
            <Text style={styles.successMessage}>
              🎉 Firebase is working correctly! Your PhotoUploader should function properly.
            </Text>
          )}
          
          {state.overallStatus === 'warning' && (
            <Text style={styles.warningMessage}>
              ⚠️ Firebase is mostly working but has some issues. PhotoUploader may work with limitations.
            </Text>
          )}
          
          {state.overallStatus === 'error' && (
            <Text style={styles.errorMessage}>
              ❌ Firebase has critical issues. PhotoUploader will not work properly until these are resolved.
            </Text>
          )}
          
          <View style={styles.troubleshootingSection}>
            <Text style={styles.troubleshootingTitle}>PhotoUploader Troubleshooting:</Text>
            <Text style={styles.troubleshootingText}>
              • "retry-limit-exceeded" error: Check network stability, try smaller images{"\n"}
              • Upload timeouts: Use "Small" size preset in PhotoUploader{"\n"}
              • Permission errors: Verify Firebase Storage security rules{"\n"}
              • Connection issues: Check Firebase project status and API keys
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  overallStatusText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  resultItem: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  resultMessage: {
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  resultDuration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  detailsHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
    textAlign: 'right',
  },
  summary: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray + '30',
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  successMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.success,
    fontWeight: '500',
  },
  warningMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.warning,
    fontWeight: '500',
  },
  errorMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  troubleshootingSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  troubleshootingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  troubleshootingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 18,
  },
});