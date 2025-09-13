import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';

export default function BackendTestScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>('');
  const [result, setResult] = useState<{ hello: string; date: Date } | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const hiMutation = trpc.example.hi.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  // Test tRPC queries for report analytics
  const graphQuery = trpc.reportAnalytics.graph.useQuery(undefined, {
    enabled: false, // Don't auto-fetch
  });
  const metricsQuery = trpc.reportAnalytics.metrics.useQuery(undefined, {
    enabled: false,
  });
  const bottomRowQuery = trpc.reportAnalytics.bottomRow.useQuery(undefined, {
    enabled: false,
  });

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    hiMutation.mutate({ name: name.trim() });
  };

  const testGraph = async () => {
    addResult('🔄 Testing graph endpoint...');
    try {
      const result = await graphQuery.refetch();
      if (result.data) {
        addResult('✅ Graph endpoint success: ' + JSON.stringify(result.data).substring(0, 100) + '...');
      } else {
        addResult('❌ Graph endpoint returned no data');
      }
    } catch (error) {
      addResult('❌ Graph endpoint error: ' + (error as Error).message);
    }
  };

  const testMetrics = async () => {
    addResult('🔄 Testing metrics endpoint...');
    try {
      const result = await metricsQuery.refetch();
      if (result.data) {
        addResult('✅ Metrics endpoint success: ' + JSON.stringify(result.data).substring(0, 100) + '...');
      } else {
        addResult('❌ Metrics endpoint returned no data');
      }
    } catch (error) {
      addResult('❌ Metrics endpoint error: ' + (error as Error).message);
    }
  };

  const testBottomRow = async () => {
    addResult('🔄 Testing bottom row endpoint...');
    try {
      const result = await bottomRowQuery.refetch();
      if (result.data) {
        addResult('✅ Bottom row endpoint success: ' + JSON.stringify(result.data).substring(0, 100) + '...');
      } else {
        addResult('❌ Bottom row endpoint returned no data');
      }
    } catch (error) {
      addResult('❌ Bottom row endpoint error: ' + (error as Error).message);
    }
  };

  const testAll = async () => {
    addResult('🚀 Starting all tests...');
    await testGraph();
    await testMetrics();
    await testBottomRow();
    addResult('🏁 All tests completed');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Backend Test</Text>
      <Text style={styles.subtitle}>Test the tRPC connection</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Enter your name:</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, hiMutation.isPending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={hiMutation.isPending}
      >
        <Text style={styles.buttonText}>
          {hiMutation.isPending ? 'Sending...' : 'Say Hi'}
        </Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Response from backend:</Text>
          <Text style={styles.resultText}>Hello: {result.hello}</Text>
          <Text style={styles.resultText}>Date: {new Date(result.date).toLocaleString()}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Analytics Tests</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.smallButton} onPress={testGraph}>
            <Text style={styles.smallButtonText}>Test Graph</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={testMetrics}>
            <Text style={styles.smallButtonText}>Test Metrics</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.smallButton} onPress={testBottomRow}>
            <Text style={styles.smallButtonText}>Test Bottom Row</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallButton, styles.primaryButton]} onPress={testAll}>
            <Text style={[styles.smallButtonText, styles.primaryButtonText]}>Test All</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
          <Text style={[styles.buttonText, styles.clearButtonText]}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultTitle}>Test Results:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No tests run yet</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.testResultText}>
              {result}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
  },
  clearButton: {
    backgroundColor: '#ef4444',
  },
  clearButtonText: {
    color: '#fff',
  },
  resultsContainer: {
    marginTop: 20,
  },
  noResults: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  testResultText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
    fontFamily: 'monospace',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
});