import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, Info, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { testFirebaseConnectivity, ensureFirebaseAuth, getFirebase } from '@/utils/firebase';
import { testFirebaseConnection } from '@/lib/firebase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface SanityResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'info' | 'loading';
  message: string;
  details?: string;
  recommendation?: string;
  errorCode?: string;
}

export default function FirebaseSanityCheckScreen() {
  const [results, setResults] = useState<SanityResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{ pass: number; fail: number; warning: number; total: number } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const { online } = useOnlineStatus();

  const getStatusIcon = (status: string, size = 20) => {
    const colors = {
      pass: '#10b981',
      fail: '#ef4444', 
      warning: '#f59e0b',
      info: '#3b82f6',
      loading: '#6b7280'
    };
    const color = colors[status as keyof typeof colors] || '#6b7280';
    
    switch (status) {
      case 'pass':
        return <CheckCircle color={color} size={size} />;
      case 'fail':
        return <XCircle color={color} size={size} />;
      case 'warning':
        return <AlertTriangle color={color} size={size} />;
      case 'info':
        return <Info color={color} size={size} />;
      case 'loading':
        return <ActivityIndicator size="small" color={color} />;
      default:
        return <AlertTriangle color={color} size={size} />;
    }
  };

  const runSanityCheck = async () => {
    setIsRunning(true);
    const checks: SanityResult[] = [];
    
    console.log('\n=== FIREBASE SANITY CHECK STARTED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User Agent:', navigator.userAgent || 'Unknown');
    console.log('Online Status:', online);

    // 1. NETWORK CONNECTIVITY TESTS
    checks.push({
      category: 'Network',
      test: 'Internet Connectivity',
      status: 'loading',
      message: 'Testing basic internet connection...'
    });
    setResults([...checks]);

    try {
      await Promise.race([
        fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 5000)
        )
      ]);
      
      checks[checks.length - 1] = {
        category: 'Network',
        test: 'Internet Connectivity',
        status: 'pass',
        message: 'Internet connection is working',
        details: `Online status: ${online ? 'Connected' : 'Disconnected'}`,
      };
      console.log('[SANITY] ✅ Network connectivity: PASS');
    } catch (error: any) {
      checks[checks.length - 1] = {
        category: 'Network',
        test: 'Internet Connectivity', 
        status: 'fail',
        message: 'No internet connection detected',
        details: error.message,
        recommendation: 'Check your WiFi/mobile data connection',
        errorCode: 'NETWORK_UNAVAILABLE'
      };
      console.log('[SANITY] ❌ Network connectivity: FAIL -', error.message);
    }
    setResults([...checks]);

    // 2. FIREBASE SERVICES REACHABILITY
    checks.push({
      category: 'Firebase',
      test: 'Firebase API Reachability',
      status: 'loading',
      message: 'Testing Firebase services accessibility...'
    });
    setResults([...checks]);

    try {
      await Promise.race([
        fetch('https://firebase.googleapis.com/', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase API timeout')), 8000)
        )
      ]);
      
      checks[checks.length - 1] = {
        category: 'Firebase',
        test: 'Firebase API Reachability',
        status: 'pass',
        message: 'Firebase APIs are accessible',
        details: 'All Firebase services can be reached'
      };
      console.log('[SANITY] ✅ Firebase API reachability: PASS');
    } catch (error: any) {
      checks[checks.length - 1] = {
        category: 'Firebase',
        test: 'Firebase API Reachability',
        status: 'fail',
        message: 'Firebase APIs are not reachable',
        details: error.message,
        recommendation: 'Check if Firebase services are blocked by network/firewall',
        errorCode: 'FIREBASE_API_UNREACHABLE'
      };
      console.log('[SANITY] ❌ Firebase API reachability: FAIL -', error.message);
    }
    setResults([...checks]);

    // 3. FIREBASE CONFIGURATION
    checks.push({
      category: 'Firebase',
      test: 'Firebase Configuration',
      status: 'loading',
      message: 'Validating Firebase app configuration...'
    });
    setResults([...checks]);

    try {
      const { app } = getFirebase();
      const config = app.options;
      
      if (!config.projectId || !config.apiKey || !config.authDomain) {
        throw new Error('Missing required Firebase configuration');
      }
      
      checks[checks.length - 1] = {
        category: 'Firebase',
        test: 'Firebase Configuration',
        status: 'pass',
        message: 'Firebase app is properly configured',
        details: `Project: ${config.projectId}\nAuth Domain: ${config.authDomain}\nAPI Key: ${config.apiKey?.substring(0, 10)}...`
      };
      console.log('[SANITY] ✅ Firebase configuration: PASS');
      console.log('[SANITY] Project ID:', config.projectId);
      console.log('[SANITY] Auth Domain:', config.authDomain);
    } catch (configError: any) {
      checks[checks.length - 1] = {
        category: 'Firebase',
        test: 'Firebase Configuration',
        status: 'fail',
        message: 'Firebase configuration error',
        details: configError.message,
        recommendation: 'Verify Firebase configuration in utils/firebase.ts',
        errorCode: 'CONFIG_ERROR'
      };
      console.log('[SANITY] ❌ Firebase configuration: FAIL -', configError.message);
    }
    setResults([...checks]);

    // 4. FIREBASE AUTHENTICATION
    checks.push({
      category: 'Authentication',
      test: 'Firebase Auth Test',
      status: 'loading',
      message: 'Testing Firebase authentication...'
    });
    setResults([...checks]);

    try {
      const authResult = await Promise.race([
        ensureFirebaseAuth(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout after 15s')), 15000)
        )
      ]);
      
      if (authResult) {
        const { auth } = getFirebase();
        const user = auth.currentUser;
        
        checks[checks.length - 1] = {
          category: 'Authentication',
          test: 'Firebase Auth Test',
          status: 'pass',
          message: 'Authentication successful',
          details: `User ID: ${user?.uid}\nAnonymous: ${user?.isAnonymous}\nEmail: ${user?.email || 'None'}`
        };
        console.log('[SANITY] ✅ Firebase authentication: PASS');
        console.log('[SANITY] User ID:', user?.uid);
        console.log('[SANITY] Is Anonymous:', user?.isAnonymous);
      } else {
        checks[checks.length - 1] = {
          category: 'Authentication',
          test: 'Firebase Auth Test',
          status: 'fail',
          message: 'Authentication failed',
          details: 'Unable to sign in anonymously',
          recommendation: 'Check Firebase Auth configuration and network connectivity',
          errorCode: 'AUTH_FAILED'
        };
        console.log('[SANITY] ❌ Firebase authentication: FAIL - Unable to sign in');
      }
    } catch (error: any) {
      const errorCode = error?.code || 'unknown';
      let recommendation = 'Check network connectivity and Firebase Auth settings';
      
      if (errorCode === 'unavailable') {
        recommendation = 'Firebase Auth service is temporarily unavailable. Try again later.';
      } else if (errorCode === 'network-request-failed') {
        recommendation = 'Network request failed. Check internet connection.';
      }
      
      checks[checks.length - 1] = {
        category: 'Authentication',
        test: 'Firebase Auth Test',
        status: 'fail',
        message: 'Authentication error',
        details: `${errorCode}: ${error.message}`,
        recommendation,
        errorCode
      };
      console.log('[SANITY] ❌ Firebase authentication: FAIL -', errorCode, error.message);
    }
    setResults([...checks]);

    // 5. FIRESTORE CONNECTION
    checks.push({
      category: 'Database',
      test: 'Firestore Connection',
      status: 'loading',
      message: 'Testing Firestore database connection...'
    });
    setResults([...checks]);

    try {
      const firestoreResult = await Promise.race([
        testFirebaseConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firestore timeout after 20s')), 20000)
        )
      ]) as any;
      
      if (firestoreResult.success) {
        checks[checks.length - 1] = {
          category: 'Database',
          test: 'Firestore Connection',
          status: 'pass',
          message: 'Firestore connection successful',
          details: `Project: ${firestoreResult.projectId}\nUser: ${firestoreResult.userId}\nDocs found: ${firestoreResult.docsFound}`
        };
        console.log('[SANITY] ✅ Firestore connection: PASS');
        console.log('[SANITY] Docs found:', firestoreResult.docsFound);
      } else {
        const errorCode = firestoreResult.code || 'unknown';
        let recommendation = 'Check Firestore rules and network connectivity';
        
        if (errorCode === 'unavailable') {
          recommendation = 'Firestore service is temporarily unavailable. This is the main issue causing your error.';
        } else if (errorCode === 'permission-denied') {
          recommendation = 'Anonymous users may not have read permissions. Check Firestore security rules.';
        }
        
        checks[checks.length - 1] = {
          category: 'Database',
          test: 'Firestore Connection',
          status: 'fail',
          message: 'Firestore connection failed',
          details: `${errorCode}: ${firestoreResult.error}`,
          recommendation,
          errorCode
        };
        console.log('[SANITY] ❌ Firestore connection: FAIL -', errorCode, firestoreResult.error);
      }
    } catch (error: any) {
      checks[checks.length - 1] = {
        category: 'Database',
        test: 'Firestore Connection',
        status: 'fail',
        message: 'Firestore test error',
        details: error.message,
        recommendation: 'Check network connectivity and Firestore configuration',
        errorCode: 'FIRESTORE_ERROR'
      };
      console.log('[SANITY] ❌ Firestore connection: FAIL -', error.message);
    }
    setResults([...checks]);

    // 6. COMPREHENSIVE CONNECTIVITY TEST
    checks.push({
      category: 'Overall',
      test: 'Comprehensive Test',
      status: 'loading',
      message: 'Running comprehensive Firebase connectivity test...'
    });
    setResults([...checks]);

    try {
      const comprehensiveResult = await testFirebaseConnectivity();
      
      if (comprehensiveResult.connected) {
        checks[checks.length - 1] = {
          category: 'Overall',
          test: 'Comprehensive Test',
          status: 'pass',
          message: 'All Firebase services are working',
          details: 'Network, Auth, and Firestore are all functional'
        };
        console.log('[SANITY] ✅ Comprehensive test: PASS');
      } else {
        const issues = [];
        if (!comprehensiveResult.details.networkOnline) issues.push('Network');
        if (!comprehensiveResult.details.firebaseReachable) issues.push('Firebase API');
        if (!comprehensiveResult.details.authWorking) issues.push('Authentication');
        if (!comprehensiveResult.details.firestoreWorking) issues.push('Firestore');
        
        checks[checks.length - 1] = {
          category: 'Overall',
          test: 'Comprehensive Test',
          status: 'warning',
          message: 'Some Firebase services have issues',
          details: `Issues with: ${issues.join(', ')}\nError: ${comprehensiveResult.error || 'Multiple issues detected'}`,
          recommendation: 'Address the failing components above'
        };
        console.log('[SANITY] ⚠️ Comprehensive test: WARNING -', issues.join(', '));
      }
    } catch (error: any) {
      checks[checks.length - 1] = {
        category: 'Overall',
        test: 'Comprehensive Test',
        status: 'fail',
        message: 'Comprehensive test failed',
        details: error.message,
        recommendation: 'Multiple system failures detected',
        errorCode: 'COMPREHENSIVE_FAILURE'
      };
      console.log('[SANITY] ❌ Comprehensive test: FAIL -', error.message);
    }
    setResults([...checks]);

    // Calculate summary
    const finalResults = [...checks];
    const summary = {
      total: finalResults.length,
      pass: finalResults.filter(r => r.status === 'pass').length,
      fail: finalResults.filter(r => r.status === 'fail').length,
      warning: finalResults.filter(r => r.status === 'warning').length
    };
    setSummary(summary);
    
    console.log('\n=== FIREBASE SANITY CHECK COMPLETED ===');
    console.log('Summary:', summary);
    console.log('Timestamp:', new Date().toISOString());
    
    setIsRunning(false);
  };

  useEffect(() => {
    runSanityCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOverallStatus = () => {
    if (!summary) return 'loading';
    if (summary.fail > 0) return 'fail';
    if (summary.warning > 0) return 'warning';
    return 'pass';
  };

  const getRecommendations = () => {
    const recommendations = [];
    const failedTests = results.filter(r => r.status === 'fail');
    const warningTests = results.filter(r => r.status === 'warning');
    
    // Specific recommendations based on the "Could not reach Cloud Firestore backend" error
    recommendations.push('🔍 DIAGNOSIS FOR "Could not reach Cloud Firestore backend" ERROR:');
    
    if (failedTests.some(t => t.test === 'Internet Connectivity')) {
      recommendations.push('• PRIMARY ISSUE: No internet connection detected');
      recommendations.push('  - Switch between WiFi and mobile data');
      recommendations.push('  - Restart your network connection');
      recommendations.push('  - Check if other apps can access the internet');
    }
    
    if (failedTests.some(t => t.test === 'Firebase API Reachability')) {
      recommendations.push('• SECONDARY ISSUE: Firebase services are blocked');
      recommendations.push('  - Disable VPN if active');
      recommendations.push('  - Check corporate firewall settings');
      recommendations.push('  - Try a different network');
    }
    
    if (failedTests.some(t => t.test === 'Firebase Auth Test')) {
      recommendations.push('• AUTH ISSUE: Firebase Authentication is failing');
      recommendations.push('  - This prevents Firestore access');
      recommendations.push('  - Check Firebase Auth configuration');
      recommendations.push('  - Verify anonymous auth is enabled in Firebase Console');
    }
    
    if (failedTests.some(t => t.test === 'Firestore Connection')) {
      recommendations.push('• DATABASE ISSUE: Firestore is unavailable');
      recommendations.push('  - This is the direct cause of your error');
      recommendations.push('  - Check Firebase status: https://status.firebase.google.com');
      recommendations.push('  - Verify Firestore security rules allow anonymous reads');
    }
    
    if (failedTests.length === 0 && warningTests.length === 0) {
      recommendations.push('✅ All systems are working normally');
      recommendations.push('• If you&apos;re still seeing the error, try:');
      recommendations.push('  - Restart the app completely');
      recommendations.push('  - Clear app cache/data');
      recommendations.push('  - Check for temporary Firebase service issues');
    }
    
    recommendations.push('');
    recommendations.push('📱 IMMEDIATE ACTIONS:');
    recommendations.push('• The app will work in offline mode with cached data');
    recommendations.push('• Live data features will be limited until connection is restored');
    recommendations.push('• Reports/analytics will show cached data only');
    
    return recommendations;
  };

  const handleClose = () => {
    setShowCloseModal(true);
  };

  const confirmClose = () => {
    console.log('[SANITY] User closed Firebase sanity check');
    setShowCloseModal(false);
    router.back();
  };

  const cancelClose = () => {
    setShowCloseModal(false);
  };

  const clearErrors = () => {
    console.log('[SANITY] Clearing all test results and closing diagnostics');
    setResults([]);
    setSummary(null);
    // Close the screen after clearing
    setTimeout(() => {
      router.back();
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with close button */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleClose}
          testID="close-sanity-check"
        >
          <ArrowLeft color="#374151" size={24} />
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Firebase Diagnostics</Text>
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={clearErrors}
          testID="clear-errors"
        >
          <Text style={styles.clearButtonText}>Clear & Close</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Firebase Sanity Check</Text>
          <Text style={styles.subtitle}>
            Comprehensive diagnosis of Firebase connectivity issues
          </Text>
          
          {summary && (
            <View style={[styles.summaryCard, { borderLeftColor: getOverallStatus() === 'pass' ? '#10b981' : getOverallStatus() === 'fail' ? '#ef4444' : '#f59e0b' }]}>
              <View style={styles.summaryHeader}>
                {getStatusIcon(getOverallStatus(), 24)}
                <Text style={styles.summaryTitle}>
                  {getOverallStatus() === 'pass' ? 'All Systems Operational' : 
                   getOverallStatus() === 'fail' ? 'Critical Issues Detected' : 
                   'Partial Issues Detected'}
                </Text>
              </View>
              <Text style={styles.summaryText}>
                {summary.pass} passed • {summary.fail} failed • {summary.warning} warnings
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, isRunning && styles.refreshButtonDisabled]}
          onPress={runSanityCheck}
          disabled={isRunning}
        >
          <RefreshCw color="#ffffff" size={16} />
          <Text style={styles.refreshButtonText}>
            {isRunning ? 'Running Sanity Check...' : 'Run Check Again'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Detailed Test Results</Text>
          {results.map((result, index) => (
            <View key={`result-${result.category}-${result.test}-${index}`} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleContainer}>
                  <Text style={styles.resultCategory}>{result.category}</Text>
                  <Text style={styles.resultTest}>{result.test}</Text>
                </View>
                {getStatusIcon(result.status, 20)}
              </View>
              
              <Text style={[styles.resultMessage, { 
                color: result.status === 'pass' ? '#10b981' : 
                       result.status === 'fail' ? '#ef4444' : 
                       result.status === 'warning' ? '#f59e0b' : '#3b82f6' 
              }]}>
                {result.message}
              </Text>
              
              {result.details && (
                <Text style={styles.resultDetails}>{result.details}</Text>
              )}
              
              {result.errorCode && (
                <View style={styles.errorCodeContainer}>
                  <Text style={styles.errorCode}>Error Code: {result.errorCode}</Text>
                </View>
              )}
              
              {result.recommendation && (
                <View style={styles.recommendationContainer}>
                  <Text style={styles.recommendationLabel}>Recommendation:</Text>
                  <Text style={styles.recommendationText}>{result.recommendation}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.recommendationsContainer}>
          <Text style={styles.sectionTitle}>Diagnosis & Recommendations</Text>
          {getRecommendations().map((rec, index) => (
            <Text key={`rec-${index}`} style={[
              styles.recommendationItem,
              rec.startsWith('🔍') && styles.diagnosisHeader,
              rec.startsWith('📱') && styles.actionHeader,
              rec.startsWith('•') && styles.bulletPoint,
              rec.startsWith('  -') && styles.subBullet
            ]}>
              {rec}
            </Text>
          ))}
        </View>

        <View style={styles.errorInfoContainer}>
          <Text style={styles.sectionTitle}>About the &quot;Could not reach Cloud Firestore backend&quot; Error</Text>
          <Text style={styles.errorInfoText}>
            This error occurs when your app cannot establish a connection to Google&apos;s Firestore servers. Common causes:
          </Text>
          <Text style={styles.errorInfoBullet}>• Network connectivity issues (most common)</Text>
          <Text style={styles.errorInfoBullet}>• Firebase service outages or maintenance</Text>
          <Text style={styles.errorInfoBullet}>• Corporate firewalls blocking Firebase domains</Text>
          <Text style={styles.errorInfoBullet}>• VPN interference with Google services</Text>
          <Text style={styles.errorInfoBullet}>• Authentication failures preventing database access</Text>
          <Text style={styles.errorInfoText}>
            The app automatically switches to offline mode when this occurs, using cached data until connectivity is restored.
          </Text>
        </View>

        <View style={styles.timestampContainer}>
          <Clock color="#6b7280" size={14} />
          <Text style={styles.timestamp}>
            Last check: {new Date().toLocaleString()}
          </Text>
        </View>
      </ScrollView>
      
      {/* Close Confirmation Modal */}
      <Modal
        visible={showCloseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Close Sanity Check</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to close the Firebase diagnostics?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={cancelClose}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton} 
                onPress={confirmClose}
              >
                <Text style={styles.modalConfirmText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  resultsContainer: {
    marginBottom: 32,
  },
  resultItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultTitleContainer: {
    flex: 1,
  },
  resultCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  resultMessage: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  resultDetails: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorCodeContainer: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorCode: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  recommendationContainer: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
  recommendationsContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recommendationItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 20,
  },
  diagnosisHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 8,
  },
  actionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginTop: 12,
    marginBottom: 8,
  },
  bulletPoint: {
    marginLeft: 8,
    color: '#dc2626',
    fontWeight: '500',
  },
  subBullet: {
    marginLeft: 16,
    color: '#6b7280',
  },
  errorInfoContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  errorInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  errorInfoBullet: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    marginLeft: 8,
    lineHeight: 20,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
});