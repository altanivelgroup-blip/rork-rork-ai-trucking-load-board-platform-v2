import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  ArrowDownRight
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
  
  // Redirect non-shippers
  React.useEffect(() => {
    if (user && !isShipper) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isShipper, router]);

  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `$${((user as any)?.totalRevenue ?? 125000).toLocaleString()}`,
      change: '+12.5%',
      isPositive: true,
      icon: DollarSign
    },
    {
      id: 'loads',
      title: 'Loads Posted',
      value: `${(user as any)?.totalLoadsPosted ?? 45}`,
      change: '+8.2%',
      isPositive: true,
      icon: Package
    },
    {
      id: 'active',
      title: 'Active Loads',
      value: `${(user as any)?.activeLoads ?? 12}`,
      change: '-2.1%',
      isPositive: false,
      icon: Clock
    },
    {
      id: 'completed',
      title: 'Completed',
      value: `${(user as any)?.completedLoads ?? 33}`,
      change: '+15.3%',
      isPositive: true,
      icon: BarChart3
    },
    {
      id: 'views',
      title: 'Total Views',
      value: `${Math.floor(((user as any)?.totalLoadsPosted ?? 45) * 23).toLocaleString()}`,
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
  ], [user]);

  if (!isShipper) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Analytics' }} />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Analytics Dashboard</Text>
          <Text style={styles.subheading}>Track your load performance and revenue</Text>
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

        {/* Performance Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.summaryCard}>
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
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
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
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
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
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  subheading: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
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