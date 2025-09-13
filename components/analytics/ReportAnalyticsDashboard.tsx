import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { BarChart3, TrendingUp, Users, Truck, DollarSign, Download, RefreshCw, Activity } from 'lucide-react-native';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface AnalyticsData {
  totalLoads: number;
  totalRevenue: number;
  activeUsers: number;
  completedLoads: number;
  pendingLoads: number;
  cancelledLoads: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  loadsByType: Array<{ type: string; count: number; color: string }>;
  userActivity: Array<{ date: string; drivers: number; shippers: number }>;
  systemStatus: {
    uptime: string;
    activeUsers: number;
    errorRate: string;
  };
}

const ReportAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalLoads: 1247,
    totalRevenue: 892450,
    activeUsers: 342,
    completedLoads: 1089,
    pendingLoads: 158,
    cancelledLoads: 23,
    revenueByMonth: [
      { month: 'Jan', revenue: 65000 },
      { month: 'Feb', revenue: 72000 },
      { month: 'Mar', revenue: 68000 },
      { month: 'Apr', revenue: 85000 },
      { month: 'May', revenue: 92000 },
      { month: 'Jun', revenue: 89000 },
    ],
    loadsByType: [
      { type: 'Flatbed', count: 456, color: '#3B82F6' },
      { type: 'Dry Van', count: 523, color: '#10B981' },
      { type: 'Refrigerated', count: 268, color: '#F59E0B' },
    ],
    userActivity: [
      { date: '2024-01-01', drivers: 120, shippers: 45 },
      { date: '2024-01-02', drivers: 135, shippers: 52 },
      { date: '2024-01-03', drivers: 142, shippers: 48 },
      { date: '2024-01-04', drivers: 128, shippers: 55 },
      { date: '2024-01-05', drivers: 156, shippers: 62 },
    ],
    systemStatus: {
      uptime: '99.8%',
      activeUsers: 342,
      errorRate: '0.2%',
    },
  });

  useEffect(() => {
    // Simulate API call
    const fetchAnalytics = async () => {
      setIsLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
      setLastUpdated(new Date());
    };

    fetchAnalytics();
  }, [timeRange]);

  const refreshData = () => {
    setLastUpdated(new Date());
    // Trigger data refresh
  };

  const exportToPDF = () => {
    console.log('Exporting to PDF...');
  };

  const exportToCSV = () => {
    console.log('Exporting to CSV...');
  };

  const MetricCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );

  const SimpleBarChart: React.FC<{ data: Array<{ type: string; count: number; color: string }> }> = ({ data }) => {
    const maxValue = Math.max(...data.map(item => item.count));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Load Distribution by Type</Text>
        <View style={styles.barChart}>
          {data.map((item, index) => (
            <View key={index} style={styles.barItem}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: (item.count / maxValue) * 120,
                    backgroundColor: item.color 
                  }
                ]} 
              />
              <Text style={styles.barLabel}>{item.type}</Text>
              <Text style={styles.barValue}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const SimpleLineChart: React.FC<{ data: Array<{ month: string; revenue: number }> }> = ({ data }) => {
    const maxRevenue = Math.max(...data.map(item => item.revenue));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Trends</Text>
        <View style={styles.lineChart}>
          <View style={styles.lineChartGrid}>
            {data.map((item, index) => (
              <View key={index} style={styles.linePoint}>
                <View 
                  style={[
                    styles.point,
                    { bottom: (item.revenue / maxRevenue) * 100 }
                  ]}
                />
                <Text style={styles.lineLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Report Analytics</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={refreshData} style={styles.actionButton}>
            <RefreshCw size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToPDF} style={styles.actionButton}>
            <Download size={20} color="#3B82F6" />
            <Text style={styles.actionText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToCSV} style={styles.actionButton}>
            <Download size={20} color="#3B82F6" />
            <Text style={styles.actionText}>CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Range Toggle */}
      <View style={styles.timeRangeContainer}>
        {(['daily', 'weekly', 'monthly', 'quarterly'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setTimeRange(range)}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive
            ]}
          >
            <Text style={[
              styles.timeRangeText,
              timeRange === range && styles.timeRangeTextActive
            ]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Loads"
          value={analyticsData.totalLoads.toLocaleString()}
          icon={<Truck size={24} color="#3B82F6" />}
          color="#3B82F6"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${(analyticsData.totalRevenue / 1000).toFixed(0)}K`}
          icon={<DollarSign size={24} color="#10B981" />}
          color="#10B981"
        />
        <MetricCard
          title="Active Users"
          value={analyticsData.activeUsers.toString()}
          icon={<Users size={24} color="#F59E0B" />}
          color="#F59E0B"
        />
        <MetricCard
          title="Completed Loads"
          value={analyticsData.completedLoads.toLocaleString()}
          icon={<TrendingUp size={24} color="#8B5CF6" />}
          color="#8B5CF6"
        />
      </View>

      {/* Charts Section */}
      <View style={styles.chartsSection}>
        <SimpleBarChart data={analyticsData.loadsByType} />
        <SimpleLineChart data={analyticsData.revenueByMonth} />
      </View>

      {/* System Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Live System Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Activity size={20} color="#10B981" />
            <Text style={styles.statusLabel}>Uptime</Text>
            <Text style={styles.statusValue}>{analyticsData.systemStatus.uptime}</Text>
          </View>
          <View style={styles.statusItem}>
            <Users size={20} color="#3B82F6" />
            <Text style={styles.statusLabel}>Active Users</Text>
            <Text style={styles.statusValue}>{analyticsData.systemStatus.activeUsers}</Text>
          </View>
          <View style={styles.statusItem}>
            <BarChart3 size={20} color="#F59E0B" />
            <Text style={styles.statusLabel}>Error Rate</Text>
            <Text style={styles.statusValue}>{analyticsData.systemStatus.errorRate}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>New load posted by ABC Logistics</Text>
            <Text style={styles.activityTime}>2 minutes ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>Driver John D. completed delivery</Text>
            <Text style={styles.activityTime}>5 minutes ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>Payment processed for Load #1247</Text>
            <Text style={styles.activityTime}>12 minutes ago</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {lastUpdated.toLocaleTimeString()} • Updated via API
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
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1E293B',
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
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#3B82F6',
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
    backgroundColor: '#3B82F6',
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
    gap: 20,
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
    backgroundColor: '#3B82F6',
    position: 'absolute',
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
});

export default ReportAnalyticsDashboard;