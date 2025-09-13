import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Wifi, Database, Shield, Globe } from 'lucide-react-native';
import { testFirebaseConnectivity, ensureFirebaseAuth, getFirebase } from '@/utils/firebase';
import { testFirebaseConnection } from '@/lib/firebase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
  icon: React.ReactNode;
}

export default function FirebaseDiagnosticScreen() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { online } = useOnlineStatus();

  const getStatusIcon = (status: string, size = 20) => {
    const color = status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#6b7280';
    
    switch (status) {
      case 'success':
        return <CheckCircle color={color} size={size} />;
      case 'error':
        return <XCircle color={color} size={size} />;
      case 'warning':
        return <AlertTriangle color={color} size={size} />;
      case 'loading':
        return <ActivityIndicator size="small" color={color} />;
      default:
        return <AlertTriangle color={color} size={size} />;
    }
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Network Connectivity
    diagnostics.push({
      name: 'Network Connectivity',
      status: 'loading',
      message: 'Checking internet connection...',
      icon: <Wifi color="#6b7280" size={20} />,
    });
    setResults([...diagnostics]);

    try {
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      diagnostics[0] = {
        name: 'Network Connectivity',
        status: 'success',
        message: 'Internet connection is working',
        details: `Online status: ${online ? 'Connected' : 'Disconnected'}`,
        icon: <Wifi color="#10b981" size={20} />,
      };
    } catch (error: any) {
      diagnostics[0] = {
        name: 'Network Connectivity',
        status: 'error',
        message: 'No internet connection',
        details: error.message,
        icon: <Wifi color="#ef4444" size={20} />,
      };
    }
    setResults([...diagnostics]);

    // Test 2: Firebase Services Reachability
    diagnostics.push({
      name: 'Firebase Services',
      status: 'loading',
      message: 'Checking Firebase API accessibility...',
      icon: <Globe color="#6b7280" size={20} />,
    });
    setResults([...diagnostics]);

    try {
      await fetch('https://firebase.googleapis.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      diagnostics[1] = {
        name: 'Firebase Services',
        status: 'success',
        message: 'Firebase APIs are reachable',
        icon: <Globe color="#10b981" size={20} />,
      };
    } catch (error: any) {
      diagnostics[1] = {
        name: 'Firebase Services',
        status: 'error',
        message: 'Firebase APIs are not reachable',
        details: 'This may indicate network restrictions or Firebase service issues',
        icon: <Globe color="#ef4444" size={20} />,
      };
    }
    setResults([...diagnostics]);

    // Test 3: Firebase Configuration
    diagnostics.push({
      name: 'Firebase Configuration',
      status: 'loading',
      message: 'Checking Firebase app configuration...',
      icon: <Shield color="#6b7280" size={20} />,
    });
    setResults([...diagnostics]);

    try {
      const { app } = getFirebase();
      const config = app.options;
      diagnostics[2] = {
        name: 'Firebase Configuration',
        status: 'success',
        message: 'Firebase app is properly configured',
        details: `Project: ${config.projectId}, Auth Domain: ${config.authDomain}`,
        icon: <Shield color="#10b981" size={20} />,
      };
    } catch (configError: any) {
      diagnostics[2] = {
        name: 'Firebase Configuration',
        status: 'error',
        message: 'Firebase configuration error',
        details: configError.message,
        icon: <Shield color="#ef4444" size={20} />,
      };
    }
    setResults([...diagnostics]);

    // Test 4: Firebase Authentication
    diagnostics.push({
      name: 'Firebase Authentication',
      status: 'loading',
      message: 'Testing Firebase authentication...',
      icon: <Shield color="#6b7280" size={20} />,
    });
    setResults([...diagnostics]);

    try {
      const authResult = await ensureFirebaseAuth();
      if (authResult) {
        const { auth } = getFirebase();
        diagnostics[3] = {
          name: 'Firebase Authentication',
          status: 'success',
          message: 'Authentication successful',
          details: `User ID: ${auth.currentUser?.uid}, Anonymous: ${auth.currentUser?.isAnonymous}`,
          icon: <Shield color="#10b981" size={20} />,
        };
      } else {
        diagnostics[3] = {
          name: 'Firebase Authentication',
          status: 'error',
          message: 'Authentication failed',
          details: 'Unable to sign in anonymously',
          icon: <Shield color="#ef4444" size={20} />,
        };
      }
    } catch (error: any) {
      diagnostics[3] = {
        name: 'Firebase Authentication',
        status: 'error',
        message: 'Authentication error',
        details: `${error.code}: ${error.message}`,
        icon: <Shield color="#ef4444" size={20} />,
      };
    }
    setResults([...diagnostics]);

    // Test 5: Firestore Connection
    diagnostics.push({
      name: 'Firestore Database',
      status: 'loading',
      message: 'Testing Firestore connection...',
      icon: <Database color="#6b7280" size={20} />,
    });
    setResults([...diagnostics]);

    try {
      const firestoreResult = await testFirebaseConnection();
      if (firestoreResult.success) {
        diagnostics[4] = {
          name: 'Firestore Database',
          status: 'success',
          message: 'Firestore connection successful',
          details: `Project: ${firestoreResult.projectId}, Docs found: ${firestoreResult.docsFound}`,
          icon: <Database color="#10b981" size={20} />,
        };
      } else {
        diagnostics[4] = {
          name: 'Firestore Database',
          status: 'error',
          message: 'Firestore connection failed',
          details: `${firestoreResult.code}: ${firestoreResult.error}`,
          icon: <Database color="#ef4444" size={20} />,
        };
      }
    } catch (error: any) {
      diagnostics[4] = {
        name: 'Firestore Database',
        status: 'error',
        message: 'Firestore test error',
        details: error.message,
        icon: <Database color="#ef4444" size={20} />,
      };
    }
    setResults([...diagnostics]);

    // Test 6: Comprehensive Firebase Test
    diagnostics.push({
      name: 'Comprehensive Test',
      status: 'loading',
      message: 'Running comprehensive Firebase connectivity test...',
      icon: <CheckCircle color="#6b7280" size={20} />,
    });
    setResults([...diagnostics]);

    try {
      const comprehensiveResult = await testFirebaseConnectivity();
      if (comprehensiveResult.connected) {
        diagnostics[5] = {
          name: 'Comprehensive Test',
          status: 'success',
          message: 'All Firebase services are working',
          details: 'Network, Auth, and Firestore are all functional',
          icon: <CheckCircle color="#10b981" size={20} />,
        };
      } else {
        const issues = [];
        if (!comprehensiveResult.details.networkOnline) issues.push('Network');
        if (!comprehensiveResult.details.firebaseReachable) issues.push('Firebase API');
        if (!comprehensiveResult.details.authWorking) issues.push('Authentication');
        if (!comprehensiveResult.details.firestoreWorking) issues.push('Firestore');
        
        diagnostics[5] = {
          name: 'Comprehensive Test',
          status: 'warning',
          message: 'Some Firebase services have issues',
          details: `Issues with: ${issues.join(', ')}`,
          icon: <AlertTriangle color="#f59e0b" size={20} />,
        };
      }
    } catch (error: any) {
      diagnostics[5] = {
        name: 'Comprehensive Test',
        status: 'error',
        message: 'Comprehensive test failed',
        details: error.message,
        icon: <XCircle color="#ef4444" size={20} />,
      };
    }
    setResults([...diagnostics]);

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRecommendations = () => {
    const hasNetworkIssues = results.some(r => r.name === 'Network Connectivity' && r.status === 'error');
    const hasFirebaseIssues = results.some(r => r.name.includes('Firebase') && r.status === 'error');
    const hasAuthIssues = results.some(r => r.name === 'Firebase Authentication' && r.status === 'error');

    const recommendations = [];

    if (hasNetworkIssues) {
      recommendations.push('• Check your internet connection');
      recommendations.push('• Try switching between WiFi and mobile data');
      recommendations.push('• Disable VPN if active');
    }

    if (hasFirebaseIssues) {
      recommendations.push('• Firebase services may be temporarily unavailable');
      recommendations.push('• Check Firebase status at https://status.firebase.google.com');
      recommendations.push('• Verify your network allows connections to Firebase');
    }

    if (hasAuthIssues) {
      recommendations.push('• Authentication issues may be temporary');
      recommendations.push('• The app will work in offline mode with limited functionality');
    }

    if (recommendations.length === 0) {
      recommendations.push('• All systems are working normally');
      recommendations.push('• If you\'re still experiencing issues, try restarting the app');
    }

    return recommendations;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Firebase Connection Diagnostics</Text>
          <Text style={styles.subtitle}>
            Checking Firebase connectivity and identifying potential issues
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, isRunning && styles.refreshButtonDisabled]}
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          <RefreshCw color="#ffffff" size={16} />
          <Text style={styles.refreshButtonText}>
            {isRunning ? 'Running Tests...' : 'Run Tests Again'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resultsContainer}>
          {results.map((result, index) => (
            <View key={`result-${result.name}-${index}`} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                {result.icon}
                <Text style={styles.resultName}>{result.name}</Text>
                {getStatusIcon(result.status, 16)}
              </View>
              <Text style={[styles.resultMessage, { color: result.status === 'success' ? '#10b981' : result.status === 'error' ? '#ef4444' : '#f59e0b' }]}>
                {result.message}
              </Text>
              {result.details && (
                <Text style={styles.resultDetails}>{result.details}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {getRecommendations().map((rec, index) => (
            <Text key={`rec-${index}`} style={styles.recommendationItem}>{rec}</Text>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>About This Error</Text>
          <Text style={styles.infoText}>
            The &quot;Could not reach Cloud Firestore backend&quot; error typically occurs when:
          </Text>
          <Text style={styles.infoText}>
            • Your device has no internet connection
          </Text>
          <Text style={styles.infoText}>
            • Firebase services are temporarily unavailable
          </Text>
          <Text style={styles.infoText}>
            • Network restrictions block Firebase connections
          </Text>
          <Text style={styles.infoText}>
            • Authentication issues prevent database access
          </Text>
          <Text style={styles.infoText}>
            The app will continue to work in offline mode with cached data.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  refreshButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  recommendationsContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
});