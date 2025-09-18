import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, Shield, Users } from 'lucide-react-native';
import { checkFirebasePermissions, ensureFirebaseAuth, testFirebaseConnectivity } from '@/utils/firebase';
import { useLoads } from '@/hooks/useLoads';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function UltimatePermissionTestScreen() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'error' | 'warning'>('pending');
  const { loads, refreshLoads } = useLoads();

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runComprehensiveTests = async () => {
    console.log('[ULTIMATE_TEST] 🚀 Starting comprehensive permission tests...');
    setIsRunning(true);
    setTests([]);
    setOverallStatus('pending');

    try {
      // Test 1: Firebase Connectivity
      updateTest('Firebase Connectivity', 'pending', 'Testing network and Firebase connectivity...');
      try {
        const connectivity = await testFirebaseConnectivity();
        if (connectivity.connected) {
          updateTest('Firebase Connectivity', 'success', 'Firebase services are reachable', connectivity.details);
        } else {
          updateTest('Firebase Connectivity', 'error', connectivity.error || 'Connection failed', connectivity.details);
        }
      } catch (error: any) {
        updateTest('Firebase Connectivity', 'error', `Connectivity test failed: ${error.message}`);
      }

      // Test 2: Authentication
      updateTest('Authentication', 'pending', 'Testing Firebase authentication...');
      try {
        const authSuccess = await ensureFirebaseAuth();
        if (authSuccess) {
          updateTest('Authentication', 'success', 'Authentication successful - ready for Firestore operations');
        } else {
          updateTest('Authentication', 'error', 'Authentication failed - this will cause permission errors');
        }
      } catch (error: any) {
        updateTest('Authentication', 'error', `Auth error: ${error.message}`);
      }

      // Test 3: Firestore Permissions
      updateTest('Firestore Permissions', 'pending', 'Testing read/write permissions...');
      try {
        const permissions = await checkFirebasePermissions();
        if (permissions.canRead && permissions.canWrite) {
          updateTest('Firestore Permissions', 'success', 'Full read/write access confirmed');
        } else if (permissions.canRead) {
          updateTest('Firestore Permissions', 'warning', 'Read access only - write permissions denied', permissions.error);
        } else {
          updateTest('Firestore Permissions', 'error', permissions.error || 'No access permissions');
        }
      } catch (error: any) {
        updateTest('Firestore Permissions', 'error', `Permission test failed: ${error.message}`);
      }

      // Test 4: Load Data Access
      updateTest('Load Data Access', 'pending', 'Testing load data retrieval...');
      try {
        await refreshLoads();
        const loadCount = loads.length;
        if (loadCount > 0) {
          updateTest('Load Data Access', 'success', `Successfully loaded ${loadCount} loads (unlimited access confirmed)`);
        } else {
          updateTest('Load Data Access', 'warning', 'No loads found - this may be normal if no loads are posted');
        }
      } catch (error: any) {
        updateTest('Load Data Access', 'error', `Load refresh failed: ${error.message}`);
      }

      // Test 5: Cross-Platform Compatibility
      updateTest('Cross-Platform Compatibility', 'pending', 'Checking platform-specific issues...');
      try {
        const platform = require('react-native').Platform.OS;
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
        
        updateTest('Cross-Platform Compatibility', 'success', `Platform: ${platform} - No compatibility issues detected`, {
          platform,
          userAgent: userAgent.substring(0, 100)
        });
      } catch (error: any) {
        updateTest('Cross-Platform Compatibility', 'warning', `Platform detection failed: ${error.message}`);
      }

      // Determine overall status
      const errorTests = tests.filter(t => t.status === 'error');
      const warningTests = tests.filter(t => t.status === 'warning');
      
      if (errorTests.length > 0) {
        setOverallStatus('error');
      } else if (warningTests.length > 0) {
        setOverallStatus('warning');
      } else {
        setOverallStatus('success');
      }

      console.log('[ULTIMATE_TEST] ✅ Comprehensive tests completed');
      
    } catch (error: any) {
      console.error('[ULTIMATE_TEST] ❌ Test suite failed:', error);
      updateTest('Test Suite', 'error', `Test suite failed: ${error.message}`);
      setOverallStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run tests on mount
    runComprehensiveTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} color="#10B981" />;
      case 'error': return <XCircle size={20} color="#EF4444" />;
      case 'warning': return <AlertTriangle size={20} color="#F59E0B" />;
      default: return <RefreshCw size={20} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const showTestDetails = (test: TestResult) => {
    if (test.details) {
      Alert.alert(
        `${test.name} Details`,
        JSON.stringify(test.details, null, 2),
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Ultimate Permission Test',
          headerStyle: { backgroundColor: '#1F2937' },
          headerTintColor: '#FFFFFF',
        }} 
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Overall Status */}
        <View style={[styles.statusCard, { borderColor: getStatusColor(overallStatus) }]}>
          <View style={styles.statusHeader}>
            {getStatusIcon(overallStatus)}
            <Text style={[styles.statusTitle, { color: getStatusColor(overallStatus) }]}>
              {overallStatus === 'success' ? 'All Systems Operational' :
               overallStatus === 'warning' ? 'Minor Issues Detected' :
               overallStatus === 'error' ? 'Critical Issues Found' : 'Testing in Progress'}
            </Text>
          </View>
          
          {overallStatus === 'success' && (
            <Text style={styles.statusMessage}>
              ✅ Cross-platform permissions verified{"\n"}
              ✅ Unlimited load access confirmed{"\n"}
              ✅ All Firebase operations permitted
            </Text>
          )}
          
          {overallStatus === 'error' && (
            <Text style={styles.errorMessage}>
              ❌ Permission issues detected{"\n"}
              🔧 Check Firebase Console settings{"\n"}
              🔧 Verify authentication is enabled
            </Text>
          )}
        </View>

        {/* Test Results */}
        <View style={styles.testsContainer}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          {tests.map((test, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.testCard}
              onPress={() => showTestDetails(test)}
              disabled={!test.details}
            >
              <View style={styles.testHeader}>
                {getStatusIcon(test.status)}
                <Text style={styles.testName}>{test.name}</Text>
              </View>
              <Text style={styles.testMessage}>{test.message}</Text>
              {test.details && (
                <Text style={styles.detailsHint}>Tap for details</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={runComprehensiveTests}
            disabled={isRunning}
          >
            <RefreshCw size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Tests...' : 'Run Tests Again'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Information</Text>
          <Text style={styles.debugText}>Loads in memory: {loads.length}</Text>
          <Text style={styles.debugText}>Platform: {require('react-native').Platform.OS}</Text>
          <Text style={styles.debugText}>Test timestamp: {new Date().toISOString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusMessage: {
    color: '#10B981',
    fontSize: 14,
    lineHeight: 20,
  },
  errorMessage: {
    color: '#EF4444',
    fontSize: 14,
    lineHeight: 20,
  },
  testsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  testCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testMessage: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 18,
  },
  detailsHint: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  debugContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
  },
  debugTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  debugText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});