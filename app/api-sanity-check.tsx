import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpcClient } from '@/lib/trpc';
import { theme } from '@/constants/theme';
import {
  API_BASE_URL,
  MAPBOX_TOKEN,
  ORS_API_KEY,
  EIA_API_KEY,
  OPENWEATHER_API_KEY,
  hasApiBaseUrl,
  hasMapbox,
  hasORS,
  hasEIA,
  hasOpenWeather,
} from '@/utils/env';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message: string;
  duration?: number;
  data?: any;
}

export default function ApiSanityCheckScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const insets = useSafeAreaInsets();

  const updateResult = useCallback((index: number, result: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...result } : r));
  }, []);

  const runAllTests = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);

    const runTest = async (test: TestResult, index: number, testFn: () => Promise<any>) => {
      const startTime = Date.now();
      updateResult(index, { status: 'pending' });
      
      try {
        const data = await testFn();
        const duration = Date.now() - startTime;
        updateResult(index, {
          status: 'success',
          message: 'Test passed',
          duration,
          data: typeof data === 'object' ? JSON.stringify(data).slice(0, 100) + '...' : String(data)
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        updateResult(index, {
          status: 'error',
          message: error?.message || 'Test failed',
          duration
        });
      }
    };
    
    const tests: TestResult[] = [
      { name: 'API Base Health Check', status: 'pending', message: 'Testing base API endpoint...' },
      { name: 'tRPC Backend Connection', status: 'pending', message: 'Testing tRPC backend...' },
      { name: 'Report Analytics - Graph', status: 'pending', message: 'Testing report analytics graph endpoint...' },
      { name: 'Report Analytics - Metrics', status: 'pending', message: 'Testing report analytics metrics endpoint...' },
      { name: 'Report Analytics - Bottom Row', status: 'pending', message: 'Testing report analytics bottom row endpoint...' },
      { name: 'Mapbox Geocoding', status: 'pending', message: 'Testing Mapbox geocoding API...' },
      { name: 'OpenRouteService Routing', status: 'pending', message: 'Testing ORS routing API...' },
      { name: 'EIA Fuel Prices', status: 'pending', message: 'Testing EIA fuel price API...' },
      { name: 'OpenWeather API', status: 'pending', message: 'Testing OpenWeather API...' },
      { name: 'AI Text Generation', status: 'pending', message: 'Testing AI text generation...' },
      { name: 'AI Image Generation', status: 'pending', message: 'Testing AI image generation...' },
      { name: 'Speech-to-Text', status: 'pending', message: 'Testing speech-to-text API...' }
    ];
    
    setResults(tests);

    // Test 1: API Base Health
    await runTest(tests[0], 0, async () => {
      if (!hasApiBaseUrl) throw new Error('Missing EXPO_PUBLIC_RORK_API_BASE_URL');
      const response = await fetch(`${API_BASE_URL}/api`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    });

    // Test 2: tRPC Backend
    await runTest(tests[1], 1, async () => {
      return await trpcClient.example.hi.mutate({ name: 'SanityCheck' });
    });

    // Test 3: Report Analytics - Graph
    await runTest(tests[2], 2, async () => {
      return await trpcClient.reportAnalytics.graph.query({ period: 'weekly' });
    });

    // Test 4: Report Analytics - Metrics
    await runTest(tests[3], 3, async () => {
      return await trpcClient.reportAnalytics.metrics.query({ period: 'weekly' });
    });

    // Test 5: Report Analytics - Bottom Row
    await runTest(tests[4], 4, async () => {
      return await trpcClient.reportAnalytics.bottomRow.query({ period: 'weekly' });
    });

    // Test 6: Mapbox Geocoding
    if (hasMapbox) {
      await runTest(tests[5], 5, async () => {
        return await trpcClient.geocode.search.query({
          q: 'Dallas, TX',
          provider: 'mapbox',
          mapboxToken: MAPBOX_TOKEN!
        });
      });
    } else {
      updateResult(5, { status: 'skipped', message: 'Mapbox token not configured' });
    }

    // Test 7: OpenRouteService
    if (hasORS) {
      await runTest(tests[6], 6, async () => {
        return await trpcClient.route.eta.query({
          origin: { lat: 32.7767, lon: -96.7970 }, // Dallas
          destination: { lat: 29.7604, lon: -95.3698 }, // Houston
          provider: 'ors',
          orsKey: ORS_API_KEY!,
          profile: 'driving-hgv'
        });
      });
    } else {
      updateResult(6, { status: 'skipped', message: 'ORS API key not configured' });
    }

    // Test 8: EIA Fuel Prices
    if (hasEIA) {
      await runTest(tests[7], 7, async () => {
        return await trpcClient.fuel.eiaDiesel.query({
          state: 'Texas',
          eiaApiKey: EIA_API_KEY!
        });
      });
    } else {
      updateResult(7, { status: 'skipped', message: 'EIA API key not configured' });
    }

    // Test 9: OpenWeather
    if (hasOpenWeather) {
      await runTest(tests[8], 8, async () => {
        return await trpcClient.weather.current.query({
          lat: 40.7128,
          lon: -74.0060, // NYC
          openWeatherKey: OPENWEATHER_API_KEY!
        });
      });
    } else {
      updateResult(8, { status: 'skipped', message: 'OpenWeather API key not configured' });
    }

    // Test 10: AI Text Generation
    await runTest(tests[9], 9, async () => {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'Say "API test successful" in exactly those words.'
          }]
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    });

    // Test 11: AI Image Generation
    await runTest(tests[10], 10, async () => {
      const response = await fetch('https://toolkit.rork.com/images/generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A simple red circle on white background',
          size: '512x512'
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { hasImage: !!data.image?.base64Data, size: data.size };
    });

    // Test 12: Speech-to-Text (just test endpoint availability)
    await runTest(tests[11], 11, async () => {
      // Just test if the endpoint is reachable with a HEAD request
      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'OPTIONS'
      });
      // STT endpoint should return CORS headers for OPTIONS
      return { available: response.status < 500 };
    });

    setIsRunning(false);
  }, [isRunning, updateResult]);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#16A34A';
      case 'error': return '#DC2626';
      case 'pending': return '#F59E0B';
      case 'skipped': return '#6B7280';
      default: return theme.colors.gray;
    }
  };

  const getStatusText = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'PASS';
      case 'error': return 'FAIL';
      case 'pending': return 'RUNNING';
      case 'skipped': return 'SKIPPED';
      default: return '—';
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'API Sanity Check' }} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>API Health Status</Text>
          <Text style={styles.subtitle}>
            Testing all API endpoints and services
          </Text>
        </View>

        {results.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: '#16A34A' }]}>✓ {successCount} Passed</Text>
              <Text style={[styles.summaryText, { color: '#DC2626' }]}>✗ {errorCount} Failed</Text>
              <Text style={[styles.summaryText, { color: '#6B7280' }]}>— {skippedCount} Skipped</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running Tests...' : 'Run All API Tests'}
          </Text>
        </TouchableOpacity>

        <View style={styles.results}>
          {results.map((result, index) => (
            <View key={`${result.name}-${index}`} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                  {getStatusText(result.status)}
                </Text>
              </View>
              
              <Text style={styles.resultMessage}>{result.message}</Text>
              
              {result.duration && (
                <Text style={styles.resultDuration}>
                  Duration: {result.duration}ms
                </Text>
              )}
              
              {result.data && (
                <Text style={styles.resultData} numberOfLines={2}>
                  Data: {result.data}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.envInfo}>
          <Text style={styles.envTitle}>Environment Configuration</Text>
          <Text style={styles.envItem}>API Base: {API_BASE_URL || 'Not set'}</Text>
          <Text style={styles.envItem}>Mapbox: {hasMapbox ? 'Configured' : 'Not configured'}</Text>
          <Text style={styles.envItem}>ORS: {hasORS ? 'Configured' : 'Not configured'}</Text>
          <Text style={styles.envItem}>EIA: {hasEIA ? 'Configured' : 'Not configured'}</Text>
          <Text style={styles.envItem}>OpenWeather: {hasOpenWeather ? 'Configured' : 'Not configured'}</Text>
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
  scroll: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
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
  },
  summary: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  runButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  runButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  results: {
    gap: theme.spacing.md,
  },
  resultCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  resultName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
  },
  resultStatus: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  resultMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  resultDuration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  resultData: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontFamily: 'monospace',
    marginTop: theme.spacing.xs,
  },
  envInfo: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  envTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  envItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
});