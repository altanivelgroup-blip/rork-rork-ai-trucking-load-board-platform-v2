import React, { useState, useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,

  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Smartphone, 
  Wifi, 
  Camera, 
  MapPin, 
  Mic,
  HardDrive,
  Monitor,
  Download,
  Trash2
} from 'lucide-react-native';
import {
  runCompleteDeviceTestSuite,
  getSavedTestResults,
  clearSavedTestResults,
  DeviceTestSuite,
  DeviceTestResult
} from '@/utils/deviceTesting';

const fontWeightBold = '700' as const;
const fontWeightSemi = '600' as const;

interface TestSectionProps {
  title: string;
  icon: React.ReactNode;
  results: DeviceTestResult[];
  isExpanded: boolean;
  onToggle: () => void;
}

function TestSection({ title, icon, results, isExpanded, onToggle }: TestSectionProps) {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  const getSectionStatus = () => {
    if (failed > 0) return 'failed';
    if (warnings > 0) return 'warning';
    if (passed > 0) return 'passed';
    return 'pending';
  };
  
  const status = getSectionStatus();
  const StatusIcon = status === 'passed' ? CheckCircle : status === 'failed' ? XCircle : status === 'warning' ? AlertTriangle : null;
  const statusColor = status === 'passed' ? '#10B981' : status === 'failed' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#6B7280';
  
  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        testID={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.iconWrapper}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionHeaderRight}>
          <Text style={styles.sectionStats}>
            {passed}✅ {warnings}⚠️ {failed}❌
          </Text>
          {StatusIcon && (
            <StatusIcon size={20} color={statusColor} />
          )}
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.sectionContent}>
          {results.length === 0 ? (
            <Text style={styles.noResults}>No tests run yet</Text>
          ) : (
            results.map((result, index) => (
              <TestResultItem key={`${result.testName}-${result.timestamp}-${index}`} result={result} />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function TestResultItem({ result }: { result: DeviceTestResult }) {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  
  const StatusIcon = result.status === 'passed' ? CheckCircle : result.status === 'failed' ? XCircle : AlertTriangle;
  const statusColor = result.status === 'passed' ? '#10B981' : result.status === 'failed' ? '#EF4444' : '#F59E0B';
  
  return (
    <View style={styles.testResult}>
      <TouchableOpacity 
        style={styles.testResultHeader}
        onPress={() => setShowDetails(!showDetails)}
        testID={`test-result-${result.testName.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <View style={styles.testResultLeft}>
          <StatusIcon size={16} color={statusColor} />
          <Text style={styles.testResultName}>{result.testName}</Text>
        </View>
        <Text style={styles.testResultTime}>
          {new Date(result.timestamp).toLocaleTimeString()}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.testResultMessage}>{result.message}</Text>
      
      {showDetails && result.details && (
        <View style={styles.testResultDetails}>
          <Text style={styles.detailsTitle}>Details:</Text>
          <Text style={styles.detailsText}>
            {JSON.stringify(result.details, null, 2)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function DeviceTestingScreen() {
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testSuite, setTestSuite] = useState<DeviceTestSuite | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const toggleSection = useCallback((sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  }, []);

  const runTests = useCallback(async () => {
    try {
      setIsRunning(true);
      console.log('[DeviceTestingScreen] Starting device test suite...');
      
      const suite = await runCompleteDeviceTestSuite();
      setTestSuite(suite);
      setLastRunTime(new Date().toISOString());
      
      // Expand all sections to show results
      setExpandedSections(new Set(['permissions', 'storage', 'network', 'hardware', 'ui']));
      
      console.log('[DeviceTestingScreen] Device test suite completed');
      
      // Log completion
      console.log('[DeviceTestingScreen] ✅ Device tests completed successfully');
    } catch (error) {
      console.error('[DeviceTestingScreen] Test suite failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DeviceTestingScreen] Test error:', errorMessage);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const loadSavedResults = useCallback(async () => {
    try {
      const saved = await getSavedTestResults();
      if (saved) {
        setTestSuite(saved.suite);
        setLastRunTime(saved.timestamp);
        console.log('[DeviceTestingScreen] Loaded saved test results');
      }
    } catch (error) {
      console.warn('[DeviceTestingScreen] Failed to load saved results:', error);
    }
  }, []);

  const clearResults = useCallback(async () => {
    try {
      await clearSavedTestResults();
      setTestSuite(null);
      setLastRunTime(null);
      setExpandedSections(new Set());
      console.log('[DeviceTestingScreen] Test results cleared');
      
      // Log clearing
      console.log('[DeviceTestingScreen] 🗑️ Test results cleared successfully');
    } catch (error) {
      console.error('[DeviceTestingScreen] Failed to clear results:', error);
    }
  }, []);

  useEffect(() => {
    loadSavedResults();
  }, [loadSavedResults]);

  const getSummary = () => {
    if (!testSuite) return { passed: 0, failed: 0, warnings: 0, total: 0 };
    
    const allResults = [
      ...testSuite.permissions,
      ...testSuite.storage,
      ...testSuite.network,
      ...testSuite.hardware,
      ...testSuite.ui
    ];
    
    return {
      passed: allResults.filter(r => r.status === 'passed').length,
      failed: allResults.filter(r => r.status === 'failed').length,
      warnings: allResults.filter(r => r.status === 'warning').length,
      total: allResults.length
    };
  };

  const summary = getSummary();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="device-testing-screen">
      <Stack.Screen 
        options={{ 
          title: 'Device Testing Suite',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white
        }} 
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Device Compliance Testing</Text>
        <Text style={styles.subtitle}>
          Validate device capabilities for app store submission
        </Text>
        
        {lastRunTime && (
          <Text style={styles.lastRun}>
            Last run: {new Date(lastRunTime).toLocaleString()}
          </Text>
        )}
        
        {summary.total > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Test Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.summaryText}>{summary.passed} Passed</Text>
              </View>
              <View style={styles.summaryItem}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={styles.summaryText}>{summary.warnings} Warnings</Text>
              </View>
              <View style={styles.summaryItem}>
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.summaryText}>{summary.failed} Failed</Text>
              </View>
            </View>
            
            <View style={styles.validationStatus}>
              {summary.failed === 0 && summary.warnings === 0 ? (
                <View style={styles.statusRow}>
                  <CheckCircle size={20} color="#10B981" />
                  <Text style={styles.statusTextPassed}>Device test passed - Permissions validated</Text>
                </View>
              ) : summary.failed === 0 && summary.warnings > 0 ? (
                <View style={styles.statusRow}>
                  <AlertTriangle size={20} color="#F59E0B" />
                  <Text style={styles.statusTextWarning}>Permission granted with limitations</Text>
                </View>
              ) : (
                <View style={styles.statusRow}>
                  <XCircle size={20} color="#EF4444" />
                  <Text style={styles.statusTextFailed}>Critical functionality unavailable</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isRunning && styles.buttonDisabled]}
            onPress={runTests}
            disabled={isRunning}
            testID="run-tests-button"
          >
            {isRunning ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Play size={20} color={theme.colors.white} />
            )}
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Tests...' : 'Run Device Tests'}
            </Text>
          </TouchableOpacity>
          
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={loadSavedResults}
              testID="load-results-button"
            >
              <Download size={20} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>Load Saved</Text>
            </TouchableOpacity>
          )}
          
          {testSuite && (
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={clearResults}
              testID="clear-results-button"
            >
              <Trash2 size={20} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {testSuite ? (
          <>
            <TestSection
              title="Permissions"
              icon={<Camera size={20} color={theme.colors.primary} />}
              results={testSuite.permissions}
              isExpanded={expandedSections.has('permissions')}
              onToggle={() => toggleSection('permissions')}
            />
            
            <TestSection
              title="Storage"
              icon={<HardDrive size={20} color={theme.colors.primary} />}
              results={testSuite.storage}
              isExpanded={expandedSections.has('storage')}
              onToggle={() => toggleSection('storage')}
            />
            
            <TestSection
              title="Network"
              icon={<Wifi size={20} color={theme.colors.primary} />}
              results={testSuite.network}
              isExpanded={expandedSections.has('network')}
              onToggle={() => toggleSection('network')}
            />
            
            <TestSection
              title="Hardware"
              icon={<Smartphone size={20} color={theme.colors.primary} />}
              results={testSuite.hardware}
              isExpanded={expandedSections.has('hardware')}
              onToggle={() => toggleSection('hardware')}
            />
            
            <TestSection
              title="UI & Performance"
              icon={<Monitor size={20} color={theme.colors.primary} />}
              results={testSuite.ui}
              isExpanded={expandedSections.has('ui')}
              onToggle={() => toggleSection('ui')}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Smartphone size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>No Tests Run Yet</Text>
            <Text style={styles.emptySubtitle}>
              Run the device test suite to validate your app&apos;s compatibility with iOS and Android devices.
            </Text>
            <View style={styles.testCategories}>
              <View style={styles.categoryItem}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.categoryText}>Location Services</Text>
              </View>
              <View style={styles.categoryItem}>
                <Camera size={16} color="#6B7280" />
                <Text style={styles.categoryText}>Camera & Photos</Text>
              </View>
              <View style={styles.categoryItem}>
                <Mic size={16} color="#6B7280" />
                <Text style={styles.categoryText}>Audio Recording</Text>
              </View>
              <View style={styles.categoryItem}>
                <Wifi size={16} color="#6B7280" />
                <Text style={styles.categoryText}>Network Connectivity</Text>
              </View>
              <View style={styles.categoryItem}>
                <HardDrive size={16} color="#6B7280" />
                <Text style={styles.categoryText}>Local Storage</Text>
              </View>
              <View style={styles.categoryItem}>
                <Monitor size={16} color="#6B7280" />
                <Text style={styles.categoryText}>UI Performance</Text>
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
    backgroundColor: '#0B0B10',
  },
  header: {
    padding: 20,
    backgroundColor: '#12131A',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2330',
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeightBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  lastRun: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#1F2330',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: fontWeightSemi,
    color: '#E5E7EB',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: fontWeightSemi,
  },
  validationStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTextPassed: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: fontWeightSemi,
    flex: 1,
  },
  statusTextWarning: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: fontWeightSemi,
    flex: 1,
  },
  statusTextFailed: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: fontWeightSemi,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: fontWeightSemi,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: fontWeightSemi,
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: fontWeightSemi,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#12131A',
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2330',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: fontWeightSemi,
    color: '#E5E7EB',
  },
  sectionStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: '#1F2330',
    padding: 16,
    paddingTop: 12,
  },
  noResults: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  testResult: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2330',
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  testResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  testResultName: {
    fontSize: 14,
    fontWeight: fontWeightSemi,
    color: '#CBD5E1',
    flex: 1,
  },
  testResultTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  testResultMessage: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 24,
    lineHeight: 18,
  },
  testResultDetails: {
    marginTop: 8,
    marginLeft: 24,
    padding: 12,
    backgroundColor: '#1F2330',
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: fontWeightSemi,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: fontWeightBold,
    color: '#E5E7EB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  testCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1F2330',
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  iconWrapper: {
    // Wrapper for icons to satisfy lint requirements
  },
});