import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Truck, DollarSign, Package, Eye, Edit, Trash2, BarChart3, Clock, Target, AlertTriangle, MapPin, Upload } from 'lucide-react-native';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';



interface LoadRowProps {
  id: string;
  title: string;
  originCity: string;
  destinationCity: string;
  rate: number;
  status: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function LoadRow({ id, title, originCity, destinationCity, rate, status, onView, onEdit, onDelete }: LoadRowProps) {
  const statusColor = status === 'OPEN' ? '#10b981' : status === 'in-transit' ? '#f59e0b' : '#6b7280';
  
  return (
    <View style={styles.loadRow} testID={`load-row-${id}`}>
      <View style={styles.loadInfo}>
        <Text style={styles.loadTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.loadRoute}>{originCity} → {destinationCity}</Text>
        <View style={styles.loadMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
          <Text style={styles.loadRate}>${rate}</Text>
        </View>
      </View>
      <View style={styles.loadActions}>
        <TouchableOpacity onPress={() => onView(id)} style={styles.actionBtn} testID={`view-${id}`}>
          <Eye size={16} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(id)} style={styles.actionBtn} testID={`edit-${id}`}>
          <Edit size={16} color={theme.colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(id)} style={styles.actionBtn} testID={`delete-${id}`}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ShipperDashboard() {
  const router = useRouter();
  const { loads } = useLoads();
  const { user, userId } = useAuth();
  
  const shipperLoads = useMemo(() => {
    const uid = userId || user?.id || null;
    console.log('[ShipperDashboard] filter by uid:', uid);
    if (!uid) return [];
    return loads.filter(load => load.shipperId === uid);
  }, [loads, user?.id, userId]);
  
  const stats = useMemo(() => {
    const totalLoads = shipperLoads.length;
    const activeLoads = shipperLoads.filter(l => l.status === 'available' || l.status === 'in-transit').length;
    const completedLoads = shipperLoads.filter(l => l.status === 'delivered').length;
    const totalRevenue = shipperLoads.reduce((sum, l) => sum + (l.rate || 0), 0);
    const avgRate = totalLoads > 0 ? totalRevenue / totalLoads : 0;
    const completionRate = totalLoads > 0 ? (completedLoads / totalLoads) * 100 : 0;
    
    // Calculate trends (mock data for now - in real app would compare to previous period)
    const revenueGrowth = 12.5; // Mock 12.5% growth
    const loadGrowth = 8.3; // Mock 8.3% growth
    
    return { 
      totalLoads, 
      activeLoads, 
      completedLoads,
      totalRevenue, 
      avgRate, 
      completionRate,
      revenueGrowth,
      loadGrowth
    };
  }, [shipperLoads]);
  
  const analytics = useMemo(() => {
    // Performance metrics
    const avgTimeToBook = 2.3; // Mock average days to book
    const topRoutes = shipperLoads.reduce((acc, load) => {
      const route = `${load.origin?.city || 'Unknown'} → ${load.destination?.city || 'Unknown'}`;
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedRoutes = Object.entries(topRoutes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    // Calculate real issues
    const issues = [
      // Loads with very low rates (below $1000)
      ...shipperLoads.filter(load => (load.rate || 0) < 1000).map(load => `Low rate: ${load.description || 'Untitled'} (${load.rate})`),
      // Loads that have been available for too long (mock: more than 7 days old)
      // Note: Using pickupDate as proxy for creation date since createdAt is not available
      ...shipperLoads.filter(load => {
        if (load.status !== 'available') return false;
        const pickupDate = load.pickupDate ? new Date(load.pickupDate) : new Date();
        const daysDiff = (Date.now() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 7;
      }).map(load => `Stale load: ${load.description || 'Untitled'} (${Math.floor((Date.now() - (load.pickupDate ? new Date(load.pickupDate).getTime() : Date.now())) / (1000 * 60 * 60 * 24))} days old)`),
      // Loads missing critical information
      ...shipperLoads.filter(load => 
        !load.origin?.city || !load.destination?.city || !load.rate || !load.description
      ).map(load => `Incomplete info: ${load.description || load.id}`)
    ];
    
    // Revenue by month (mock data)
    const monthlyRevenue = [
      { month: 'Jan', revenue: 45000 },
      { month: 'Feb', revenue: 52000 },
      { month: 'Mar', revenue: 48000 },
      { month: 'Apr', revenue: 61000 },
      { month: 'May', revenue: 58000 },
      { month: 'Jun', revenue: 67000 },
    ];
    
    return {
      avgTimeToBook,
      topRoutes: sortedRoutes,
      monthlyRevenue,
      issues
    };
  }, [shipperLoads]);
  
  const handleViewLoad = useCallback((loadId: string) => {
    console.log('Viewing load:', loadId);
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);
  
  const handleEditLoad = useCallback((loadId: string) => {
    console.log('Editing load:', loadId);
    // Navigate to edit load page
  }, []);
  
  const handleDeleteLoad = useCallback((loadId: string) => {
    console.log('Deleting load:', loadId);
    // Implement delete functionality
  }, []);
  
  const handlePostNewLoad = useCallback(() => {
    router.push('/post-load');
  }, [router]);
  
  const handleBulkUpload = useCallback(() => {
    router.push('/csv-bulk-upload');
  }, [router]);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Shipper Dashboard</Text>
          <Text style={styles.subtitle}>Manage your loads and track performance</Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Package size={20} color={theme.colors.primary} />
              <View style={[styles.trendBadge, { backgroundColor: stats.loadGrowth > 0 ? '#dcfce7' : '#fef2f2' }]}>
                <Text style={[styles.trendText, { color: stats.loadGrowth > 0 ? '#16a34a' : '#dc2626' }]}>+{stats.loadGrowth}%</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{stats.totalLoads}</Text>
            <Text style={styles.statLabel}>Total Loads</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Truck size={20} color="#10b981" />
              <View style={styles.statusIndicator}>
                <Text style={styles.statusIndicatorText}>{stats.activeLoads} active</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{stats.completedLoads}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <DollarSign size={20} color="#f59e0b" />
              <View style={[styles.trendBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.trendText, { color: '#16a34a' }]}>+{stats.revenueGrowth}%</Text>
              </View>
            </View>
            <Text style={styles.statValue}>${stats.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Target size={20} color="#8b5cf6" />
              <Text style={styles.completionRate}>{Math.round(stats.completionRate)}%</Text>
            </View>
            <Text style={styles.statValue}>${Math.round(stats.avgRate)}</Text>
            <Text style={styles.statLabel}>Avg Rate</Text>
          </View>
        </View>
        
        {/* Analytics Section */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          
          {/* Key Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Clock size={18} color={theme.colors.primary} />
              <Text style={styles.metricValue}>{analytics.avgTimeToBook} days</Text>
              <Text style={styles.metricLabel}>Avg Time to Book</Text>
            </View>
            <View style={styles.metricCard}>
              <BarChart3 size={18} color="#10b981" />
              <Text style={styles.metricValue}>{Math.round(stats.completionRate)}%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>
            <TouchableOpacity 
              style={[styles.metricCard, analytics.issues.length > 0 && { borderColor: '#f59e0b', borderWidth: 1 }]}
              onPress={() => {
                if (analytics.issues.length > 0) {
                  console.log('Issues detected:', analytics.issues);
                  // Could navigate to issues detail page or show modal
                }
              }}
            >
              <AlertTriangle size={18} color={analytics.issues.length > 0 ? '#f59e0b' : '#6b7280'} />
              <Text style={[styles.metricValue, analytics.issues.length > 0 && { color: '#f59e0b' }]}>{analytics.issues.length}</Text>
              <Text style={styles.metricLabel}>Issues</Text>
            </TouchableOpacity>
          </View>
          
          {/* Revenue Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>Last 6 months</Text>
            </View>
            <View style={styles.chart}>
              {analytics.monthlyRevenue.map((item, index) => {
                const maxRevenue = Math.max(...analytics.monthlyRevenue.map(r => r.revenue));
                const height = (item.revenue / maxRevenue) * 80;
                return (
                  <View key={item.month} style={styles.chartBar}>
                    <View style={[styles.bar, { height }]} />
                    <Text style={styles.barLabel}>{item.month}</Text>
                    <Text style={styles.barValue}>${(item.revenue / 1000).toFixed(0)}k</Text>
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* Top Routes */}
          <View style={styles.routesCard}>
            <View style={styles.routesHeader}>
              <MapPin size={18} color={theme.colors.primary} />
              <Text style={styles.routesTitle}>Top Routes</Text>
            </View>
            {analytics.topRoutes.length > 0 ? (
              analytics.topRoutes.map(([route, count], index) => (
                <View key={route} style={styles.routeItem}>
                  <View style={styles.routeRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName} numberOfLines={1}>{route}</Text>
                    <Text style={styles.routeCount}>{count} loads</Text>
                  </View>
                  <View style={styles.routeBar}>
                    <View style={[styles.routeProgress, { width: `${(count / analytics.topRoutes[0][1]) * 100}%` }]} />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noRoutesText}>No routes data available</Text>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Loads</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={handleBulkUpload} style={styles.bulkBtn}>
                <Upload size={16} color={theme.colors.white} />
                <Text style={styles.bulkBtnText}>Bulk Upload</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePostNewLoad} style={styles.postBtn}>
                <Text style={styles.postBtnText}>Post New Load</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {shipperLoads.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color={theme.colors.gray} />
              <Text style={styles.emptyTitle}>No loads posted yet</Text>
              <Text style={styles.emptySubtitle}>Use the &ldquo;Post New Load&rdquo; button above to get started</Text>
            </View>
          ) : (
            <View style={styles.loadsList}>
              {shipperLoads.map((load) => (
                <LoadRow
                  key={load.id}
                  id={load.id}
                  title={load.description || 'Untitled Load'}
                  originCity={load.origin?.city || 'Unknown'}
                  destinationCity={load.destination?.city || 'Unknown'}
                  rate={load.rate || 0}
                  status={load.status}
                  onView={handleViewLoad}
                  onEdit={handleEditLoad}
                  onDelete={handleDeleteLoad}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  bulkBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  bulkBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  postBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  postBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  loadsList: {
    gap: theme.spacing.sm,
  },
  loadRow: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  loadInfo: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  loadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadRoute: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  loadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadRate: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loadActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionBtn: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusIndicator: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusIndicatorText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
  },
  completionRate: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '700',
  },
  analyticsSection: {
    marginBottom: theme.spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metricValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartHeader: {
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  chartSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: theme.spacing.sm,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    backgroundColor: theme.colors.primary,
    width: '80%',
    borderRadius: 2,
    marginBottom: theme.spacing.xs,
  },
  barLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  barValue: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    fontWeight: '600',
  },
  routesCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  routesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  routesTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  routeRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  rankText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  routeInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  routeName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  routeCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  routeBar: {
    width: 60,
    height: 4,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 2,
  },
  routeProgress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  noRoutesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },

});