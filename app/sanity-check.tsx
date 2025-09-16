import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { testFirebaseConnectivity, ensureFirebaseAuth } from '@/utils/firebase';
import { trpcClient } from '@/lib/trpc';
import { API_BASE_URL, hasMapbox, hasORS, MAPBOX_TOKEN, ORS_API_KEY } from '@/utils/env';
import { useAuth } from '@/hooks/useAuth';
import HeaderBack from '@/components/HeaderBack';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'loading';
  message: string;
  details?: string;
  fix?: string;
}

interface SanityCheckResults {
  network: CheckResult;
  firebase: CheckResult;
  auth: CheckResult;
  backend: CheckResult;
  trpc: CheckResult;
  apis: CheckResult;
  navigation: CheckResult;
  photoUpload: CheckResult;
  aiServices: CheckResult;
}

export default function SanityCheckScreen() {
  const { online } = useOnlineStatus();
  const { user, isAuthenticated } = useAuth();
  const [results, setResults] = useState<SanityCheckResults>({
    network: { name: 'Network Connectivity', status: 'loading', message: 'Checking...' },
    firebase: { name: 'Firebase Connection', status: 'loading', message: 'Checking...' },
    auth: { name: 'Authentication', status: 'loading', message: 'Checking...' },
    backend: { name: 'Backend API', status: 'loading', message: 'Checking...' },
    trpc: { name: 'tRPC Client', status: 'loading', message: 'Checking...' },
    apis: { name: 'External APIs', status: 'loading', message: 'Checking...' },
    navigation: { name: 'Navigation Services', status: 'loading', message: 'Checking...' },
    photoUpload: { name: 'Photo Upload', status: 'loading', message: 'Checking...' },
    aiServices: { name: 'AI Services', status: 'loading', message: 'Checking...' },
  });
  const [isRunning, setIsRunning] = useState(false);


  const updateResult = (key: keyof SanityCheckResults, result: Partial<CheckResult>) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...prev[key], ...result }
    }));
  };

  const checkNetwork = async () => {
    try {
      updateResult('network', { status: 'loading', message: 'Testing connectivity...' });
      
      if (!online) {
        updateResult('network', {
          status: 'fail',
          message: 'No internet connection',
          fix: 'Check your internet connection and try again'
        });
        return;
      }

      // Test basic connectivity
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      
      updateResult('network', {
        status: 'pass',
        message: 'Internet connection active',
        details: 'Network connectivity verified'
      });
    } catch (error) {
      updateResult('network', {
        status: 'fail',
        message: 'Network connectivity failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check your internet connection'
      });
    }
  };

  const checkFirebase = async () => {
    try {
      updateResult('firebase', { status: 'loading', message: 'Testing Firebase...' });
      
      const connectivity = await testFirebaseConnectivity();
      
      if (connectivity.connected) {
        updateResult('firebase', {
          status: 'pass',
          message: 'Firebase connected',
          details: `Auth: ${connectivity.details.authWorking ? '✓' : '✗'}, Firestore: ${connectivity.details.firestoreWorking ? '✓' : '✗'}`
        });
      } else {
        updateResult('firebase', {
          status: 'fail',
          message: 'Firebase connection failed',
          details: connectivity.error || 'Unknown error',
          fix: 'Check Firebase configuration and network'
        });
      }
    } catch (error) {
      updateResult('firebase', {
        status: 'fail',
        message: 'Firebase test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check Firebase configuration'
      });
    }
  };

  const checkAuth = async () => {
    try {
      updateResult('auth', { status: 'loading', message: 'Testing authentication...' });
      
      if (isAuthenticated && user) {
        updateResult('auth', {
          status: 'pass',
          message: 'User authenticated',
          details: `Role: ${user.role}, Email: ${user.email || 'N/A'}`
        });
      } else {
        // Try to authenticate
        const authSuccess = await ensureFirebaseAuth();
        if (authSuccess) {
          updateResult('auth', {
            status: 'pass',
            message: 'Authentication successful',
            details: 'Anonymous authentication working'
          });
        } else {
          updateResult('auth', {
            status: 'fail',
            message: 'Authentication failed',
            fix: 'Check Firebase Auth configuration'
          });
        }
      }
    } catch (error) {
      updateResult('auth', {
        status: 'fail',
        message: 'Authentication test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check authentication setup'
      });
    }
  };

  const checkBackend = async () => {
    try {
      updateResult('backend', { status: 'loading', message: 'Testing backend API...' });
      
      if (!API_BASE_URL) {
        updateResult('backend', {
          status: 'fail',
          message: 'Backend URL not configured',
          fix: 'Set EXPO_PUBLIC_RORK_API_BASE_URL in .env'
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        updateResult('backend', {
          status: 'pass',
          message: 'Backend API accessible',
          details: `Status: ${data.status || 'ok'}`
        });
      } else {
        updateResult('backend', {
          status: 'fail',
          message: `Backend API error: ${response.status}`,
          fix: 'Check backend deployment and URL'
        });
      }
    } catch (error) {
      updateResult('backend', {
        status: 'fail',
        message: 'Backend API unreachable',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check backend URL and deployment'
      });
    }
  };

  const checkTRPC = async () => {
    try {
      updateResult('trpc', { status: 'loading', message: 'Testing tRPC...' });
      
      const result = await trpcClient.example.hi.mutate({ name: 'test' });
      
      updateResult('trpc', {
        status: 'pass',
        message: 'tRPC client working',
        details: `Response: ${result}`
      });
    } catch (error) {
      updateResult('trpc', {
        status: 'fail',
        message: 'tRPC client failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check tRPC configuration and backend'
      });
    }
  };

  const checkAPIs = async () => {
    try {
      updateResult('apis', { status: 'loading', message: 'Testing external APIs...' });
      
      const apiStatus = [];
      
      if (hasMapbox) {
        apiStatus.push('Mapbox: ✓');
      } else {
        apiStatus.push('Mapbox: ✗');
      }
      
      if (hasORS) {
        apiStatus.push('OpenRoute: ✓');
      } else {
        apiStatus.push('OpenRoute: ✗');
      }
      
      // Test AI service
      try {
        const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }]
          }),
        });
        
        if (aiResponse.ok) {
          apiStatus.push('AI Service: ✓');
        } else {
          apiStatus.push('AI Service: ✗');
        }
      } catch {
        apiStatus.push('AI Service: ✗');
      }
      
      const hasWorkingAPIs = apiStatus.some(status => status.includes('✓'));
      
      updateResult('apis', {
        status: hasWorkingAPIs ? 'pass' : 'warning',
        message: hasWorkingAPIs ? 'External APIs available' : 'Some APIs unavailable',
        details: apiStatus.join(', '),
        fix: hasWorkingAPIs ? undefined : 'Check API keys in .env file'
      });
    } catch (error) {
      updateResult('apis', {
        status: 'fail',
        message: 'API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const checkNavigation = async () => {
    try {
      updateResult('navigation', { status: 'loading', message: 'Testing navigation...' });
      
      if (!hasMapbox && !hasORS) {
        updateResult('navigation', {
          status: 'warning',
          message: 'No navigation API keys',
          details: 'Navigation will use fallback mode',
          fix: 'Add MAPBOX_TOKEN or ORS_API_KEY to .env'
        });
        return;
      }
      
      // Test navigation API
      try {
        const testRoute = await trpcClient.route.eta.query({
          origin: { lat: 40.7128, lon: -74.0060 },
          destination: { lat: 34.0522, lon: -118.2437 },
          provider: hasMapbox ? 'mapbox' : 'ors',
          mapboxToken: hasMapbox ? MAPBOX_TOKEN : undefined,
          orsKey: hasORS ? ORS_API_KEY : undefined,
          profile: 'driving-hgv',
        });
        
        updateResult('navigation', {
          status: 'pass',
          message: 'Navigation services working',
          details: `Duration: ${Math.round((testRoute.durationSec || 0) / 3600)}h, Distance: ${Math.round((testRoute.distanceMeters || 0) / 1609)}mi`
        });
      } catch (navError) {
        updateResult('navigation', {
          status: 'fail',
          message: 'Navigation API failed',
          details: navError instanceof Error ? navError.message : 'Unknown error',
          fix: 'Check navigation API keys and backend'
        });
      }
    } catch (error) {
      updateResult('navigation', {
        status: 'fail',
        message: 'Navigation test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const checkPhotoUpload = async () => {
    try {
      updateResult('photoUpload', { status: 'loading', message: 'Testing photo upload...' });
      
      // Check Firebase Storage configuration
      const { getFirebase } = await import('@/utils/firebase');
      const { storage } = getFirebase();
      
      if (storage) {
        updateResult('photoUpload', {
          status: 'pass',
          message: 'Photo upload ready',
          details: 'Firebase Storage configured'
        });
      } else {
        updateResult('photoUpload', {
          status: 'fail',
          message: 'Photo upload not configured',
          fix: 'Check Firebase Storage setup'
        });
      }
    } catch (error) {
      updateResult('photoUpload', {
        status: 'fail',
        message: 'Photo upload test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check Firebase Storage configuration'
      });
    }
  };

  const checkAIServices = async () => {
    try {
      updateResult('aiServices', { status: 'loading', message: 'Testing AI services...' });
      
      // Test AI text generation
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello, this is a test.' }]
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        updateResult('aiServices', {
          status: 'pass',
          message: 'AI services working',
          details: `Response length: ${data.completion?.length || 0} chars`
        });
      } else {
        updateResult('aiServices', {
          status: 'fail',
          message: `AI service error: ${response.status}`,
          fix: 'Check AI service availability'
        });
      }
    } catch (error) {
      updateResult('aiServices', {
        status: 'fail',
        message: 'AI services failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Check AI service configuration'
      });
    }
  };

  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    
    try {
      // Run checks in sequence to avoid overwhelming the system
      await checkNetwork();
      await checkFirebase();
      await checkAuth();
      await checkBackend();
      await checkTRPC();
      await checkAPIs();
      await checkNavigation();
      await checkPhotoUpload();
      await checkAIServices();
    } catch (error) {
      console.error('Sanity check failed:', error);
    } finally {
      setIsRunning(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, isAuthenticated, user]);



  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'fail':
        return <XCircle size={20} color={theme.colors.danger} />;
      case 'warning':
        return <AlertCircle size={20} color={theme.colors.warning} />;
      case 'loading':
        return <ActivityIndicator size="small" color={theme.colors.primary} />;
    }
  };

  const getStatusColor = (status: CheckResult['status']) => {
    switch (status) {
      case 'pass':
        return theme.colors.success;
      case 'fail':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.warning;
      case 'loading':
        return theme.colors.gray;
    }
  };

  const overallStatus = Object.values(results).every(r => r.status === 'pass') ? 'pass' :
                       Object.values(results).some(r => r.status === 'fail') ? 'fail' : 'warning';

  const failedChecks = Object.values(results).filter(r => r.status === 'fail').length;
  const warningChecks = Object.values(results).filter(r => r.status === 'warning').length;
  const passedChecks = Object.values(results).filter(r => r.status === 'pass').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <HeaderBack />
        <Text style={styles.headerTitle}>System Sanity Check</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Overall Status */}
        <View style={[styles.overallCard, { borderColor: getStatusColor(overallStatus) }]}>
          <View style={styles.overallHeader}>
            {getStatusIcon(overallStatus)}
            <Text style={[styles.overallTitle, { color: getStatusColor(overallStatus) }]}>
              {overallStatus === 'pass' ? 'All Systems Operational' :
               overallStatus === 'fail' ? 'Issues Detected' : 'Some Warnings'}
            </Text>
            {online ? <Wifi size={20} color={theme.colors.success} /> : <WifiOff size={20} color={theme.colors.danger} />}
          </View>
          
          <View style={styles.statusSummary}>
            <Text style={styles.statusText}>✓ {passedChecks} Passed</Text>
            {warningChecks > 0 && <Text style={styles.statusText}>⚠ {warningChecks} Warnings</Text>}
            {failedChecks > 0 && <Text style={styles.statusText}>✗ {failedChecks} Failed</Text>}
          </View>
        </View>

        {/* Individual Checks */}
        {Object.entries(results).map(([key, result]) => (
          <View key={key} style={styles.checkCard}>
            <View style={styles.checkHeader}>
              {getStatusIcon(result.status)}
              <Text style={styles.checkName}>{result.name}</Text>
            </View>
            
            <Text style={[styles.checkMessage, { color: getStatusColor(result.status) }]}>
              {result.message}
            </Text>
            
            {result.details && (
              <Text style={styles.checkDetails}>{result.details}</Text>
            )}
            
            {result.fix && (
              <View style={styles.fixContainer}>
                <Text style={styles.fixLabel}>Fix:</Text>
                <Text style={styles.fixText}>{result.fix}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.retryButton, isRunning && styles.retryButtonDisabled]}
          onPress={runAllChecks}
          disabled={isRunning}
        >
          <RefreshCw size={20} color={theme.colors.white} />
          <Text style={styles.retryButtonText}>
            {isRunning ? 'Running Checks...' : 'Run All Checks Again'}
          </Text>
        </TouchableOpacity>

        {/* Environment Info */}
        <View style={styles.envCard}>
          <Text style={styles.envTitle}>Environment Info</Text>
          <Text style={styles.envText}>API Base: {API_BASE_URL || 'Not set'}</Text>
          <Text style={styles.envText}>Mapbox: {hasMapbox ? 'Configured' : 'Not configured'}</Text>
          <Text style={styles.envText}>OpenRoute: {hasORS ? 'Configured' : 'Not configured'}</Text>
          <Text style={styles.envText}>User: {user?.email || 'Not authenticated'}</Text>
          <Text style={styles.envText}>Role: {user?.role || 'N/A'}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  overallCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  overallTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  statusSummary: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  checkCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  checkName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginLeft: theme.spacing.sm,
  },
  checkMessage: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginBottom: theme.spacing.xs,
  },
  checkDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  fixContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  fixLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  fixText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  retryButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  envCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  envTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  envText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
});