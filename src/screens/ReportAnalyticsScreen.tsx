import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { BarChart3, Users, DollarSign, Activity, RefreshCw, Lock, AlertCircle, Database } from 'lucide-react-native';
import { theme } from '@/constants/theme';

import { useReportAnalytics } from '@/src/lib/reportsApi';

import { logPreflightStatus, testNetworkConnectivity } from '@/utils/preflightCheck';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, onPress }) => (
  <TouchableOpacity style={styles.kpiCard} onPress={onPress} testID={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <View style={styles.kpiIcon}>
      {icon}
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiTitle}>{title}</Text>
    <Text style={styles.kpiSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
);

interface SkeletonProps {
  height: number;
  width?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ height, width = '100%' }) => (
  <View style={[styles.skeleton, { height, width }]} />
);

const ReportAnalyticsScreen: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('monthly');

  
  // Use tRPC hooks for data fetching with time filter
  const {
    graphData,
    isLoadingGraph,
    graphError,
    metricsData,
    isLoadingMetrics,
    metricsError,
    bottomRowData,
    isLoadingBottomRow,
    bottomRowError,
    connectionStable,
    lastSuccessfulFetch,
    refetchAll,
    isRefreshing,
    queryStates
  } = useReportAnalytics(timeFilter);
  


  const handleRefresh = async () => {
    await refetchAll();
  };

  const handleTimeFilterChange = (filter: TimeFilter) => {
    // Input validation for filter parameter
    if (!filter?.trim() || typeof filter !== 'string' || filter.length > 20) {
      console.warn('[ReportAnalytics] Invalid filter parameter:', String(filter).slice(0, 50));
      return;
    }
    const sanitizedFilter = filter.trim() as TimeFilter;
    
    if (sanitizedFilter === timeFilter) {
      console.log('[ReportAnalytics] Same filter selected, no change needed');
      return;
    }
    
    console.log(`[ReportAnalytics] Time filter changing from ${timeFilter} to: ${sanitizedFilter}`);
    setTimeFilter(sanitizedFilter);
    
    // Data will automatically refresh due to the tRPC query dependency on timeFilter
    // The useReportAnalytics hook will handle auto-retry if there are errors
  };

  const handleKPIPress = (kpiName: string) => {
    console.log(`[ReportAnalytics] KPI pressed: ${kpiName}`);
  };

  // Helper function to get contextual KPI titles based on time period
  const getKPITitle = (baseTitle: string) => {
    const titleMap: Record<string, Record<TimeFilter, string>> = {
      'Loads Today': {
        daily: 'Loads Today',
        weekly: 'Loads This Week',
        monthly: 'Loads This Month',
        quarterly: 'Loads This Quarter'
      }
    };
    
    return titleMap[baseTitle]?.[timeFilter] || baseTitle;
  };


  
  // Initialize app without auth restrictions
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Run preflight check in development
        logPreflightStatus();
        
        // Test network connectivity
        const networkOk = await testNetworkConnectivity();
        if (!networkOk) {
          console.warn('[ReportAnalytics] ⚠️ Network connectivity issues detected');
        }
        
        console.log('[ReportAnalytics] ✅ App initialized - Full access granted');
      } catch (error) {
        console.error('[ReportAnalytics] Initialization failed:', error);
      }
    };
    
    initializeApp();
  }, []);



  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} testID="report-analytics-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Report Analytics</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>Real-time trucking insights</Text>
            {!connectionStable && (
              <View style={styles.connectionStatus}>
                <AlertCircle size={12} color="#EF4444" />
                <Text style={styles.connectionStatusText}>Connection issues detected</Text>
              </View>
            )}
            {connectionStable && lastSuccessfulFetch && (
              <Text style={styles.lastUpdateText}>
                Last updated: {lastSuccessfulFetch.toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonActive]} 
          onPress={handleRefresh}
          testID="refresh-button"
        >
          <RefreshCw size={16} color={isRefreshing ? '#FFFFFF' : '#2563EB'} />
          <Text style={[styles.refreshText, isRefreshing && styles.refreshTextActive]}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Time Period:</Text>
        <View style={styles.filterButtons}>
          {(['daily', 'weekly', 'monthly', 'quarterly'] as TimeFilter[]).map((filter) => {
            // Input validation for filter parameter
            if (!filter?.trim() || typeof filter !== 'string' || filter.length > 20) {
              console.warn('[ReportAnalytics] Invalid filter parameter:', String(filter).slice(0, 50));
              return null;
            }
            const sanitizedFilter = filter.trim() as TimeFilter;
            const isActive = timeFilter === sanitizedFilter;
            const isLoading = isRefreshing && isActive;
            
            return (
              <TouchableOpacity
                key={sanitizedFilter}
                style={[
                  styles.filterButton, 
                  isActive && styles.filterButtonActive,
                  isLoading && styles.filterButtonLoading
                ]}
                onPress={() => handleTimeFilterChange(sanitizedFilter)}
                testID={`filter-${sanitizedFilter}`}
                disabled={isLoading}
              >
                {isLoading && (
                  <RefreshCw size={12} color="#FFFFFF" style={styles.filterLoadingIcon} />
                )}
                <Text style={[
                  styles.filterButtonText, 
                  isActive && styles.filterButtonTextActive,
                  isLoading && styles.filterButtonTextLoading
                ]}>
                  {sanitizedFilter.charAt(0).toUpperCase() + sanitizedFilter.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Live Graph Panel - Row A */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Performance Graph</Text>
        <View style={styles.graphPanel}>
          {isLoadingGraph ? (
            <View style={styles.graphPlaceholder}>
              <RefreshCw size={48} color="#94A3B8" />
              <Text style={styles.placeholderText}>Loading graph data...</Text>
              <Text style={styles.placeholderSubtext}>Revenue trends, load volumes, and performance metrics</Text>
            </View>
          ) : graphError ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#EF4444" />
              <Text style={styles.errorText}>Failed to load graph data</Text>
              <Text style={styles.errorSubtext}>{graphError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : graphData ? (
            <View style={styles.graphPlaceholder}>
              <BarChart3 size={48} color="#10B981" />
              <Text style={styles.placeholderText}>Graph data loaded successfully</Text>
              <Text style={styles.placeholderSubtext}>Live data as of {new Date().toLocaleTimeString()}</Text>
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <BarChart3 size={48} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>No Graph Data Available</Text>
              <Text style={styles.emptyStateSubtext}>Performance trends will appear here once data is available</Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={handleRefresh}>
                <RefreshCw size={16} color="#2563EB" />
                <Text style={styles.emptyStateButtonText}>Load Graph</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* KPI Cards - Row B */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        {isLoadingMetrics ? (
          <View style={styles.kpiGrid}>
            {[1, 2, 3].map((index) => (
              <View key={`kpi-skeleton-${index}`} style={styles.kpiCard}>
                <View style={styles.kpiIcon}>
                  <RefreshCw size={20} color="#94A3B8" />
                </View>
                <Skeleton height={24} width={60} />
                <Skeleton height={12} width={80} />
                <Skeleton height={10} width={100} />
              </View>
            ))}
          </View>
        ) : metricsError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={32} color="#EF4444" />
            <Text style={styles.errorText}>Failed to load metrics</Text>
            <Text style={styles.errorSubtext}>{metricsError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : metricsData?.kpis ? (
          <View style={styles.kpiGrid}>
            <KPICard
              title={getKPITitle('Loads Today')}
              value={String(metricsData.kpis.loadsToday?.value || "--")}
              subtitle={metricsData.kpis.loadsToday?.change || "No change"}
              icon={<BarChart3 size={20} color="#3B82F6" />}
              onPress={() => handleKPIPress('Loads Today')}
            />
            <KPICard
              title="$/Mile Avg"
              value={`${metricsData.kpis.avgRatePerMile?.value || "--"}`}
              subtitle={metricsData.kpis.avgRatePerMile?.change || "No data"}
              icon={<DollarSign size={20} color="#10B981" />}
              onPress={() => handleKPIPress('$/Mile Avg')}
            />
            <KPICard
              title="Active Drivers"
              value={String(metricsData.kpis.activeDrivers?.value || "--")}
              subtitle={metricsData.kpis.activeDrivers?.change || "No drivers"}
              icon={<Users size={20} color="#F59E0B" />}
              onPress={() => handleKPIPress('Active Drivers')}
            />
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Database size={48} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>No Metrics Available</Text>
            <Text style={styles.emptyStateSubtext}>Click refresh to load performance data</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={handleRefresh}>
              <RefreshCw size={16} color="#2563EB" />
              <Text style={styles.emptyStateButtonText}>Load Metrics</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Row Table - Row C */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest Activity & Anomalies</Text>
        <View style={styles.tablePanel}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Load ID</Text>
            <Text style={styles.tableHeaderText}>Status</Text>
            <Text style={styles.tableHeaderText}>Revenue</Text>
            <Text style={styles.tableHeaderText}>Driver</Text>
          </View>
          
          {isLoadingBottomRow ? (
            <>
              {[1, 2, 3, 4, 5].map((index) => (
                <View key={`table-skeleton-${index}`} style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Skeleton height={12} width={60} />
                  </View>
                  <View style={styles.tableCell}>
                    <Skeleton height={12} width={50} />
                  </View>
                  <View style={styles.tableCell}>
                    <Skeleton height={12} width={40} />
                  </View>
                  <View style={styles.tableCell}>
                    <Skeleton height={12} width={30} />
                  </View>
                </View>
              ))}
              <View style={styles.tablePlaceholder}>
                <RefreshCw size={24} color="#94A3B8" />
                <Text style={styles.placeholderText}>Loading latest loads and anomalies...</Text>
              </View>
            </>
          ) : bottomRowError ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={32} color="#EF4444" />
              <Text style={styles.errorText}>Failed to load activity data</Text>
              <Text style={styles.errorSubtext}>{bottomRowError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : bottomRowData?.recentLoads && bottomRowData.recentLoads.length > 0 ? (
            <>
              {bottomRowData.recentLoads.map((item: any, index: number) => (
                <View key={item.id || `row-${index}`} style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>{item.id || '--'}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>{item.status || '--'}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>${item.rate || '--'}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>{item.driver || '--'}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Activity size={48} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>No Recent Activity</Text>
              <Text style={styles.emptyStateSubtext}>No loads or anomalies to display</Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={handleRefresh}>
                <RefreshCw size={16} color="#2563EB" />
                <Text style={styles.emptyStateButtonText}>Check for Updates</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {connectionStable ? '📊 Data stabilized - Refresh if issues persist' : '⚠️ Connection unstable - Auto-retrying...'}
        </Text>
        <Text style={styles.footerSubtext}>LoadRush Analytics • Real-time insights for trucking operations</Text>
        {__DEV__ && (
          <Text style={styles.debugText}>
            Debug: G:{queryStates.graph.isLoading ? 'L' : queryStates.graph.isFetching ? 'F' : queryStates.graph.error ? 'E' : 'OK'} | 
            M:{queryStates.metrics.isLoading ? 'L' : queryStates.metrics.isFetching ? 'F' : queryStates.metrics.error ? 'E' : 'OK'} | 
            B:{queryStates.bottomRow.isLoading ? 'L' : queryStates.bottomRow.isFetching ? 'F' : queryStates.bottomRow.error ? 'E' : 'OK'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    gap: 6,
  },
  refreshButtonActive: {
    backgroundColor: '#2563EB',
  },
  refreshText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500' as const,
  },
  refreshTextActive: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
    color: theme.colors.dark,
    marginRight: theme.spacing.md,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonLoading: {
    backgroundColor: '#1E40AF',
  },
  filterButtonText: {
    fontSize: 12,
    color: theme.colors.gray,
    fontWeight: '500' as const,
  },
  filterButtonTextActive: {
    color: theme.colors.white,
  },
  filterButtonTextLoading: {
    color: '#FFFFFF',
  },
  filterLoadingIcon: {
    marginRight: 2,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  graphPanel: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  graphPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: theme.fontSize.md,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: theme.fontSize.sm,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    ...Platform.select({
      web: {
        flexWrap: 'wrap',
      },
      default: {
        flexDirection: 'column',
      },
    }),
  },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.lg,
    alignItems: 'center',
    minWidth: Platform.select({ web: 200, default: undefined }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: 2,
  },
  kpiSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  tablePanel: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tablePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  skeleton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: theme.fontSize.xs,
    color: '#94A3B8',
    textAlign: 'center',
  },
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  lockTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  lockSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  errorSubtext: {
    fontSize: theme.fontSize.sm,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  tableCellText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    textAlign: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.sm,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: theme.fontSize.sm,
    color: '#2563EB',
    fontWeight: '500' as const,
  },
  subtitleContainer: {
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  connectionStatusText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
  },
  debugText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
});

export default ReportAnalyticsScreen;