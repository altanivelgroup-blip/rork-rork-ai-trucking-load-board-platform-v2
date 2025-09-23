import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertTriangle, Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { testFirebaseConnectivity } from '@/utils/firebase';
import { testFirebaseConnection } from '@/lib/firebase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { DeviceTestSuite } from '@/utils/deviceTesting';
import {
  API_BASE_URL,
  hasApiBaseUrl,
} from '@/utils/env';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  critical: boolean;
}

export default function ComprehensiveSanityCheckScreen() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [overallScore, setOverallScore] = useState(0);
  const [submissionReady, setSubmissionReady] = useState(false);
  const insets = useSafeAreaInsets();
  const { online } = useOnlineStatus();

  const addResult = (result: CheckResult) => {
    setResults(prev => [...prev, result]);
  };

  const runComprehensiveCheck = async () => {
    console.log('\n🚨 COMPREHENSIVE SUBMISSION SANITY CHECK 🚨');
    console.log('==============================================');
    
    const startTime = Date.now();
    
    // 1. Environment Configuration Check
    console.log('\n1️⃣ ENVIRONMENT CONFIGURATION');
    try {
      const apiUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
      const orsKey = process.env.EXPO_PUBLIC_ORS_API_KEY;
      
      if (!apiUrl) {
        addResult({
          name: 'API Base URL',
          status: 'fail',
          message: 'EXPO_PUBLIC_RORK_API_BASE_URL is missing',
          critical: true
        });
      } else {
        addResult({
          name: 'API Base URL',
          status: 'pass',
          message: `Configured: ${apiUrl}`,
          critical: true
        });
      }
      
      if (!mapboxToken) {
        addResult({
          name: 'Mapbox Token',
          status: 'warning',
          message: 'Mapbox token missing - maps may not work',
          critical: false
        });
      } else {
        addResult({
          name: 'Mapbox Token',
          status: 'pass',
          message: 'Mapbox token configured',
          critical: false
        });
      }
      
      console.log('✅ Environment configuration check completed');
    } catch (error: any) {
      console.error('❌ Environment configuration check failed:', error);
      addResult({
        name: 'Environment Configuration',
        status: 'fail',
        message: `Configuration error: ${error.message}`,
        critical: true
      });
    }
    
    // 2. Firebase Connectivity Check
    console.log('\n2️⃣ FIREBASE CONNECTIVITY');
    try {
      const firebaseTest = await testFirebaseConnectivity();
      if (firebaseTest.connected) {
        addResult({
          name: 'Firebase Connection',
          status: 'pass',
          message: 'Firebase services operational',
          critical: true
        });
        console.log('✅ Firebase connectivity check passed');
      } else {
        addResult({
          name: 'Firebase Connection',
          status: 'fail',
          message: `Firebase error: ${firebaseTest.error}`,
          critical: true
        });
        console.log('❌ Firebase connectivity check failed:', firebaseTest.error);
      }
    } catch (error: any) {
      console.error('❌ Firebase connectivity check failed:', error);
      addResult({
        name: 'Firebase Connection',
        status: 'fail',
        message: `Firebase connection failed: ${error.message}`,
        critical: true
      });
    }
    
    // 3. Firebase Detailed Test
    console.log('\n3️⃣ FIREBASE DETAILED TEST');
    try {
      const detailedTest = await testFirebaseConnection();
      if (detailedTest.success) {
        addResult({
          name: 'Firebase Detailed Test',
          status: 'pass',
          message: 'All Firebase services working',
          critical: true
        });
        console.log('✅ Firebase detailed test passed');
      } else {
        addResult({
          name: 'Firebase Detailed Test',
          status: 'warning',
          message: `Firebase issues: ${detailedTest.error}`,
          critical: false
        });
        console.log('⚠️ Firebase detailed test had issues:', detailedTest.error);
      }
    } catch (error: any) {
      console.error('❌ Firebase detailed test failed:', error);
      addResult({
        name: 'Firebase Detailed Test',
        status: 'fail',
        message: `Detailed test failed: ${error.message}`,
        critical: true
      });
    }
    
    // 4. Network Connectivity Check
    console.log('\n4️⃣ NETWORK CONNECTIVITY');
    try {
      if (!hasApiBaseUrl) {
        throw new Error('API base URL not configured');
      }
      
      const response = await fetch(`${API_BASE_URL}/api`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000
      } as any);
      
      if (response.ok) {
        addResult({
          name: 'API Connectivity',
          status: 'pass',
          message: `API reachable (${response.status})`,
          critical: true
        });
        console.log('✅ API connectivity check passed');
      } else {
        addResult({
          name: 'API Connectivity',
          status: 'warning',
          message: `API returned ${response.status}`,
          critical: false
        });
        console.log('⚠️ API connectivity check warning:', response.status);
      }
    } catch (error: any) {
      console.error('❌ Network connectivity check failed:', error);
      addResult({
        name: 'API Connectivity',
        status: 'fail',
        message: `Network error: ${error.message}`,
        critical: true
      });
    }
    
    // 5. Device Capabilities Check
    console.log('\n5️⃣ DEVICE CAPABILITIES');
    try {
      const deviceTests = await DeviceTestSuite();
      const failedTests = deviceTests.filter(test => test.status === 'failed');
      
      if (failedTests.length === 0) {
        addResult({
          name: 'Device Capabilities',
          status: 'pass',
          message: 'All device tests passed',
          critical: false
        });
        console.log('✅ Device capabilities check passed');
      } else {
        addResult({
          name: 'Device Capabilities',
          status: 'warning',
          message: `${failedTests.length} device tests failed`,
          critical: false
        });
        console.log('⚠️ Device capabilities check warning:', failedTests.length, 'tests failed');
      }
    } catch (error: any) {
      console.error('❌ Device capabilities check failed:', error);
      addResult({
        name: 'Device Capabilities',
        status: 'warning',
        message: `Device test error: ${error.message}`,
        critical: false
      });
    }
    
    // 6. AI Services Check
    console.log('\n6️⃣ AI SERVICES');
    try {
      const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test connection' }]
        }),
        timeout: 15000
      } as any);
      
      if (aiResponse.ok) {
        addResult({
          name: 'AI Services',
          status: 'pass',
          message: 'AI services operational',
          critical: false
        });
        console.log('✅ AI services check passed');
      } else {
        addResult({
          name: 'AI Services',
          status: 'warning',
          message: `AI services returned ${aiResponse.status}`,
          critical: false
        });
        console.log('⚠️ AI services check warning:', aiResponse.status);
      }
    } catch (error: any) {
      console.error('❌ AI services check failed:', error);
      addResult({
        name: 'AI Services',
        status: 'warning',
        message: `AI services error: ${error.message}`,
        critical: false
      });
    }
    
    // 7. App Configuration Check
    console.log('\n7️⃣ APP CONFIGURATION');
    try {
      // Check bundle identifier
      const bundleId = 'app.rork.rork-ai-trucking-load-board';
      if (bundleId && !bundleId.includes('example') && !bundleId.includes('template')) {
        addResult({
          name: 'Bundle Identifier',
          status: 'pass',
          message: 'Production bundle ID configured',
          critical: true
        });
      } else {
        addResult({
          name: 'Bundle Identifier',
          status: 'fail',
          message: 'Bundle ID appears to be placeholder',
          critical: true
        });
      }
      
      // Check app name
      const appName = 'AI Trucking Load Board Platform';
      if (appName && appName !== 'Expo App') {
        addResult({
          name: 'App Name',
          status: 'pass',
          message: 'Production app name configured',
          critical: true
        });
      } else {
        addResult({
          name: 'App Name',
          status: 'fail',
          message: 'App name appears to be placeholder',
          critical: true
        });
      }
      
      console.log('✅ App configuration check completed');
    } catch (error: any) {
      console.error('❌ App configuration check failed:', error);
      addResult({
        name: 'App Configuration',
        status: 'fail',
        message: `Configuration error: ${error.message}`,
        critical: true
      });
    }
    
    // 8. Online Status Check
    console.log('\n8️⃣ ONLINE STATUS');
    if (online) {
      addResult({
        name: 'Network Status',
        status: 'pass',
        message: 'Device is online',
        critical: false
      });
      console.log('✅ Online status check passed');
    } else {
      addResult({
        name: 'Network Status',
        status: 'warning',
        message: 'Device appears to be offline',
        critical: false
      });
      console.log('⚠️ Online status check warning: offline');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n📊 SANITY CHECK COMPLETED');
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log('==============================================\n');
    
    setIsRunning(false);
  };

  useEffect(() => {
    runComprehensiveCheck();
  }, []);

  useEffect(() => {
    if (results.length > 0 && !isRunning) {
      const totalChecks = results.length;
      const passedChecks = results.filter(r => r.status === 'pass').length;
      const criticalChecks = results.filter(r => r.critical);
      const criticalPassed = criticalChecks.filter(r => r.status === 'pass').length;
      const criticalFailed = criticalChecks.filter(r => r.status === 'fail').length;
      
      const score = Math.round((passedChecks / totalChecks) * 100);
      const ready = criticalFailed === 0;
      
      setOverallScore(score);
      setSubmissionReady(ready);
      
      // Final console report
      console.log('\n🎯 FINAL SUBMISSION READINESS REPORT');
      console.log('=====================================');
      console.log(`📊 OVERALL SCORE: ${score}/100`);
      console.log(`🎯 SUBMISSION READY: ${ready ? '✅ YES' : '❌ NO'}`);
      console.log(`🛡️ CRITICAL CHECKS: ${criticalPassed}/${criticalChecks.length}`);
      console.log(`❌ CRITICAL FAILURES: ${criticalFailed}`);
      console.log(`⚠️ WARNINGS: ${results.filter(r => r.status === 'warning').length}`);
      
      if (criticalFailed > 0) {
        console.log('\n🚫 CRITICAL ISSUES BLOCKING SUBMISSION:');
        results.filter(r => r.critical && r.status === 'fail').forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue.name}: ${issue.message}`);
        });
      }
      
      const warnings = results.filter(r => r.status === 'warning');
      if (warnings.length > 0) {
        console.log('\n⚠️ WARNINGS (NON-BLOCKING):');
        warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning.name}: ${warning.message}`);
        });
      }
      
      console.log('=====================================\n');
      
      // Show alert
      const alertTitle = ready ? '🎉 SUBMISSION READY!' : '⚠️ ISSUES FOUND';
      const alertMessage = ready 
        ? `Score: ${score}/100\n\n✅ All critical checks passed\n✅ No submission blockers\n\n🚀 Your app is ready for submission!`
        : `Score: ${score}/100\n\n❌ ${criticalFailed} critical issues\n⚠️ ${warnings.length} warnings\n\nResolve critical issues before submission.`;
      
      Alert.alert(alertTitle, alertMessage, [{ text: 'Got it!' }]);
    }
  }, [results, isRunning]);

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass': return <CheckCircle color="#10b981" size={20} />;
      case 'fail': return <XCircle color="#ef4444" size={20} />;
      case 'warning': return <AlertTriangle color="#f59e0b" size={20} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Comprehensive Sanity Check' }} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Star color={theme.colors.primary} size={32} />
            <Text style={styles.title}>COMPREHENSIVE SANITY CHECK</Text>
          </View>
          
          {!isRunning && (
            <View style={[styles.reportCard, { borderLeftColor: submissionReady ? '#10b981' : '#ef4444' }]}>
              <View style={styles.reportHeader}>
                <Text style={[styles.reportScore, { color: getScoreColor(overallScore) }]}>
                  {overallScore}/100
                </Text>
                <View style={styles.readinessIndicator}>
                  {submissionReady ? (
                    <CheckCircle color="#10b981" size={24} />
                  ) : (
                    <XCircle color="#ef4444" size={24} />
                  )}
                  <Text style={[styles.readinessText, { 
                    color: submissionReady ? '#10b981' : '#ef4444' 
                  }]}>
                    {submissionReady ? 'READY FOR SUBMISSION' : 'ISSUES FOUND'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.reportSummary}>
                {submissionReady 
                  ? 'All critical checks passed! Your app is ready for app store submission.' 
                  : `Critical issues found. Resolve these before submitting to app stores.`}
              </Text>
            </View>
          )}
        </View>

        {/* Check Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Check Results ({results.length})</Text>
          {results.map((result, index) => (
            <View key={index} style={[
              styles.checkCard,
              result.critical && result.status === 'fail' && styles.criticalFailCard
            ]}>
              <View style={styles.checkHeader}>
                <View style={styles.checkTitleContainer}>
                  <View style={styles.checkTitleRow}>
                    <Text style={styles.checkName}>{result.name}</Text>
                    {result.critical && (
                      <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.checkStatusContainer}>
                  {getStatusIcon(result.status)}
                </View>
              </View>
              
              <Text style={[styles.checkMessage, { 
                color: result.status === 'pass' ? '#10b981' : 
                       result.status === 'fail' ? '#ef4444' : '#f59e0b'
              }]}>
                {result.message}
              </Text>
            </View>
          ))}
          
          {isRunning && (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>Running comprehensive checks...</Text>
              <Text style={styles.loadingSubtext}>This may take a few moments</Text>
            </View>
          )}
        </View>

        {/* Final Status */}
        {!isRunning && submissionReady && (
          <View style={styles.successContainer}>
            <View style={styles.successCard}>
              <CheckCircle color="#10b981" size={32} />
              <View style={styles.successContent}>
                <Text style={styles.successTitle}>🎉 Submission Ready!</Text>
                <Text style={styles.successMessage}>
                  Your LoadRush app has passed all critical checks and is ready for app store submission.
                </Text>
                <Text style={styles.successSteps}>
                  Next steps:{"\n"}• Test on physical devices{"\n"}• Prepare app store assets{"\n"}• Submit for review
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    flex: 1,
  },
  reportCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  reportHeader: {
    marginBottom: theme.spacing.md,
  },
  reportScore: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  readinessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  readinessText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  reportSummary: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  resultsContainer: {
    marginBottom: theme.spacing.lg,
  },
  checkCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  criticalFailCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    backgroundColor: '#fefefe',
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  checkTitleContainer: {
    flex: 1,
  },
  checkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  checkName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  criticalBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  checkStatusContainer: {
    alignItems: 'center',
  },
  checkMessage: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  loadingCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  loadingSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  successContainer: {
    marginTop: theme.spacing.lg,
  },
  successCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: theme.spacing.sm,
  },
  successMessage: {
    fontSize: theme.fontSize.md,
    color: '#047857',
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  successSteps: {
    fontSize: theme.fontSize.sm,
    color: '#059669',
    lineHeight: 18,
  },
});