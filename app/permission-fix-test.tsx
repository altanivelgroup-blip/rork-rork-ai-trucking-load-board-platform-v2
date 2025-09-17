import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureFirebaseAuth, checkFirebasePermissions, testFirebaseConnectivity } from '@/utils/firebase';
import { useLoads } from '@/hooks/useLoads';
import { theme } from '@/constants/theme';

export default function PermissionFixTest() {
  const [authStatus, setAuthStatus] = useState<string>('Not tested');
  const [permissionStatus, setPermissionStatus] = useState<string>('Not tested');
  const [connectivityStatus, setConnectivityStatus] = useState<string>('Not tested');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { refreshLoads, loads, syncStatus, lastSyncTime } = useLoads();

  const testAuth = async () => {
    setIsLoading(true);
    try {
      console.log('[PERMISSION_TEST] Testing Firebase authentication...');
      const success = await ensureFirebaseAuth();
      setAuthStatus(success ? '✅ Authentication successful' : '❌ Authentication failed');
    } catch (error: any) {
      setAuthStatus(`❌ Auth error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPermissions = async () => {
    setIsLoading(true);
    try {
      console.log('[PERMISSION_TEST] Testing Firebase permissions...');
      const result = await checkFirebasePermissions();
      if (result.canRead && result.canWrite) {
        setPermissionStatus('✅ Read and write permissions working');
      } else if (result.canRead) {
        setPermissionStatus('⚠️ Read works, write failed');
      } else {
        setPermissionStatus(`❌ Permission error: ${result.error}`);
      }
    } catch (error: any) {
      setPermissionStatus(`❌ Permission test error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnectivity = async () => {
    setIsLoading(true);
    try {
      console.log('[PERMISSION_TEST] Testing Firebase connectivity...');
      const result = await testFirebaseConnectivity();
      if (result.connected) {
        setConnectivityStatus('✅ Firebase connectivity working');
      } else {
        setConnectivityStatus(`❌ Connectivity error: ${result.error}`);
      }
    } catch (error: any) {
      setConnectivityStatus(`❌ Connectivity test error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadsRefresh = async () => {
    setIsLoading(true);
    try {
      console.log('[PERMISSION_TEST] Testing loads refresh...');
      await refreshLoads();
      console.log('[PERMISSION_TEST] Loads refresh completed');
    } catch (error: any) {
      console.error('[PERMISSION_TEST] Loads refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    await testAuth();
    await testPermissions();
    await testConnectivity();
    await testLoadsRefresh();
  };

  useEffect(() => {
    // Auto-run tests on mount
    runAllTests();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Permission Fix Test</Text>
        <Text style={styles.subtitle}>Testing Firebase authentication and permissions</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Firebase Auth:</Text>
            <Text style={styles.testResult}>{authStatus}</Text>
          </View>

          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Permissions:</Text>
            <Text style={styles.testResult}>{permissionStatus}</Text>
          </View>

          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Connectivity:</Text>
            <Text style={styles.testResult}>{connectivityStatus}</Text>
          </View>

          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Loads Sync Status:</Text>
            <Text style={styles.testResult}>{syncStatus}</Text>
          </View>

          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Loads Count:</Text>
            <Text style={styles.testResult}>{loads.length} loads</Text>
          </View>

          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Last Sync:</Text>
            <Text style={styles.testResult}>
              {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={testAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={testPermissions}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={testConnectivity}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Connectivity</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={testLoadsRefresh}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Loads Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]} 
            onPress={runAllTests}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>Run All Tests</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Running tests...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 16,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
    flex: 1,
  },
  testResult: {
    fontSize: 14,
    color: theme.colors.gray,
    flex: 2,
    textAlign: 'right',
  },
  buttonSection: {
    gap: 12,
  },
  button: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  primaryButtonText: {
    color: theme.colors.white,
  },
  loadingIndicator: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.gray,
  },
});