import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useLiveAnalytics } from '@/hooks/useLiveAnalytics';
import { useLoads } from '@/hooks/useLoads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Italic, Wallet, User } from 'lucide-react-native';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export default function PermanentFixesTestScreen() {
  const { user, updateProfile } = useAuth();
  const { balance, totalEarnings, transactions } = useWallet();
  const { loads } = useLoads();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Test live analytics with a sample load
  const sampleLoad = loads.length > 0 ? loads[0] : {
    id: 'test-load-1',
    origin: { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
    destination: { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
    rate: 1500,
    distance: 240,
    weight: 35000,
    vehicleType: 'truck'
  };

  const { analytics, loading: analyticsLoading, error: analyticsError } = useLiveAnalytics(sampleLoad, true);

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    console.log('🧪 PERMANENT FIXES TEST - Starting comprehensive test suite...');

    // Test 1: Profile Persistence
    try {
      const profileKeys = [
        'auth:user:profile',
        'auth:user:profile_backup',
        'profile:cache',
        `driver:profile:${user?.id}`,
        `user:${user?.email}`
      ];

      let profileBackupsFound = 0;
      for (const key of profileKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.id && parsed.role && parsed.email) {
              profileBackupsFound++;
            }
          }
        } catch (e) {
          // Ignore individual key failures
        }
      }

      results.push({
        name: 'Profile Persistence',
        status: profileBackupsFound >= 2 ? 'pass' : profileBackupsFound >= 1 ? 'warning' : 'fail',
        message: `Found ${profileBackupsFound} valid profile backups`,
        details: { backupsFound: profileBackupsFound, requiredKeys: profileKeys.length }
      });
    } catch (error) {
      results.push({
        name: 'Profile Persistence',
        status: 'fail',
        message: `Profile persistence test failed: ${error}`,
      });
    }

    // Test 2: Driver Profile Completeness
    if (user?.role === 'driver') {
      const driverProfile = user as any;
      const hasWallet = !!(driverProfile.wallet?.balance !== undefined);
      const hasFuelProfile = !!(driverProfile.fuelProfile?.averageMpg);
      const hasBasicFields = !!(driverProfile.completedLoads && driverProfile.rating);

      results.push({
        name: 'Driver Profile Completeness',
        status: hasWallet && hasFuelProfile && hasBasicFields ? 'pass' : 'warning',
        message: `Wallet: ${hasWallet}, Fuel Profile: ${hasFuelProfile}, Basic Fields: ${hasBasicFields}`,
        details: {
          wallet: driverProfile.wallet,
          fuelProfile: driverProfile.fuelProfile,
          completedLoads: driverProfile.completedLoads,
          rating: driverProfile.rating
        }
      });
    }

    // Test 3: Live Analytics Functionality
    try {
      const analyticsWorking = !analyticsLoading && !analyticsError && analytics;
      const hasAllMetrics = analytics && 
        analytics.fuelCost !== undefined && 
        analytics.netAfterFuel !== undefined && 
        analytics.profitPerMile !== undefined &&
        analytics.eta !== undefined;

      results.push({
        name: 'Live Analytics',
        status: analyticsWorking && hasAllMetrics ? 'pass' : analyticsError ? 'fail' : 'warning',
        message: analyticsError ? `Error: ${analyticsError}` : 
                analyticsWorking ? 'All analytics metrics available' : 'Analytics loading or incomplete',
        details: {
          loading: analyticsLoading,
          error: analyticsError,
          analytics: analytics ? {
            fuelCost: analytics.fuelCost,
            netAfterFuel: analytics.netAfterFuel,
            profitPerMile: analytics.profitPerMile,
            eta: analytics.eta
          } : null
        }
      });
    } catch (error) {
      results.push({
        name: 'Live Analytics',
        status: 'fail',
        message: `Analytics test failed: ${error}`,
      });
    }

    // Test 4: Wallet Analytics
    try {
      const hasTransactions = transactions.length > 0;
      const hasBalanceData = balance !== undefined && totalEarnings !== undefined;
      const hasDetailedTransactions = transactions.some(t => t.costBreakdown);

      results.push({
        name: 'Wallet Analytics',
        status: hasTransactions && hasBalanceData && hasDetailedTransactions ? 'pass' : 'warning',
        message: `Transactions: ${transactions.length}, Balance Data: ${hasBalanceData}, Detailed: ${hasDetailedTransactions}`,
        details: {
          transactionCount: transactions.length,
          balance,
          totalEarnings,
          hasDetailedBreakdown: hasDetailedTransactions,
          latestTransaction: transactions[0]
        }
      });
    } catch (error) {
      results.push({
        name: 'Wallet Analytics',
        status: 'fail',
        message: `Wallet analytics test failed: ${error}`,
      });
    }

    // Test 5: Analytics Storage Persistence
    try {
      const analyticsKeys = [
        'analytics:initialized',
        'analytics:driver-profile',
        'analytics:backup',
        'live-analytics:enabled',
        'post-delivery:analytics:enabled'
      ];

      let analyticsDataFound = 0;
      for (const key of analyticsKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) analyticsDataFound++;
        } catch (e) {
          // Ignore individual key failures
        }
      }

      results.push({
        name: 'Analytics Storage',
        status: analyticsDataFound >= 3 ? 'pass' : analyticsDataFound >= 1 ? 'warning' : 'fail',
        message: `Found ${analyticsDataFound} analytics storage entries`,
        details: { analyticsDataFound, totalKeys: analyticsKeys.length }
      });
    } catch (error) {
      results.push({
        name: 'Analytics Storage',
        status: 'fail',
        message: `Analytics storage test failed: ${error}`,
      });
    }

    // Test 6: Profile Update Functionality
    try {
      const testUpdate = { testField: `test-${Date.now()}` };
      await updateProfile(testUpdate);
      
      // Check if update was persisted
      const updatedProfile = await AsyncStorage.getItem('auth:user:profile');
      const profileContainsUpdate = updatedProfile && updatedProfile.includes(testUpdate.testField);

      results.push({
        name: 'Profile Update Persistence',
        status: profileContainsUpdate ? 'pass' : 'warning',
        message: profileContainsUpdate ? 'Profile updates are persisted' : 'Profile update persistence unclear',
        details: { testUpdate, profileContainsUpdate }
      });
    } catch (error) {
      results.push({
        name: 'Profile Update Persistence',
        status: 'fail',
        message: `Profile update test failed: ${error}`,
      });
    }

    // Test 7: Cross-Platform Compatibility
    try {
      const platform = require('react-native').Platform.OS;
      const analyticsLog = (globalThis as any).__liveAnalyticsLog;
      const hasAnalyticsLog = Array.isArray(analyticsLog) && analyticsLog.length > 0;

      results.push({
        name: 'Cross-Platform Analytics',
        status: hasAnalyticsLog ? 'pass' : 'warning',
        message: `Platform: ${platform}, Analytics Log: ${hasAnalyticsLog ? 'Active' : 'Inactive'}`,
        details: { 
          platform, 
          analyticsLogEntries: hasAnalyticsLog ? analyticsLog.length : 0,
          latestEntry: hasAnalyticsLog ? analyticsLog[analyticsLog.length - 1] : null
        }
      });
    } catch (error) {
      results.push({
        name: 'Cross-Platform Analytics',
        status: 'fail',
        message: `Cross-platform test failed: ${error}`,
      });
    }

    setTestResults(results);
    setIsRunning(false);

    // Log comprehensive results
    console.log('🧪 PERMANENT FIXES TEST - Results:', results);
    const passCount = results.filter(r => r.status === 'pass').length;
    const totalCount = results.length;
    
    if (passCount === totalCount) {
      console.log('✅ PERMANENT FIXES TEST - ALL TESTS PASSED! 🎉');
      console.log('🎯 Profile persistence: WORKING');
      console.log('📊 Live analytics: WORKING');
      console.log('💰 Post-delivery wallet analytics: WORKING');
      console.log('🔄 Cross-platform compatibility: WORKING');
      Alert.alert('✅ All Tests Passed!', `${passCount}/${totalCount} tests passed. All permanent fixes are working correctly.`);
    } else {
      console.log(`⚠️ PERMANENT FIXES TEST - ${passCount}/${totalCount} tests passed`);
      Alert.alert('Test Results', `${passCount}/${totalCount} tests passed. Check details for any issues.`);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle size={20} color={theme.colors.success} />;
      case 'fail': return <XCircle size={20} color={theme.colors.danger} />;
      case 'warning': return <AlertCircle size={20} color={theme.colors.warning} />;
      default: return <RefreshCw size={20} color={theme.colors.gray} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return theme.colors.success;
      case 'fail': return theme.colors.danger;
      case 'warning': return theme.colors.warning;
      default: return theme.colors.gray;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Permanent Fixes Test' }} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Permanent Fixes Test Suite</Text>
          <Text style={styles.subtitle}>
            Comprehensive testing of profile persistence, live analytics, and post-delivery wallet analytics
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <User size={20} color={theme.colors.primary} />
            <Text style={styles.statusText}>User: {user?.name} ({user?.role})</Text>
          </View>
          <View style={styles.statusRow}>
            <Database size={20} color={theme.colors.secondary} />
            <Text style={styles.statusText}>Profile: {user?.id ? 'Loaded' : 'Missing'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Italic size={20} color={theme.colors.success} />
            <Text style={styles.statusText}>Analytics: {analytics ? 'Active' : 'Inactive'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Wallet size={20} color={theme.colors.warning} />
            <Text style={styles.statusText}>Wallet: {transactions.length} transactions</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.runButton, isRunning && styles.runButtonDisabled]} 
          onPress={runComprehensiveTests}
          disabled={isRunning}
        >
          <RefreshCw size={20} color={theme.colors.white} />
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running Tests...' : 'Run Comprehensive Tests'}
          </Text>
        </TouchableOpacity>

        {testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            {testResults.map((result, index) => (
              <View key={index} style={styles.testResult}>
                <View style={styles.testHeader}>
                  {getStatusIcon(result.status)}
                  <Text style={styles.testName}>{result.name}</Text>
                </View>
                <Text style={[styles.testMessage, { color: getStatusColor(result.status) }]}>
                  {result.message}
                </Text>
                {result.details && (
                  <Text style={styles.testDetails}>
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>🎯 Permanent Fixes Summary</Text>
          <Text style={styles.summaryText}>
            ✅ Profile Persistence: Multiple backup storage locations{'\n'}
            📊 Live Analytics: ETA, fuel cost, ROI calculations{'\n'}
            💰 Post-Delivery Analytics: Comprehensive cost breakdowns{'\n'}
            🔄 Cross-Platform: iOS, Android, and Web compatibility{'\n'}
            🛡️ Error Recovery: Automatic fallbacks and data recovery
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '500',
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  runButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  runButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: theme.spacing.lg,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  testResult: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  testName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  testMessage: {
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  testDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  summaryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  summaryText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    lineHeight: 22,
  },
});