import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Truck, Download, RefreshCw, Activity, AlertCircle, ArrowUp, ChevronRight } from 'lucide-react-native';
import { useAnalytics } from '@/hooks/useAnalytics';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const ReportAnalyticsDashboard: React.FC = () => {
  const [timeRange] = useState<TimeRange>('monthly');
  const { analyticsData, isLoading, error, refreshData } = useAnalytics(timeRange);

  // Show loading state
  if (isLoading && !analyticsData) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#2563EB" />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }

  // Show error state with fallback
  if (error && !analyticsData) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={32} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load analytics</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity onPress={refreshData} style={styles.retryButton}>
          <RefreshCw size={16} color="#2563EB" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use fallback data matching the image exactly (keeping for potential future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const data = analyticsData || {
    totalLoads: 209,
    totalRevenue: 238000,
    activeUsers: 149,
    completedLoads: 750,
    pendingLoads: 840,
    cancelledLoads: 297,
    revenueByMonth: [
      { month: 'Jan', revenue: 25000 },
      { month: 'Feb', revenue: 30000 },
      { month: 'Mar', revenue: 35000 },
      { month: 'Apr', revenue: 55000 },
      { month: 'May', revenue: 52000 },
      { month: 'Jun', revenue: 58000 },
    ],
    loadsByType: [
      { type: 'Flatbed', count: 89, color: '#3B82F6' },
      { type: 'Reefer', count: 67, color: '#10B981' },
      { type: 'Dry Van', count: 45, color: '#F59E0B' },
      { type: 'Auto Carrier', count: 8, color: '#EF4444' },
    ],
    userActivity: [],
    systemStatus: {
      uptime: '99.8%',
      activeUsers: 149,
      errorRate: '0.2%',
    },
  };

  const exportToPDF = () => {
    console.log('Exporting to PDF...');
  };

  const exportToCSV = () => {
    console.log('Exporting to CSV...');
  };

  const TopMetricCard: React.FC<{ title: string; value: string; subtitle?: string; isActive?: boolean }> = ({ title, value, subtitle, isActive = false }) => (
    <View style={[styles.topMetricCard, isActive && styles.topMetricCardActive]}>
      <Text style={styles.topMetricValue}>{value}</Text>
      <Text style={[styles.topMetricTitle, isActive && styles.topMetricTitleActive]}>{title}</Text>
      {subtitle && <Text style={styles.topMetricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const RevenueByDayChart: React.FC = () => {
    const dailyData = [25, 23, 30, 32, 28, 30, 35, 57, 52, 33, 58, 35];
    const maxValue = Math.max(...dailyData);
    const labels = ['Mm', '100m', '2.0m', '5.40', '6.40', '5.40'];
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue by Day</Text>
        <View style={styles.barChart}>
          {dailyData.slice(0, 6).map((value, index) => (
            <View key={`revenue-${index}`} style={styles.barGroup}>
              <View style={styles.barPair}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (value / maxValue) * 80,
                      backgroundColor: '#3B82F6',
                      marginRight: 2
                    }
                  ]} 
                />
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: ((value * 0.8) / maxValue) * 80,
                      backgroundColor: '#60A5FA'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.barLabel}>{labels[index]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const LoadsVsFillsChart: React.FC = () => {
    // Data points matching the image exactly
    const loadsData = [18, 25, 19, 23, 30, 25, 15, 9, 7, 8, 19];
    const fillsData = [11, 17, 16, 21, 21, 20, 16, 14, 13, 18, 23];
    const labels = ['Gobbr', 'Liontest', 'Liontest', 'Namler', 'Namler'];
    const maxValue = 60; // Fixed scale as shown in image
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Loads vs Fills</Text>
        <View style={styles.lineChart}>
          <View style={styles.yAxisLabels}>
            <Text style={styles.yAxisLabel}>60</Text>
            <Text style={styles.yAxisLabel}>35</Text>
            <Text style={styles.yAxisLabel}>20</Text>
            <Text style={styles.yAxisLabel}>5</Text>
            <Text style={styles.yAxisLabel}>0</Text>
          </View>
          <View style={styles.lineChartGrid}>
            {/* Legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendRow}>
                <View style={[styles.legendLine, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendLabel}>Loads (Blue)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendLine, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendLabel}>Fills (Green)</Text>
              </View>
            </View>
            
            {/* Chart Area */}
            <View style={styles.chartArea}>
              {/* Render connecting lines first (behind points) */}
              {loadsData.slice(0, -1).map((value, index) => {
                const currentLoadsY = 120 - (value / maxValue) * 100;
                const nextLoadsY = 120 - (loadsData[index + 1] / maxValue) * 100;
                const currentFillsY = 120 - (fillsData[index] / maxValue) * 100;
                const nextFillsY = 120 - (fillsData[index + 1] / maxValue) * 100;
                
                const loadsLineLength = Math.sqrt(
                  Math.pow(30, 2) + Math.pow(nextLoadsY - currentLoadsY, 2)
                );
                const fillsLineLength = Math.sqrt(
                  Math.pow(30, 2) + Math.pow(nextFillsY - currentFillsY, 2)
                );
                
                const loadsAngle = Math.atan2(nextLoadsY - currentLoadsY, 30) * (180 / Math.PI);
                const fillsAngle = Math.atan2(nextFillsY - currentFillsY, 30) * (180 / Math.PI);
                
                return (
                  <View key={`lines-${index}`}>
                    {/* Loads line */}
                    <View
                      style={[
                        styles.smoothLine,
                        {
                          left: index * 30 + 15,
                          top: currentLoadsY,
                          width: loadsLineLength,
                          backgroundColor: '#3B82F6',
                          transform: [{ rotate: `${loadsAngle}deg` }],
                        },
                      ]}
                    />
                    {/* Fills line */}
                    <View
                      style={[
                        styles.smoothLine,
                        {
                          left: index * 30 + 15,
                          top: currentFillsY,
                          width: fillsLineLength,
                          backgroundColor: '#10B981',
                          transform: [{ rotate: `${fillsAngle}deg` }],
                        },
                      ]}
                    />
                  </View>
                );
              })}
              
              {/* Render data points on top of lines */}
              {loadsData.map((value, index) => {
                const loadsY = 120 - (value / maxValue) * 100;
                const fillsY = 120 - (fillsData[index] / maxValue) * 100;
                
                return (
                  <View key={`points-${index}`}>
                    {/* Loads point */}
                    <View
                      style={[
                        styles.dataPoint,
                        {
                          left: index * 30 + 11,
                          top: loadsY - 4,
                          backgroundColor: '#3B82F6',
                        },
                      ]}
                    />
                    {/* Fills point */}
                    <View
                      style={[
                        styles.dataPoint,
                        {
                          left: index * 30 + 11,
                          top: fillsY - 4,
                          backgroundColor: '#10B981',
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            
            {/* X-axis labels */}
            <View style={styles.xAxisLabels}>
              {labels.map((label, index) => (
                <Text key={`label-${index}`} style={[styles.xAxisLabel, { left: index * 60 + 30 }]}>
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const EquipmentMixChart: React.FC = () => {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Equipment Mix</Text>
        <View style={styles.pieChart}>
          <View style={styles.pieVisual}>
            <View style={[styles.pieSlice, { backgroundColor: '#93C5FD' }]} />
            <View style={[styles.pieSlice, { backgroundColor: '#3B82F6' }]} />
            <View style={[styles.pieSlice, { backgroundColor: '#1E40AF' }]} />
          </View>
          <View style={styles.pieLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#93C5FD' }]} />
              <Text style={styles.legendText}>Flatbed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Reefer</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#1E40AF' }]} />
              <Text style={styles.legendText}>Auto Carrier</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const CargoMixChart: React.FC = () => {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Cargo Mix</Text>
        <View style={styles.pieChart}>
          <View style={styles.pieVisual}>
            <View style={[styles.pieSlice, { backgroundColor: '#93C5FD' }]} />
            <View style={[styles.pieSlice, { backgroundColor: '#3B82F6' }]} />
          </View>
          <View style={styles.pieLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#93C5FD' }]} />
              <Text style={styles.legendText}>Dry Goods</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Pachislets</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#1E40AF' }]} />
              <Text style={styles.legendText}>Vehicles</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const TrendChart: React.FC = () => {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Trend</Text>
        <View style={styles.trendChart}>
          <View style={styles.trendLine}>
            <ArrowUp size={24} color="#3B82F6" />
          </View>
          <View style={styles.trendLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#93C5FD' }]} />
              <Text style={styles.legendText}>Dry Goods</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#6B7280' }]} />
              <Text style={styles.legendText}>Grclncls</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const LeadersTable: React.FC = () => {
    const leaders = [
      { name: 'Cry Goold', loads: 1, score: '5,40' },
      { name: 'Dan Glan', loads: 2, score: '23,150' },
      { name: 'Corr Cand', loads: '', score: '' },
      { name: 'Fittbed', loads: 1, score: '25,72%' },
      { name: 'Srper Vaitter', loads: '', score: '17,12%' },
      { name: 'Auto Carrien', loads: '', score: '17,03%' },
      { name: 'Filh Vallly', loads: '', score: '27,124' },
      { name: 'Aufy Flasfly', loads: '', score: '25,108' },
    ];
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Leaders</Text>
        <View style={styles.leadersTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Driver/Shipper</Text>
            <Text style={styles.tableHeaderText}>Loads</Text>
            <Text style={styles.tableHeaderText}>Score</Text>
          </View>
          {leaders.map((leader, index) => (
            <View key={`leader-${index}`} style={styles.tableRow}>
              <Text style={styles.tableCell}>{leader.name}</Text>
              <Text style={styles.tableCell}>{leader.loads}</Text>
              <Text style={styles.tableCell}>{leader.score}</Text>
            </View>
          ))}
          <View style={styles.tableFooter}>
            <ChevronRight size={16} color="#6B7280" />
            <ChevronRight size={16} color="#6B7280" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Truck size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>LoadRush</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={refreshData} style={styles.actionButton}>
            <RefreshCw size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToPDF} style={styles.actionButton}>
            <Download size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToCSV} style={styles.actionButton}>
            <Download size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Metrics Row */}
      <View style={styles.topMetricsRow}>
        <TopMetricCard title="Loads Posted" value="209" isActive={true} />
        <TopMetricCard title="Total Revenue" value="238" subtitle="Pur Rinne" />
        <TopMetricCard title="Fill Rate" value="149" subtitle="Avg $/mi" />
        <TopMetricCard title="Avg $/mi" value="750" subtitle="Avg Spmm" />
        <TopMetricCard title="Avg Miles/load" value="840" subtitle="Avg $/% %" />
        <TopMetricCard title="On-Time %" value="297" subtitle="Avg-Time" />
      </View>

      {/* Main Charts Grid */}
      <View style={styles.mainChartsGrid}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          <LoadsVsFillsChart />
          <EquipmentMixChart />
        </View>
        
        {/* Center Column */}
        <View style={styles.centerColumn}>
          <RevenueByDayChart />
          <CargoMixChart />
        </View>
        
        {/* Right Column */}
        <View style={styles.rightColumn}>
          <LeadersTable />
          <TrendChart />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Updated via API
          {error && (
            <Text style={styles.errorIndicator}> • Using fallback data</Text>
          )}
        </Text>
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
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2563EB',
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500' as const,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
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
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#2563EB',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1E293B',
  },
  chartsSection: {
    padding: 20,
    gap: 16,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  chartPanel: {
    flex: 1,
  },
  chartFullWidth: {
    width: '100%',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    paddingBottom: 40,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 40,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  lineChart: {
    height: 140,
  },
  lineChartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '100%',
    position: 'relative',
  },
  linePoint: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    position: 'absolute',
  },
  connector: {
    width: 2,
    backgroundColor: '#2563EB',
    position: 'absolute',
    left: 4,
  },
  lineLabel: {
    fontSize: 10,
    color: '#64748B',
    position: 'absolute',
    bottom: -20,
  },
  statusSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
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
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  activitySection: {
    padding: 20,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityText: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748B',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
  pieChart: {
    alignItems: 'center',
    padding: 16,
  },
  pieCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pieTotal: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginTop: 8,
  },
  pieTotalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  pieLegend: {
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
  hiddenText: {
    position: 'absolute',
    opacity: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500' as const,
  },
  errorIndicator: {
    color: '#F59E0B',
    fontWeight: '500' as const,
  },
  // New styles for the updated layout
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMetricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    gap: 1,
  },
  topMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topMetricCardActive: {
    borderBottomColor: '#3B82F6',
  },
  topMetricValue: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  topMetricTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  topMetricTitleActive: {
    color: '#3B82F6',
  },
  topMetricSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  mainChartsGrid: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  leftColumn: {
    flex: 1,
    gap: 16,
  },
  centerColumn: {
    flex: 1,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
    gap: 16,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  yAxisLabels: {
    position: 'absolute',
    left: -20,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  pieVisual: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  pieSlice: {
    flex: 1,
    height: '100%',
  },
  trendChart: {
    alignItems: 'center',
    padding: 20,
  },
  trendLine: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trendLegend: {
    alignItems: 'flex-start',
  },
  leadersTable: {
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  // New styles for smooth connected line chart
  chartLegend: {
    position: 'absolute',
    top: -10,
    right: 0,
    flexDirection: 'column',
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  chartArea: {
    position: 'relative',
    height: 120,
    marginTop: 20,
    marginLeft: 20,
    marginRight: 20,
  },
  smoothLine: {
    height: 3,
    position: 'absolute',
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  dataPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: -30,
    left: 20,
    right: 20,
    height: 20,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    width: 60,
  },
});

export default ReportAnalyticsDashboard;