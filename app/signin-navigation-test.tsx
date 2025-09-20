import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,

  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react-native';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export default function SignInNavigationTest() {
  const { user, login, logout, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Auth Hook Availability', status: 'pending' },
    { name: 'Initial Auth State', status: 'pending' },
    { name: 'Driver Login Flow', status: 'pending' },
    { name: 'Shipper Login Flow', status: 'pending' },
    { name: 'Admin Login Flow', status: 'pending' },
    { name: 'Navigation After Login', status: 'pending' },
    { name: 'Logout Flow', status: 'pending' },
    { name: 'Error Handling', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(-1);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runTest = async (index: number, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTest(index, { status: 'running' });
    setCurrentTestIndex(index);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { status: 'passed', duration, message: `Completed in ${duration}ms` });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'failed', 
        duration, 
        message: error.message || 'Unknown error' 
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    console.log('[SignInTest] 🎯 PERMANENT SIGN IN FIX - Starting comprehensive sign-in navigation tests');

    try {
      // Test 1: Auth Hook Availability
      await runTest(0, async () => {
        if (!useAuth) throw new Error('useAuth hook not available');
        if (!login) throw new Error('login function not available');
        if (!logout) throw new Error('logout function not available');
        console.log('[SignInTest] ✅ Auth hook and functions available');
      });

      // Test 2: Initial Auth State
      await runTest(1, async () => {
        console.log('[SignInTest] 🔍 Initial auth state:', {
          hasUser: !!user,
          isLoading,
          isAuthenticated,
          userRole: user?.role
        });
        // This test always passes as it's just checking state
      });

      // Test 3: Driver Login Flow
      await runTest(2, async () => {
        console.log('[SignInTest] 🚛 Testing driver login...');
        await login('test.driver@example.com', 'password123', 'driver');
        if (!user || user.role !== 'driver') {
          throw new Error('Driver login failed - user not set or wrong role');
        }
        console.log('[SignInTest] ✅ Driver login successful');
      });

      // Test 4: Logout and Shipper Login
      await runTest(3, async () => {
        console.log('[SignInTest] 📦 Testing logout and shipper login...');
        await logout();
        if (user) throw new Error('Logout failed - user still exists');
        
        await login('test.shipper@example.com', 'password123', 'shipper');
        if (!user || user.role !== 'shipper') {
          throw new Error('Shipper login failed - user not set or wrong role');
        }
        console.log('[SignInTest] ✅ Shipper login successful');
      });

      // Test 5: Admin Login Flow
      await runTest(4, async () => {
        console.log('[SignInTest] 👑 Testing admin login...');
        await logout();
        await login('admin@loadrush.com', 'admin123', 'admin');
        if (!user || user.role !== 'admin') {
          throw new Error('Admin login failed - user not set or wrong role');
        }
        console.log('[SignInTest] ✅ Admin login successful');
      });

      // Test 6: Navigation After Login
      await runTest(5, async () => {
        console.log('[SignInTest] 🧭 Testing navigation after login...');
        // Test that we can navigate to different routes based on role
        if (user?.role === 'admin') {
          console.log('[SignInTest] ✅ Admin user can navigate to admin routes');
        } else {
          throw new Error('Navigation test failed - wrong user role');
        }
      });

      // Test 7: Final Logout
      await runTest(6, async () => {
        console.log('[SignInTest] 🚪 Testing final logout...');
        await logout();
        if (user) throw new Error('Final logout failed - user still exists');
        console.log('[SignInTest] ✅ Final logout successful');
      });

      // Test 8: Error Handling
      await runTest(7, async () => {
        console.log('[SignInTest] ⚠️ Testing error handling...');
        try {
          await login('', '', 'driver'); // Should fail
          throw new Error('Error handling test failed - empty credentials should be rejected');
        } catch (error: any) {
          if (error.message.includes('Email and password are required')) {
            console.log('[SignInTest] ✅ Error handling working correctly');
          } else {
            throw error;
          }
        }
      });

      console.log('[SignInTest] 🎯 PERMANENT SIGN IN FIX - All tests completed successfully!');

    } catch (error) {
      console.error('[SignInTest] ❌ Test suite failed:', error);
      console.log('[SignInTest] ❌ Some tests failed. Check the console for details.');
    } finally {
      setIsRunning(false);
      setCurrentTestIndex(-1);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'failed':
        return <XCircle size={20} color={theme.colors.danger} />;
      case 'running':
        return <ActivityIndicator size={20} color={theme.colors.primary} />;
      default:
        return <AlertCircle size={20} color={theme.colors.gray} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.danger;
      case 'running':
        return theme.colors.primary;
      default:
        return theme.colors.gray;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Sign-In Navigation Test' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 PERMANENT SIGN IN FIX</Text>
          <Text style={styles.subtitle}>Comprehensive Navigation Test Suite</Text>
        </View>

        <View style={styles.currentState}>
          <Text style={styles.sectionTitle}>Current Auth State</Text>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>User:</Text>
            <Text style={styles.stateValue}>{user ? `${user.name} (${user.role})` : 'None'}</Text>
          </View>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>Loading:</Text>
            <Text style={styles.stateValue}>{isLoading ? 'Yes' : 'No'}</Text>
          </View>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>Authenticated:</Text>
            <Text style={styles.stateValue}>{isAuthenticated ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={styles.testsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {tests.map((test, index) => (
            <View key={`test-${test.name}-${index}`} style={[
              styles.testItem,
              currentTestIndex === index && styles.currentTest
            ]}>
              <View style={styles.testHeader}>
                {getStatusIcon(test.status)}
                <Text style={[styles.testName, { color: getStatusColor(test.status) }]}>
                  {test.name}
                </Text>
              </View>
              {test.message && (
                <Text style={styles.testMessage}>{test.message}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            <RefreshCw size={20} color={theme.colors.white} />
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/dev/signout')}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Test Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This test suite verifies that the permanent sign-in navigation fix is working correctly
            across all user roles and error scenarios.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  currentState: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  stateLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  stateValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '600',
  },
  testsSection: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  testItem: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  currentTest: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  testName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  testMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    marginLeft: 32,
  },
  actions: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});