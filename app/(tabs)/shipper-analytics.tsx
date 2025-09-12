import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Eye, 
  Clock,
  Users,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  Calendar,
  ChevronDown
} from 'lucide-react-native';

type MetricCard = {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

export default function ShipperAnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState<boolean>(false);
  
  // Allow both shippers and admins
  React.useEffect(() => {
    if (user && !isShipper && !isAdmin) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isShipper, isAdmin, router]);

  const periods = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' }
  ];

  const metrics: MetricCard[] = useMemo(() => {
    const multiplier = selectedPeriod === 'daily' ? 0.03 : selectedPeriod === 'weekly' ? 0.23 : selectedPeriod === 'monthly' ? 1 : 3;
    
    if (isAdmin) {
      return [
        {
          id: 'revenue',
          title: 'Total Revenue',
          value: `${Math.floor(187000 * multiplier).toLocaleString()}`,
          change: '+18% vs last month',
          isPositive: true,
          icon: DollarSign
        },
        {
          id: 'avgRate',
          title: 'Avg Rate',
          value: `${Math.floor(3740 * multiplier)}`,
          change: '+5% vs last month',
          isPositive: true,
          icon: TrendingUp
        },
        {
          id: 'completion',
          title: 'Load Completion Rate',
          value: '94.2%',
          change: '+2.1%',
          isPositive: true,
          icon: BarChart3
        },
        {
          id: 'deliveryTime',
          title: 'Average Delivery Time',
          value: '2.3 days',
          change: '-0.2 days',
          isPositive: true,
          icon: Clock
        },
        {
          id: 'satisfaction',
          title: 'Customer Satisfaction',
          value: '4.7/5',
          change: '+0.1',
          isPositive: true,
          icon: Star
        },
        {
          id: 'users',
          title: 'Active Users',
          value: `${Math.floor(1250 * multiplier)}`,
          change: '+12.3%',
          isPositive: true,
          icon: Users
        }
      ];
    } else {
      return [
        {
          id: 'revenue',
          title: 'Total Revenue',
          value: `${Math.floor(((user as any)?.totalRevenue ?? 125000) * multiplier).toLocaleString()}`,
          change: '+12.5%',
          isPositive: true,
          icon: DollarSign
        },
        {
          id: 'loads',
          title: 'Loads Posted',
          value: `${Math.floor(((user as any)?.totalLoadsPosted ?? 45) * multiplier)}`,
          change: '+8.2%',
          isPositive: true,
          icon: Package
        },
        {
          id: 'active',
          title: 'Active Loads',
          value: `${Math.floor(((user as any)?.activeLoads ?? 12) * multiplier)}`,
          change: '-2.1%',
          isPositive: false,
          icon: Clock
        },
        {
          id: 'completed',
          title: 'Completed',
          value: `${Math.floor(((user as any)?.completedLoads ?? 33) * multiplier)}`,
          change: '+15.3%',
          isPositive: true,
          icon: BarChart3
        },
        {
          id: 'views',
          title: 'Total Views',
          value: `${Math.floor(((user as any)?.totalLoadsPosted ?? 45) * 23 * multiplier).toLocaleString()}`,
          change: '+18.7%',
          isPositive: true,
          icon: Eye
        },
        {
          id: 'rating',
          title: 'Avg Rating',
          value: `${(user as any)?.avgRating ?? 4.6}`,
          change: '+0.2',
          isPositive: true,
          icon: Star
        }
      ];
    }
  }, [user, selectedPeriod, isAdmin]);

  if (!isShipper && !isAdmin) {
    return null;
  }

  const handleExportPDF = () => {
    if (Platform.OS === 'web') {
      console.log('Exporting PDF report...');
      // Web implementation would use libraries like jsPDF
    } else {
      console.log('PDF export not available on mobile');
    }
  };

  const handleExportCSV = () => {
    if (Platform.OS === 'web') {
      console.log('Exporting CSV report...');
      // Web implementation would generate CSV data
    } else {
      console.log('CSV export not available on mobile');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: isAdmin ? 'Reports' : 'Analytics',
        headerStyle: { backgroundColor: theme.colors.white },
        headerTitleStyle: { color: theme.colors.dark, fontWeight: '700' }
      }} />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.heading}>{isAdmin ? 'Admin Dashboard' : 'Analytics Dashboard'}</Text>
              <Text style={styles.subheading}>
                {isAdmin ? 'Live monitoring & system control' : 'Track your load performance and revenue'}
              </Text>
              <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleTimeString()}</Text>
            </View>
            {isAdmin && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          
          {/* Period Selector */}
          <View style={styles.periodContainer}>
            <TouchableOpacity 
              style={styles.periodSelector}
              onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <Calendar size={16} color={theme.colors.gray} />
              <Text style={styles.periodText}>
                {periods.find(p => p.value === selectedPeriod)?.label}
              </Text>
              <ChevronDown size={16} color={theme.colors.gray} />
            </TouchableOpacity>
            
            {showPeriodDropdown && (
              <View style={styles.periodDropdown}>
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period.value}
                    style={styles.periodOption}
                    onPress={() => {
                      setSelectedPeriod(period.value);
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.periodOptionText,
                      selectedPeriod === period.value && styles.periodOptionSelected
                    ]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Revenue Analytics Section */}
        {isAdmin && (
          <View style={styles.revenueSection}>
            <Text style={styles.sectionTitle}>Revenue Analytics</Text>
            <View style={styles.revenueCards}>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueValue}>$18,700</Text>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
                <Text style={styles.revenueChange}>+18% vs last month</Text>
              </View>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueValue}>$3740</Text>
                <Text style={styles.revenueLabel}>Avg Rate</Text>
                <Text style={styles.revenueChange}>+5% vs last month</Text>
              </View>
            </View>
          </View>
        )}

        {/* Performance Metrics Section */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.performanceCards}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Load Completion Rate</Text>
              <Text style={styles.performanceValue}>94.2%</Text>
              <Text style={styles.performanceChange}>+2.1%</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Average Delivery Time</Text>
              <Text style={styles.performanceValue}>2.3 days</Text>
              <Text style={styles.performanceChange}>-0.2 days</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Customer Satisfaction</Text>
              <Text style={styles.performanceValue}>4.7/5</Text>
              <Text style={styles.performanceChange}>+0.1</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <View key={metric.id} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricIconContainer}>
                  <metric.icon size={20} color={theme.colors.primary} />
                </View>
                <View style={[styles.changeContainer, metric.isPositive ? styles.changePositive : styles.changeNegative]}>
                  {metric.isPositive ? (
                    <ArrowUpRight size={12} color={theme.colors.success} />
                  ) : (
                    <ArrowDownRight size={12} color={theme.colors.danger} />
                  )}
                  <Text style={[styles.changeText, metric.isPositive ? styles.changeTextPositive : styles.changeTextNegative]}>
                    {metric.change}
                  </Text>
                </View>
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricTitle}>{metric.title}</Text>
            </View>
          ))}
        </View>

        {/* Export Actions */}
        <View style={styles.exportContainer}>
          <Text style={styles.sectionTitle}>Export Reports</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
              <FileText size={20} color={theme.colors.primary} />
              <Text style={styles.exportText}>Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
              <Download size={20} color={theme.colors.success} />
              <Text style={styles.exportText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Performance Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>{isAdmin ? 'System Overview' : 'Performance Summary'}</Text>
          <View style={styles.summaryCard}>
            {isAdmin ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Users</Text>
                  <Text style={styles.summaryValue}>1,247</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Active Loads</Text>
                  <Text style={styles.summaryValue}>89</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>System Uptime</Text>
                  <Text style={styles.summaryValue}>99.8%</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Error Rate</Text>
                  <Text style={styles.summaryValue}>0.2%</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Average Load Value</Text>
                  <Text style={styles.summaryValue}>
                    ${Math.floor(((user as any)?.totalRevenue ?? 125000) / ((user as any)?.completedLoads ?? 33)).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Completion Rate</Text>
                  <Text style={styles.summaryValue}>
                    {Math.floor((((user as any)?.completedLoads ?? 33) / ((user as any)?.totalLoadsPosted ?? 45)) * 100)}%
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Views per Load</Text>
                  <Text style={styles.summaryValue}>
                    {Math.floor(((user as any)?.totalLoadsPosted ?? 45) * 23 / ((user as any)?.totalLoadsPosted ?? 45))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Response Time</Text>
                  <Text style={styles.summaryValue}>2.3 hrs</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {isAdmin ? (
              <>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/admin')}
                >
                  <BarChart3 size={20} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Admin Panel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/loads')}
                >
                  <Package size={20} color={theme.colors.success} />
                  <Text style={styles.actionText}>All Loads</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/profile')}
                >
                  <Users size={20} color={theme.colors.warning} />
                  <Text style={styles.actionText}>User Management</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/settings')}
                >
                  <TrendingUp size={20} color={theme.colors.secondary} />
                  <Text style={styles.actionText}>Settings</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/shipper-dashboard')}
                >
                  <BarChart3 size={20} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Full Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/post-load')}
                >
                  <Package size={20} color={theme.colors.success} />
                  <Text style={styles.actionText}>Post Load</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/loads')}
                >
                  <Eye size={20} color={theme.colors.warning} />
                  <Text style={styles.actionText}>View Loads</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/shipper-membership')}
                >
                  <TrendingUp size={20} color={theme.colors.secondary} />
                  <Text style={styles.actionText}>Upgrade</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            {isAdmin ? (
              <>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Users size={16} color={theme.colors.success} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>New User Registration</Text>
                    <Text style={styles.activitySubtitle}>Driver: John Smith</Text>
                  </View>
                  <Text style={styles.activityTime}>15m ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Package size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Load Completed</Text>
                    <Text style={styles.activitySubtitle}>Chicago, IL → Dallas, TX</Text>
                  </View>
                  <Text style={styles.activityTime}>1h ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <DollarSign size={16} color={theme.colors.warning} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Payment Processed</Text>
                    <Text style={styles.activitySubtitle}>$3,250 for Load #LR-2024-089</Text>
                  </View>
                  <Text style={styles.activityTime}>2h ago</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Package size={16} color={theme.colors.success} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Load Posted</Text>
                    <Text style={styles.activitySubtitle}>Chicago, IL → Dallas, TX</Text>
                  </View>
                  <Text style={styles.activityTime}>2h ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Users size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Driver Assigned</Text>
                    <Text style={styles.activitySubtitle}>Load #LR-2024-001</Text>
                  </View>
                  <Text style={styles.activityTime}>4h ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <DollarSign size={16} color={theme.colors.warning} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Payment Processed</Text>
                    <Text style={styles.activitySubtitle}>$2,850 for Load #LR-2024-002</Text>
                  </View>
                  <Text style={styles.activityTime}>1d ago</Text>
                </View>
              </>
            )}
          </View>
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
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  subheading: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  liveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.success,
  },
  periodContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  periodText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
  },
  periodDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  periodOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  periodOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  periodOptionSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  revenueSection: {
    marginBottom: theme.spacing.lg,
  },
  revenueCards: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  revenueLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  revenueChange: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '600',
  },
  performanceSection: {
    marginBottom: theme.spacing.lg,
  },
  performanceCards: {
    gap: theme.spacing.sm,
  },
  performanceCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  performanceLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  performanceChange: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '600',
  },
  exportContainer: {
    marginBottom: theme.spacing.lg,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  exportText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  changePositive: {
    backgroundColor: '#E8F5E8',
  },
  changeNegative: {
    backgroundColor: '#FFF0F0',
  },
  changeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  changeTextPositive: {
    color: theme.colors.success,
  },
  changeTextNegative: {
    color: theme.colors.danger,
  },
  metricValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  summaryContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  actionsContainer: {
    marginBottom: theme.spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  activityContainer: {
    marginBottom: theme.spacing.lg,
  },
  activityCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  activityTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
});