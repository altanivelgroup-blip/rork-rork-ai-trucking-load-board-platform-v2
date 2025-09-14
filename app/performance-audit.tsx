import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { performanceAuditor, auditReport, clearAudit } from '@/utils/performanceAudit';
import { RefreshCw, Trash2, BarChart3 } from 'lucide-react-native';

export default function PerformanceAuditScreen() {
  const [report, setReport] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const generateReport = useCallback(() => {
    setIsRefreshing(true);
    try {
      const reportText = auditReport();
      setReport(reportText);
    } catch (error) {
      console.error('Failed to generate report:', error);
      Alert.alert('Error', 'Failed to generate performance report');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const clearMetrics = useCallback(() => {
    Alert.alert(
      'Clear Metrics',
      'Are you sure you want to clear all performance metrics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearAudit();
            setReport('');
          }
        }
      ]
    );
  }, []);

  const getMetrics = useCallback(() => {
    return performanceAuditor.getMetrics();
  }, []);

  const getSlowestOperations = useCallback(() => {
    return performanceAuditor.getSlowestOperations(10);
  }, []);

  React.useEffect(() => {
    generateReport();
  }, [generateReport]);

  const metrics = getMetrics();
  const slowestOps = getSlowestOperations();

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Performance Audit',
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={generateReport} style={styles.headerButton}>
                <RefreshCw size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearMetrics} style={styles.headerButton}>
                <Trash2 size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <BarChart3 size={24} color={theme.colors.primary} />
            <Text style={styles.summaryValue}>{metrics.length}</Text>
            <Text style={styles.summaryLabel}>Total Operations</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {metrics.length > 0 
                ? Math.round(metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length)
                : 0}ms
            </Text>
            <Text style={styles.summaryLabel}>Avg Duration</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {slowestOps.length > 0 ? `${slowestOps[0].duration}ms` : 'N/A'}
            </Text>
            <Text style={styles.summaryLabel}>Slowest Op</Text>
          </View>
        </View>

        {/* Performance Issues */}
        {slowestOps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🐌 Slowest Operations</Text>
            {slowestOps.map((op, index) => {
              const status = (op.duration || 0) > 2000 ? '🐌' : (op.duration || 0) > 1000 ? '⚠️' : '✅';
              const statusColor = (op.duration || 0) > 2000 ? theme.colors.error : 
                                 (op.duration || 0) > 1000 ? theme.colors.warning : theme.colors.success;
              
              return (
                <View key={`${op.operation}-${index}`} style={styles.operationCard}>
                  <View style={styles.operationHeader}>
                    <Text style={styles.operationStatus}>{status}</Text>
                    <Text style={styles.operationName}>{op.operation}</Text>
                    <Text style={[styles.operationDuration, { color: statusColor }]}>
                      {op.duration}ms
                    </Text>
                  </View>
                  {op.metadata && (
                    <Text style={styles.operationMetadata}>
                      {JSON.stringify(op.metadata, null, 2)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Operations */}
        {metrics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Recent Operations</Text>
            {metrics.slice(-10).reverse().map((op, index) => {
              const status = (op.duration || 0) > 2000 ? '🐌' : (op.duration || 0) > 1000 ? '⚠️' : '✅';
              const statusColor = (op.duration || 0) > 2000 ? theme.colors.error : 
                                 (op.duration || 0) > 1000 ? theme.colors.warning : theme.colors.success;
              
              return (
                <View key={`${op.operation}-${op.startTime}-${index}`} style={styles.operationCard}>
                  <View style={styles.operationHeader}>
                    <Text style={styles.operationStatus}>{status}</Text>
                    <Text style={styles.operationName}>{op.operation}</Text>
                    <Text style={[styles.operationDuration, { color: statusColor }]}>
                      {op.duration || 'Running...'}
                      {op.duration ? 'ms' : ''}
                    </Text>
                  </View>
                  {op.metadata && (
                    <Text style={styles.operationMetadata}>
                      {JSON.stringify(op.metadata, null, 2)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Full Report */}
        {report && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Full Report</Text>
            <View style={styles.reportContainer}>
              <Text style={styles.reportText}>{report}</Text>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Performance Audit Instructions</Text>
          <Text style={styles.instructionText}>
            This performance audit tracks slow areas in the app:
          </Text>
          <Text style={styles.instructionText}>
            • ✅ Fast operations (&lt;1000ms)
          </Text>
          <Text style={styles.instructionText}>
            • ⚠️ Moderate operations (1000-2000ms)
          </Text>
          <Text style={styles.instructionText}>
            • 🐌 Slow operations (&gt;2000ms)
          </Text>
          <Text style={styles.instructionText}>
            Navigate through the app to collect performance data, then return here to view the results.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  operationCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  operationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  operationStatus: {
    fontSize: 16,
  },
  operationName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  operationDuration: {
    fontSize: 14,
    fontWeight: '700',
  },
  operationMetadata: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  reportContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportText: {
    fontSize: 12,
    color: theme.colors.dark,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
});