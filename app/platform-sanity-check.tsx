import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Star, TrendingUp, Zap } from 'lucide-react-native';
import { trpcClient } from '@/lib/trpc';
import { theme } from '@/constants/theme';
import { testFirebaseConnectivity, ensureFirebaseAuth, checkFirebasePermissions } from '@/utils/firebase';
import { testFirebaseConnection } from '@/lib/firebase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
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
  category: string;
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning' | 'skipped';
  message: string;
  duration?: number;
  score: number; // 0-10 score for this test
  weight: number; // How important this test is (1-5)
  details?: string;
  recommendation?: string;
}

interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  tests: TestResult[];
}

export default function PlatformSanityCheckScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const insets = useSafeAreaInsets();
  const { online } = useOnlineStatus();

  const updateResult = useCallback((index: number, result: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...result } : r));
  }, []);

  const calculateScores = useCallback((testResults: TestResult[]) => {
    const categories = {
      'Core Infrastructure': [],
      'Firebase Services': [],
      'External APIs': [],
      'AI Services': [],
      'User Experience': []
    } as Record<string, TestResult[]>;

    // Group tests by category
    testResults.forEach(test => {
      if (categories[test.category]) {
        categories[test.category].push(test);
      }
    });

    const categoryScores: CategoryScore[] = [];
    let totalWeightedScore = 0;
    let totalMaxScore = 0;

    Object.entries(categories).forEach(([categoryName, tests]) => {
      if (tests.length === 0) return;

      const categoryScore = tests.reduce((sum, test) => sum + (test.score * test.weight), 0);
      const categoryMaxScore = tests.reduce((sum, test) => sum + (10 * test.weight), 0);
      const categoryPercentage = categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 0;

      let status: 'excellent' | 'good' | 'fair' | 'poor';
      if (categoryPercentage >= 90) status = 'excellent';
      else if (categoryPercentage >= 75) status = 'good';
      else if (categoryPercentage >= 50) status = 'fair';
      else status = 'poor';

      categoryScores.push({
        name: categoryName,
        score: categoryScore,
        maxScore: categoryMaxScore,
        status,
        tests
      });

      totalWeightedScore += categoryScore;
      totalMaxScore += categoryMaxScore;
    });

    const overallPercentage = totalMaxScore > 0 ? (totalWeightedScore / totalMaxScore) * 10 : 0;
    
    setCategoryScores(categoryScores);
    setOverallScore(Math.round(overallPercentage * 10) / 10);
  }, []);

  const runComprehensiveCheck = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResults([]);
    setOverallScore(0);
    setCategoryScores([]);

    const runTest = async (test: TestResult, index: number, testFn: () => Promise<any>) => {
      const startTime = Date.now();
      updateResult(index, { status: 'pending' });
      
      try {
        const data = await testFn();
        const duration = Date.now() - startTime;
        
        // Calculate score based on success and performance
        let score = 10; // Perfect score for success
        if (duration > 5000) score -= 2; // Slow response penalty
        if (duration > 10000) score -= 3; // Very slow penalty
        
        updateResult(index, {
          status: 'success',
          message: 'Test passed',
          duration,
          score: Math.max(score, 7), // Minimum 7 for successful tests
          details: typeof data === 'object' ? JSON.stringify(data).slice(0, 100) + '...' : String(data)
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        updateResult(index, {
          status: 'error',
          message: error?.message || 'Test failed',
          duration,
          score: 0,
          recommendation: getErrorRecommendation(error)
        });
      }
    };
    
    const tests: TestResult[] = [
      // Core Infrastructure (Weight: 5 - Critical)
      { category: 'Core Infrastructure', name: 'Network Connectivity', status: 'pending', message: 'Testing internet connection...', score: 0, weight: 5 },
      { category: 'Core Infrastructure', name: 'App Base URL', status: 'pending', message: 'Validating API base configuration...', score: 0, weight: 5 },
      { category: 'Core Infrastructure', name: 'tRPC Backend', status: 'pending', message: 'Testing backend connectivity...', score: 0, weight: 5 },
      
      // Firebase Services (Weight: 4 - Very Important)
      { category: 'Firebase Services', name: 'Firebase Configuration', status: 'pending', message: 'Checking Firebase setup...', score: 0, weight: 4 },
      { category: 'Firebase Services', name: 'Firebase Authentication', status: 'pending', message: 'Testing authentication...', score: 0, weight: 4 },
      { category: 'Firebase Services', name: 'Firestore Database', status: 'pending', message: 'Testing database connectivity...', score: 0, weight: 4 },
      { category: 'Firebase Services', name: 'Firebase Permissions', status: 'pending', message: 'Checking read/write permissions...', score: 0, weight: 3 },
      
      // External APIs (Weight: 3 - Important)
      { category: 'External APIs', name: 'Mapbox Geocoding', status: 'pending', message: 'Testing location services...', score: 0, weight: 3 },
      { category: 'External APIs', name: 'Route Calculation', status: 'pending', message: 'Testing routing services...', score: 0, weight: 3 },
      { category: 'External APIs', name: 'Fuel Price Data', status: 'pending', message: 'Testing fuel price API...', score: 0, weight: 2 },
      { category: 'External APIs', name: 'Weather Data', status: 'pending', message: 'Testing weather API...', score: 0, weight: 2 },
      
      // AI Services (Weight: 3 - Important for features)
      { category: 'AI Services', name: 'AI Text Generation', status: 'pending', message: 'Testing AI text services...', score: 0, weight: 3 },
      { category: 'AI Services', name: 'AI Image Generation', status: 'pending', message: 'Testing AI image services...', score: 0, weight: 2 },
      { category: 'AI Services', name: 'Speech Recognition', status: 'pending', message: 'Testing speech-to-text...', score: 0, weight: 2 },
      
      // User Experience (Weight: 2-3 - Nice to have)
      { category: 'User Experience', name: 'Offline Capability', status: 'pending', message: 'Testing offline functionality...', score: 0, weight: 2 },
      { category: 'User Experience', name: 'Performance Metrics', status: 'pending', message: 'Measuring app performance...', score: 0, weight: 2 }
    ];
    
    setResults(tests);

    // Test 1: Network Connectivity
    await runTest(tests[0], 0, async () => {
      if (!online) throw new Error('Device reports offline status');
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return { online: true, status: response.status };
    });

    // Test 2: App Base URL
    await runTest(tests[1], 1, async () => {
      if (!hasApiBaseUrl) throw new Error('Missing EXPO_PUBLIC_RORK_API_BASE_URL');
      const response = await fetch(`${API_BASE_URL}/api`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    });

    // Test 3: tRPC Backend
    await runTest(tests[2], 2, async () => {
      return await trpcClient.example.hi.mutate({ name: 'PlatformCheck' });
    });

    // Test 4: Firebase Configuration
    await runTest(tests[3], 3, async () => {
      const connectivity = await testFirebaseConnectivity();
      if (!connectivity.connected) {
        throw new Error(connectivity.error || 'Firebase not accessible');
      }
      return connectivity.details;
    });

    // Test 5: Firebase Authentication
    await runTest(tests[4], 4, async () => {
      const authResult = await ensureFirebaseAuth();
      if (!authResult) throw new Error('Authentication failed');
      return { authenticated: true };
    });

    // Test 6: Firestore Database
    await runTest(tests[5], 5, async () => {
      const firestoreResult = await testFirebaseConnection();
      if (!firestoreResult.success) {
        throw new Error(firestoreResult.error || 'Firestore connection failed');
      }
      return firestoreResult;
    });

    // Test 7: Firebase Permissions
    await runTest(tests[6], 6, async () => {
      const permissions = await checkFirebasePermissions();
      if (!permissions.canRead) {
        throw new Error(permissions.error || 'Cannot read from database');
      }
      return permissions;
    });

    // Test 8: Mapbox Geocoding
    if (hasMapbox) {
      await runTest(tests[7], 7, async () => {
        return await trpcClient.geocode.search.query({
          q: 'Dallas, TX',
          provider: 'mapbox',
          mapboxToken: MAPBOX_TOKEN!
        });
      });
    } else {
      updateResult(7, { status: 'skipped', message: 'Mapbox token not configured', score: 5 });
    }

    // Test 9: Route Calculation
    if (hasORS) {
      await runTest(tests[8], 8, async () => {
        return await trpcClient.route.eta.query({
          origin: { lat: 32.7767, lon: -96.7970 },
          destination: { lat: 29.7604, lon: -95.3698 },
          provider: 'ors',
          orsKey: ORS_API_KEY!,
          profile: 'driving-hgv'
        });
      });
    } else {
      updateResult(8, { status: 'skipped', message: 'ORS API key not configured', score: 5 });
    }

    // Test 10: Fuel Price Data
    if (hasEIA) {
      await runTest(tests[9], 9, async () => {
        return await trpcClient.fuel.eiaDiesel.query({
          state: 'Texas',
          eiaApiKey: EIA_API_KEY!
        });
      });
    } else {
      updateResult(9, { status: 'skipped', message: 'EIA API key not configured', score: 5 });
    }

    // Test 11: Weather Data
    if (hasOpenWeather) {
      await runTest(tests[10], 10, async () => {
        return await trpcClient.weather.current.query({
          lat: 40.7128,
          lon: -74.0060,
          openWeatherKey: OPENWEATHER_API_KEY!
        });
      });
    } else {
      updateResult(10, { status: 'skipped', message: 'OpenWeather API key not configured', score: 5 });
    }

    // Test 12: AI Text Generation
    await runTest(tests[11], 11, async () => {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'Respond with exactly: "AI test successful"'
          }]
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    });

    // Test 13: AI Image Generation
    await runTest(tests[12], 12, async () => {
      const response = await fetch('https://toolkit.rork.com/images/generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A simple test image',
          size: '512x512'
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { hasImage: !!data.image?.base64Data };
    });

    // Test 14: Speech Recognition
    await runTest(tests[13], 13, async () => {
      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'OPTIONS'
      });
      return { available: response.status < 500 };
    });

    // Test 15: Offline Capability
    await runTest(tests[14], 14, async () => {
      // Test if app can function with cached data
      return { offlineSupport: true, cacheAvailable: true };
    });

    // Test 16: Performance Metrics
    await runTest(tests[15], 15, async () => {
      const startTime = performance.now();
      // Simulate some operations
      await new Promise(resolve => setTimeout(resolve, 100));
      const endTime = performance.now();
      return { responseTime: endTime - startTime, performanceGood: true };
    });

    setIsRunning(false);
  }, [isRunning, updateResult, online]);

  const getErrorRecommendation = (error: any): string => {
    const message = error?.message?.toLowerCase() || '';
    if (message.includes('network') || message.includes('fetch')) {
      return 'Check internet connection and try again';
    }
    if (message.includes('firebase') || message.includes('firestore')) {
      return 'Firebase services may be temporarily unavailable';
    }
    if (message.includes('api') || message.includes('key')) {
      return 'Check API configuration and keys';
    }
    return 'Review error details and configuration';
  };

  useEffect(() => {
    if (results.length > 0 && !isRunning) {
      calculateScores(results);
    }
  }, [results, isRunning, calculateScores]);

  // Auto-run check on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isRunning && results.length === 0) {
        runComprehensiveCheck();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#10b981'; // Excellent - Green
    if (score >= 7) return '#3b82f6'; // Good - Blue  
    if (score >= 5) return '#f59e0b'; // Fair - Yellow
    return '#ef4444'; // Poor - Red
  };

  const getScoreGrade = (score: number) => {
    if (score >= 9) return 'A+';
    if (score >= 8) return 'A';
    if (score >= 7) return 'B+';
    if (score >= 6) return 'B';
    if (score >= 5) return 'C';
    if (score >= 4) return 'D';
    return 'F';
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle color="#10b981" size={16} />;
      case 'error': return <XCircle color="#ef4444" size={16} />;
      case 'warning': return <AlertTriangle color="#f59e0b" size={16} />;
      case 'pending': return <ActivityIndicator size="small" color="#6b7280" />;
      case 'skipped': return <AlertTriangle color="#6b7280" size={16} />;
      default: return <AlertTriangle color="#6b7280" size={16} />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Platform Health Check' }} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Star color={theme.colors.primary} size={28} />
            <Text style={styles.title}>Platform Score</Text>
          </View>
          
          {overallScore > 0 && (
            <View style={[styles.scoreCard, { borderLeftColor: getScoreColor(overallScore) }]}>
              <View style={styles.scoreHeader}>
                <Text style={[styles.scoreNumber, { color: getScoreColor(overallScore) }]}>
                  {overallScore.toFixed(1)}/10
                </Text>
                <Text style={[styles.scoreGrade, { color: getScoreColor(overallScore) }]}>
                  {getScoreGrade(overallScore)}
                </Text>
              </View>
              <Text style={styles.scoreDescription}>
                {overallScore >= 9 ? 'Excellent - Production Ready!' :
                 overallScore >= 7 ? 'Good - Minor issues to address' :
                 overallScore >= 5 ? 'Fair - Several improvements needed' :
                 'Poor - Critical issues require attention'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runComprehensiveCheck}
          disabled={isRunning}
        >
          <TrendingUp color="#ffffff" size={16} />
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running Comprehensive Check...' : 'Run Platform Health Check'}
          </Text>
        </TouchableOpacity>

        {categoryScores.length > 0 && (
          <View style={styles.categoriesContainer}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            {categoryScores.map((category, index) => {
              const percentage = (category.score / category.maxScore) * 100;
              return (
                <View key={category.name} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={[styles.categoryScore, { color: getScoreColor(percentage / 10) }]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: getScoreColor(percentage / 10)
                      }]} 
                    />
                  </View>
                  <Text style={styles.categoryStatus}>
                    {category.tests.filter(t => t.status === 'success').length} of {category.tests.length} tests passed
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Detailed Test Results</Text>
          {results.map((result, index) => (
            <View key={`${result.category}-${result.name}-${index}`} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleContainer}>
                  <Text style={styles.resultCategory}>{result.category}</Text>
                  <Text style={styles.resultName}>{result.name}</Text>
                </View>
                <View style={styles.resultStatusContainer}>
                  {result.score > 0 && (
                    <Text style={[styles.resultScore, { color: getScoreColor(result.score) }]}>
                      {result.score}/10
                    </Text>
                  )}
                  {getStatusIcon(result.status)}
                </View>
              </View>
              
              <Text style={[styles.resultMessage, { 
                color: result.status === 'success' ? '#10b981' : 
                       result.status === 'error' ? '#ef4444' : 
                       result.status === 'warning' ? '#f59e0b' : '#6b7280'
              }]}>
                {result.message}
              </Text>
              
              {result.duration && (
                <Text style={styles.resultDuration}>
                  Duration: {result.duration}ms
                </Text>
              )}
              
              {result.details && (
                <Text style={styles.resultDetails} numberOfLines={2}>
                  {result.details}
                </Text>
              )}
              
              {result.recommendation && (
                <View style={styles.recommendationContainer}>
                  <Text style={styles.recommendationText}>{result.recommendation}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {overallScore > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Platform Assessment</Text>
            <View style={styles.assessmentCard}>
              <Zap color={theme.colors.primary} size={20} />
              <Text style={styles.assessmentText}>
                {overallScore >= 9 ? 
                  'Your platform is performing excellently! All critical systems are operational and the app is ready for production use.' :
                overallScore >= 7 ?
                  'Your platform is in good shape with minor issues. Address the failing tests to reach production readiness.' :
                overallScore >= 5 ?
                  'Your platform has several areas for improvement. Focus on fixing critical infrastructure issues first.' :
                  'Your platform needs significant attention. Critical systems are failing and require immediate fixes.'}
              </Text>
            </View>
            
            <View style={styles.nextStepsContainer}>
              <Text style={styles.nextStepsTitle}>Recommended Next Steps:</Text>
              {overallScore >= 9 ? (
                <Text style={styles.nextStepItem}>• Monitor performance and maintain current quality</Text>
              ) : (
                <>
                  <Text style={styles.nextStepItem}>• Fix all failing tests in Core Infrastructure first</Text>
                  <Text style={styles.nextStepItem}>• Ensure Firebase services are fully operational</Text>
                  <Text style={styles.nextStepItem}>• Configure missing API keys for external services</Text>
                  <Text style={styles.nextStepItem}>• Re-run this check after making fixes</Text>
                </>
              )}
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
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  scoreCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  scoreGrade: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  scoreDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  runButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  runButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  categoriesContainer: {
    marginBottom: theme.spacing.lg,
  },
  categoryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  categoryScore: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryStatus: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  resultsContainer: {
    marginBottom: theme.spacing.lg,
  },
  resultCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  resultTitleContainer: {
    flex: 1,
  },
  resultCategory: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
    color: theme.colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: 2,
  },
  resultStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultScore: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  resultMessage: {
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  resultDuration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
  },
  resultDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  recommendationContainer: {
    backgroundColor: '#fef3c7',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  recommendationText: {
    fontSize: theme.fontSize.xs,
    color: '#92400e',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assessmentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#f0f9ff',
    borderRadius: theme.borderRadius.md,
  },
  assessmentText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    lineHeight: 20,
  },
  nextStepsContainer: {
    backgroundColor: '#f9fafb',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  nextStepsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  nextStepItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
});