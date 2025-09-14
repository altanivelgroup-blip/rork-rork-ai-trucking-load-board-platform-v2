import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, Upload } from 'lucide-react-native';

import { getFirebase, ensureFirebaseAuth, testFirebaseConnectivity } from '@/utils/firebase';
import { theme } from '@/constants/theme';
import { useToast } from '@/components/Toast';

export default function ProductionFirebaseTestScreen() {
  const router = useRouter();
  const toast = useToast();
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runProductionTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('[PROD_TEST] 🚀 Starting production Firebase test...');
      
      // Test 1: Firebase initialization
      const { app, auth, db, storage } = getFirebase();
      const initResults = {
        app: !!app,
        auth: !!auth,
        db: !!db,
        storage: !!storage,
        projectId: app?.options?.projectId,
        storageBucket: app?.options?.storageBucket,
      };
      
      // Test 2: Authentication
      console.log('[PROD_TEST] Testing authentication...');
      const authSuccess = await ensureFirebaseAuth();
      
      // Test 3: Connectivity
      console.log('[PROD_TEST] Testing connectivity...');
      const connectivity = await testFirebaseConnectivity();
      
      // Test 4: Storage type check
      const storageType = storage?.constructor?.name || 'Unknown';
      const isRealStorage = storageType.includes('Storage') && !storageType.includes('Mock');
      
      const results = {
        initialization: initResults,
        authentication: {
          success: authSuccess,
          currentUser: auth?.currentUser ? {
            uid: auth.currentUser.uid,
            isAnonymous: auth.currentUser.isAnonymous,
          } : null,
        },
        connectivity,
        storage: {
          type: storageType,
          isProduction: isRealStorage,
          bucket: app?.options?.storageBucket,
        },
        timestamp: new Date().toISOString(),
      };
      
      setTestResults(results);
      
      if (authSuccess && connectivity.connected && isRealStorage) {
        toast.show('✅ Production Firebase is working correctly!', 'success');
      } else {
        toast.show('⚠️ Some Firebase services may not be fully configured', 'warning');
      }
      
    } catch (error: any) {
      console.error('[PROD_TEST] Test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      toast.show('❌ Production Firebase test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const renderTestResult = (label: string, value: any, isGood?: boolean) => {
    const icon = isGood === true ? 
      <CheckCircle color={theme.colors.success} size={16} /> : 
      isGood === false ? 
      <XCircle color={theme.colors.danger} size={16} /> : 
      null;
    
    return (
      <View style={styles.resultRow} key={label}>
        <Text style={styles.resultLabel}>{label}:</Text>
        <View style={styles.resultValue}>
          <Text>{icon}</Text>
          <Text style={[styles.resultText, isGood === false && styles.errorText]}>
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Production Firebase Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Production Firebase Configuration Test</Text>
          <Text style={styles.description}>
            This test verifies that Firebase has been successfully switched to production mode with real Storage.
          </Text>
          
          <TouchableOpacity 
            style={[styles.testButton, testing && styles.testButtonDisabled]} 
            onPress={runProductionTest}
            disabled={testing}
          >
            <Upload color={theme.colors.white} size={20} />
            <Text style={styles.testButtonText}>
              {testing ? 'Testing Production Firebase...' : 'Run Production Test'}
            </Text>
          </TouchableOpacity>
        </View>

        {testResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Test Results</Text>
            
            {testResults.error ? (
              <View style={styles.errorContainer}>
                <XCircle color={theme.colors.danger} size={20} />
                <Text style={styles.errorText}>{testResults.error}</Text>
              </View>
            ) : (
              <View style={styles.resultsContainer}>
                {/* Initialization Results */}
                <Text style={styles.subsectionTitle}>🚀 Initialization</Text>
                {renderTestResult('Project ID', testResults.initialization?.projectId, !!testResults.initialization?.projectId)}
                {renderTestResult('Storage Bucket', testResults.initialization?.storageBucket, !!testResults.initialization?.storageBucket)}
                {renderTestResult('App Initialized', testResults.initialization?.app, testResults.initialization?.app)}
                {renderTestResult('Auth Initialized', testResults.initialization?.auth, testResults.initialization?.auth)}
                {renderTestResult('Firestore Initialized', testResults.initialization?.db, testResults.initialization?.db)}
                {renderTestResult('Storage Initialized', testResults.initialization?.storage, testResults.initialization?.storage)}
                
                {/* Storage Type */}
                <Text style={styles.subsectionTitle}>💾 Storage Configuration</Text>
                {renderTestResult('Storage Type', testResults.storage?.type)}
                {renderTestResult('Is Production Storage', testResults.storage?.isProduction, testResults.storage?.isProduction)}
                {renderTestResult('Storage Bucket', testResults.storage?.bucket, !!testResults.storage?.bucket)}
                
                {/* Authentication */}
                <Text style={styles.subsectionTitle}>🔐 Authentication</Text>
                {renderTestResult('Auth Success', testResults.authentication?.success, testResults.authentication?.success)}
                {testResults.authentication?.currentUser && (
                  <>
                    {renderTestResult('User ID', testResults.authentication.currentUser.uid, !!testResults.authentication.currentUser.uid)}
                    {renderTestResult('Is Anonymous', testResults.authentication.currentUser.isAnonymous)}
                  </>
                )}
                
                {/* Connectivity */}
                <Text style={styles.subsectionTitle}>🌐 Connectivity</Text>
                {renderTestResult('Overall Connected', testResults.connectivity?.connected, testResults.connectivity?.connected)}
                {renderTestResult('Network Online', testResults.connectivity?.details?.networkOnline, testResults.connectivity?.details?.networkOnline)}
                {renderTestResult('Firebase Reachable', testResults.connectivity?.details?.firebaseReachable, testResults.connectivity?.details?.firebaseReachable)}
                {renderTestResult('Auth Working', testResults.connectivity?.details?.authWorking, testResults.connectivity?.details?.authWorking)}
                {renderTestResult('Firestore Working', testResults.connectivity?.details?.firestoreWorking, testResults.connectivity?.details?.firestoreWorking)}
              </View>
            )}
            
            <Text style={styles.timestamp}>
              Test completed: {new Date(testResults.timestamp).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Expected Production Results</Text>
          <Text style={styles.description}>
            For a successful production configuration, you should see:
          </Text>
          <Text style={styles.checklistItem}>• Project ID: rork-prod</Text>
          <Text style={styles.checklistItem}>• Storage Bucket: rork-prod.firebasestorage.app</Text>
          <Text style={styles.checklistItem}>• Is Production Storage: true</Text>
          <Text style={styles.checklistItem}>• Auth Success: true</Text>
          <Text style={styles.checklistItem}>• Overall Connected: true</Text>
          <Text style={styles.checklistItem}>• Storage Type: Not containing &apos;Mock&apos;</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  subsectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  testButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  testButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  resultsContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  resultLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    width: 120,
    flexShrink: 0,
  },
  resultValue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: theme.spacing.xs,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    flex: 1,
  },
  errorText: {
    color: theme.colors.danger,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  timestamp: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  checklistItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.md,
  },
});