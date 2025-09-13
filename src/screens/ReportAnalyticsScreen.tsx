import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { BarChart3, Users, DollarSign, Activity, RefreshCw, Lock, AlertCircle, Database } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { isAdminClient } from '@/src/lib/authz';
import { getLiveGraph, getBottomRow, getLiveMetrics } from '@/src/lib/reportsApi';
import { useToast } from '@/components/Toast';
import { logPreflightStatus } from '@/utils/preflightCheck';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Data states
  const [graphData, setGraphData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [bottomRowData, setBottomRowData] = useState<any>(null);
  
  // Loading states
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingBottomRow, setIsLoadingBottomRow] = useState(false);
  
  // Error states
  const [graphError, setGraphError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [bottomRowError, setBottomRowError] = useState<string | null>(null);
  
  const toast = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchGraphData(),
      fetchMetricsData(),
      fetchBottomRowData()
    ]);
    setIsRefreshing(false);
  };

  const handleTimeFilterChange = (filter: TimeFilter) => {
    // Input validation for filter parameter
    if (!filter || typeof filter !== 'string' || filter.length > 20) {
      console.warn('[ReportAnalytics] Invalid filter parameter:', String(filter).slice(0, 50));
      return;
    }
    const sanitizedFilter = filter.trim() as TimeFilter;
    
    setTimeFilter(sanitizedFilter);
    console.log(`[ReportAnalytics] Time filter changed to: ${sanitizedFilter}`);
    
    // Refresh data when filter changes
    handleRefresh();
  };

  const handleKPIPress = (kpiName: string) => {
    console.log(`[ReportAnalytics] KPI pressed: ${kpiName}`);
  };

  // API fetch functions
  const fetchGraphData = React.useCallback(async () => {
    setIsLoadingGraph(true);
    setGraphError(null);
    try {
      const data = await getLiveGraph();
      setGraphData(data);
      console.log('[ReportAnalytics] ✅ Graph data loaded successfully');
    } catch (error: any) {
      const errorMsg = `Graph data error: ${error.message}`;
      setGraphError(errorMsg);
      console.error('[ReportAnalytics] ❌ Failed to fetch live graph data:', error.message);
      toast.show(errorMsg, 'error');
    } finally {
      setIsLoadingGraph(false);
    }
  }, [toast]);
  
  const fetchMetricsData = React.useCallback(async () => {
    setIsLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await getLiveMetrics();
      setMetricsData(data);
      console.log('[ReportAnalytics] ✅ Metrics data loaded successfully');
    } catch (error: any) {
      const errorMsg = `Metrics error: ${error.message}`;
      setMetricsError(errorMsg);
      console.error('[ReportAnalytics] ❌ Failed to fetch live metrics:', error.message);
      toast.show(errorMsg, 'error');
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [toast]);
  
  const fetchBottomRowData = React.useCallback(async () => {
    setIsLoadingBottomRow(true);
    setBottomRowError(null);
    try {
      const data = await getBottomRow();
      setBottomRowData(data);
      console.log('[ReportAnalytics] ✅ Bottom row data loaded successfully');
    } catch (error: any) {
      const errorMsg = `Bottom row error: ${error.message}`;
      setBottomRowError(errorMsg);
      console.error('[ReportAnalytics] ❌ Failed to fetch live bottom row data:', error.message);
      toast.show(errorMsg, 'error');
    } finally {
      setIsLoadingBottomRow(false);
    }
  }, [toast]);
  
  // Check admin privileges on mount
  useEffect(() => {
    let isMounted = true;
    
    // Run preflight check in development
    logPreflightStatus();
    
    const checkAdminAccess = async () => {
      try {
        console.log('[ReportAnalytics] Checking admin access...');
        const adminResult = await isAdminClient();
        
        if (isMounted) {
          setIsAdmin(adminResult);
          setIsCheckingAuth(false);
          console.log('[ReportAnalytics] Admin check complete:', adminResult);
          
          // If admin, load initial data
          if (adminResult) {
            fetchGraphData();
            fetchMetricsData();
            fetchBottomRowData();
          }
        }
      } catch (error) {
        console.error('[ReportAnalytics] Admin check failed:', error);
        if (isMounted) {
          setIsAdmin(false);
          setIsCheckingAuth(false);
        }
      }
    };
    
    checkAdminAccess();
    
    return () => {
      isMounted = false;
    };
  }, [fetchBottomRowData, fetchGraphData, fetchMetricsData]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <View style={styles.lockScreen}>
          <RefreshCw size={48} color={theme.colors.gray} />
          <Text style={styles.lockTitle}>Checking Access...</Text>
          <Text style={styles.lockSubtext}>Verifying admin privileges</Text>
        </View>
      </View>
    );
  }

  // Show access denied screen for non-admins
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.lockScreen}>
          <Lock size={48} color={theme.colors.gray} />
          <Text style={styles.lockTitle}>Admins Only</Text>
          <Text style={styles.lockSubtext}>Ask an owner to grant you access.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} testID="report-analytics-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Report Analytics</Text>
          <Text style={styles.subtitle}>Real-time trucking insights</Text>
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
            if (!filter || typeof filter !== 'string' || filter.length > 20) {
              console.warn('[ReportAnalytics] Invalid filter parameter:', String(filter).slice(0, 50));
              return null;
            }
            const sanitizedFilter = filter.trim() as TimeFilter;
            
            return (
              <TouchableOpacity
                key={sanitizedFilter}
                style={[styles.filterButton, timeFilter === sanitizedFilter && styles.filterButtonActive]}
                onPress={() => handleTimeFilterChange(sanitizedFilter)}
                testID={`filter-${sanitizedFilter}`}
              >
                <Text style={[styles.filterButtonText, timeFilter === sanitizedFilter && styles.filterButtonTextActive]}>
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
              <TouchableOpacity style={styles.retryButton} onPress={fetchGraphData}>
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
              <TouchableOpacity style={styles.emptyStateButton} onPress={fetchGraphData}>
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
            <TouchableOpacity style={styles.retryButton} onPress={fetchMetricsData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : metricsData?.kpis ? (
          <View style={styles.kpiGrid}>
            <KPICard
              title="Loads Today"
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
            <TouchableOpacity style={styles.emptyStateButton} onPress={fetchMetricsData}>
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
              <TouchableOpacity style={styles.retryButton} onPress={fetchBottomRowData}>
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
              <TouchableOpacity style={styles.emptyStateButton} onPress={fetchBottomRowData}>
                <RefreshCw size={16} color="#2563EB" />
                <Text style={styles.emptyStateButtonText}>Check for Updates</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>📊 Live data updates every 30 seconds</Text>
        <Text style={styles.footerSubtext}>LoadRush Analytics • Real-time insights for trucking operations</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: theme.colors.gray,
    fontWeight: '500' as const,
  },
  filterButtonTextActive: {
    color: theme.colors.white,
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
});

export default ReportAnalyticsScreen;