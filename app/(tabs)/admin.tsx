import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Activity, CheckCircle, Database, RefreshCcw, TrendingUp, Shield, Users, Truck, AlertTriangle, DollarSign, Eye, EyeOff, Settings, Clock, MapPin, CreditCard, Zap } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';
import { router } from 'expo-router';

type TabKey = 'overview' | 'users' | 'loads' | 'system' | 'analytics';

const fontWeight700 = '700' as const;
const fontWeight600 = '600' as const;

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function IconSwitch({ name, color, size }: { name: string; color: string; size: number }) {
  if (name === 'users') return <Users color={color} size={size} />;
  if (name === 'truck') return <Truck color={color} size={size} />;
  if (name === 'dollar') return <DollarSign color={color} size={size} />;
  if (name === 'alert') return <AlertTriangle color={color} size={size} />;
  if (name === 'database') return <Database color={color} size={size} />;
  if (name === 'activity') return <Activity color={color} size={size} />;
  if (name === 'trending') return <TrendingUp color={color} size={size} />;
  return <CheckCircle color={color} size={size} />;
}

function getActivityIcon(type: string, size: number = 16) {
  const color = theme.colors.gray;
  switch (type) {
    case 'user_login': return <Users color={color} size={size} />;
    case 'load_posted': return <Truck color={color} size={size} />;
    case 'payment': return <DollarSign color={color} size={size} />;
    case 'alert': return <AlertTriangle color={color} size={size} />;
    default: return <Activity color={color} size={size} />;
  }
}

function getHealthColor(status: string) {
  switch (status) {
    case 'healthy': return theme.colors.success;
    case 'warning': return theme.colors.warning;
    case 'error': return theme.colors.danger;
    default: return theme.colors.gray;
  }
}

function formatNow(): string {
  try {
    const d = new Date();
    const hours = d.getHours();
    const h12 = hours % 12 || 12;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    return `${h12}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${suffix}`;
  } catch (e) {
    console.log('[Admin] formatNow error', e);
    return '—';
  }
}

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  
  const { loads } = useLoads();
  
  const [stats, setStats] = useState([
    { id: 'activeUsers', label: 'Active Users', value: '142', icon: 'users', trend: '+12%' },
    { id: 'activeLoads', label: 'Active Loads', value: '89', icon: 'truck', trend: '+5%' },
    { id: 'revenue', label: 'Today Revenue', value: '$47,230', icon: 'dollar', trend: '+18%' },
    { id: 'alerts', label: 'System Alerts', value: '3', icon: 'alert', trend: '-2' },
  ]);
  
  const [systemHealth] = useState({
    api: { status: 'healthy', responseTime: '120ms', uptime: '99.9%' },
    database: { status: 'healthy', connections: 45, queries: '1.2k/min' },
    storage: { status: 'healthy', usage: '67%', available: '2.1TB' },
    notifications: { status: 'healthy', sent: '234', failed: '2' },
  });
  
  const [recentActivity, setRecentActivity] = useState([
    { id: '1', type: 'user_login', user: 'John Driver', time: '2 min ago', details: 'Logged in from mobile' },
    { id: '2', type: 'load_posted', user: 'ABC Logistics', time: '5 min ago', details: 'Posted load: Chicago → Dallas' },
    { id: '3', type: 'payment', user: 'Mike Trucker', time: '8 min ago', details: 'Payment processed: $2,450' },
    { id: '4', type: 'alert', user: 'System', time: '12 min ago', details: 'High API response time detected' },
  ]);
  
  const [liveMetrics, setLiveMetrics] = useState({
    totalLoads: 0,
    availableLoads: 0,
    inTransitLoads: 0,
    completedLoads: 0,
    totalRevenue: 0,
    avgRate: 0,
    topRoutes: [] as { route: string; count: number }[],
    recentBookings: [] as { id: string; route: string; rate: number; time: string }[]
  });
  
  const toggleLiveMode = useCallback(() => {
    setIsLiveMode(prev => !prev);
    console.log('[Admin] Live mode toggled:', !isLiveMode);
  }, [isLiveMode]);

  const onRefresh = useCallback(() => {
    console.log('[Admin] refresh tapped');
    // Refresh logic here
  }, []);
  
  // Admin access control
  const isAdmin = user?.email === 'admin@loadrush.com';
  
  useEffect(() => {
    if (!isAdmin) {
      console.log('[Admin] Access denied - redirecting');
      router.back();
      return;
    }
  }, [isAdmin]);
  
  // Calculate real-time metrics from loads data
  useEffect(() => {
    if (!loads.length) return;
    
    const availableLoads = loads.filter(l => l.status === 'available').length;
    const inTransitLoads = loads.filter(l => l.status === 'in-transit').length;
    const completedLoads = loads.filter(l => l.status === 'delivered').length;
    const totalRevenue = loads.reduce((sum, l) => sum + (l.rate || 0), 0);
    const avgRate = loads.length > 0 ? totalRevenue / loads.length : 0;
    
    // Calculate top routes
    const routeMap = new Map<string, number>();
    loads.forEach(load => {
      const route = `${load.origin.city}, ${load.origin.state} → ${load.destination.city}, ${load.destination.state}`;
      routeMap.set(route, (routeMap.get(route) || 0) + 1);
    });
    const topRoutes = Array.from(routeMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));
    
    // Recent bookings (in-transit loads)
    const recentBookings = loads
      .filter(l => l.status === 'in-transit')
      .slice(0, 5)
      .map(load => ({
        id: load.id,
        route: `${load.origin.city} → ${load.destination.city}`,
        rate: load.rate,
        time: 'Just now'
      }));
    
    setLiveMetrics({
      totalLoads: loads.length,
      availableLoads,
      inTransitLoads,
      completedLoads,
      totalRevenue,
      avgRate,
      topRoutes,
      recentBookings
    });
    
    // Update stats with real data
    setStats(prev => prev.map(stat => ({
      ...stat,
      value: stat.id === 'activeUsers' ? String(Math.floor(Math.random() * 50) + 120) :
             stat.id === 'activeLoads' ? String(availableLoads) :
             stat.id === 'revenue' ? `${totalRevenue.toLocaleString()}` :
             stat.value
    })));
  }, [loads]);
  
  // Live data refresh with simulated user activity
  useEffect(() => {
    if (!isLiveMode) return;
    
    const interval = setInterval(() => {
      // Simulate new activity
      const activities = [
        { type: 'user_login', user: 'Driver Mike', details: 'Logged in from mobile' },
        { type: 'load_posted', user: 'Swift Transport', details: 'Posted load: Miami → Atlanta' },
        { type: 'payment', user: 'Sarah Driver', details: 'Payment processed: $1,850' },
        { type: 'load_posted', user: 'Logistics Pro', details: 'Posted load: Denver → Phoenix' },
        { type: 'user_login', user: 'Shipper John', details: 'Logged in from web' },
      ];
      
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      const newActivity = {
        id: Date.now().toString(),
        ...randomActivity,
        time: 'Just now'
      };
      
      setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);
      
      // Update user count with slight variation
      setStats(prev => prev.map(stat => ({
        ...stat,
        value: stat.id === 'activeUsers' ? String(Math.floor(Math.random() * 20) + 130) : stat.value
      })));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLiveMode]);
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.accessDenied}>
          <Shield size={48} color={theme.colors.danger} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>Admin privileges required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="adminScreen">
      <ScrollView contentContainerStyle={styles.scroll} testID="adminOverviewScroll">
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Live monitoring & system control</Text>
          </View>
          <View style={styles.headerControls}>
            <TouchableOpacity onPress={toggleLiveMode} style={[styles.liveBtn, isLiveMode && styles.liveBtnActive]} testID="liveToggle">
              {isLiveMode ? <Eye color={theme.colors.white} size={16} /> : <EyeOff color={theme.colors.gray} size={16} />}
              <Text style={[styles.liveBtnText, isLiveMode && styles.liveBtnTextActive]}>LIVE</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.lastUpdate}>Last updated: {formatNow()}</Text>

        <View style={styles.tabsRow}>
          {(['overview','users','loads','system','analytics'] as TabKey[]).map((key) => {
            if (!key.trim()) return null;
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                accessibilityRole="button"
                testID={`tab-${key}`}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.tabSpacer} />
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} accessibilityRole="button" testID="refreshBtn">
            <RefreshCcw color={theme.colors.secondary} size={20} />
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <>
            <View style={styles.grid}>
              {stats.map((s) => (
                <View key={s.id} style={styles.card} testID={`stat-${s.id}`}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconWrap}>
                      <IconSwitch name={s.icon} color={theme.colors.secondary} size={20} />
                    </View>
                    <Text style={styles.trendText}>{s.trend}</Text>
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>System Health</Text>
            <View style={styles.healthGrid}>
              {Object.entries(systemHealth).map(([key, health]) => (
                <View key={key} style={styles.healthCard} testID={`health-${key}`}>
                  <View style={styles.healthHeader}>
                    <Text style={styles.healthTitle}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <View style={[styles.healthDot, { backgroundColor: getHealthColor(health.status) }]} />
                  </View>
                  <View style={styles.healthMetrics}>
                    {Object.entries(health).filter(([k]) => k !== 'status').map(([metricKey, value]) => (
                      <Text key={metricKey} style={styles.healthMetric}>
                        {metricKey}: {value}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Live Load Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Truck color={theme.colors.secondary} size={20} />
                  <Text style={styles.metricValue}>{liveMetrics.availableLoads}</Text>
                </View>
                <Text style={styles.metricLabel}>Available Loads</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Activity color={theme.colors.warning} size={20} />
                  <Text style={styles.metricValue}>{liveMetrics.inTransitLoads}</Text>
                </View>
                <Text style={styles.metricLabel}>In Transit</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <CheckCircle color={theme.colors.success} size={20} />
                  <Text style={styles.metricValue}>{liveMetrics.completedLoads}</Text>
                </View>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <DollarSign color={theme.colors.primary} size={20} />
                  <Text style={styles.metricValue}>${liveMetrics.avgRate.toFixed(0)}</Text>
                </View>
                <Text style={styles.metricLabel}>Avg Rate</Text>
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>Top Routes</Text>
            {liveMetrics.topRoutes.map((route) => (
              <View key={route.route} style={styles.routeCard}>
                <View style={styles.routeIcon}>
                  <MapPin color={theme.colors.secondary} size={16} />
                </View>
                <View style={styles.routeContent}>
                  <Text style={styles.routeName}>{route.route}</Text>
                  <Text style={styles.routeCount}>{route.count} loads</Text>
                </View>
              </View>
            ))}
            
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {liveMetrics.recentBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingIcon}>
                  <CreditCard color={theme.colors.success} size={16} />
                </View>
                <View style={styles.bookingContent}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingRoute}>{booking.route}</Text>
                    <Text style={styles.bookingRate}>${booking.rate.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.bookingTime}>{booking.time}</Text>
                </View>
              </View>
            ))}
            
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.slice(0, 6).map((activity) => (
              <View key={activity.id} style={styles.activityCard} testID={`activity-${activity.id}`}>
                <View style={styles.activityIcon}>
                  {getActivityIcon(activity.type)}
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityUser}>{activity.user}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                  <Text style={styles.activityDetails}>{activity.details}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        
        {activeTab === 'users' && (
          <>
            <View style={styles.userStatsGrid}>
              <View style={styles.userStatCard}>
                <Users color={theme.colors.primary} size={24} />
                <Text style={styles.userStatValue}>247</Text>
                <Text style={styles.userStatLabel}>Total Users</Text>
              </View>
              <View style={styles.userStatCard}>
                <Zap color={theme.colors.success} size={24} />
                <Text style={styles.userStatValue}>89</Text>
                <Text style={styles.userStatLabel}>Online Now</Text>
              </View>
              <View style={styles.userStatCard}>
                <Clock color={theme.colors.warning} size={24} />
                <Text style={styles.userStatValue}>34</Text>
                <Text style={styles.userStatLabel}>New Today</Text>
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>User Activity</Text>
            <View style={styles.userActivityList}>
              {[
                { name: 'Mike Johnson', role: 'Driver', status: 'Active', lastSeen: '2 min ago' },
                { name: 'ABC Logistics', role: 'Shipper', status: 'Active', lastSeen: '5 min ago' },
                { name: 'Sarah Wilson', role: 'Driver', status: 'Idle', lastSeen: '15 min ago' },
                { name: 'Swift Transport', role: 'Shipper', status: 'Active', lastSeen: '1 min ago' },
                { name: 'Tom Rodriguez', role: 'Driver', status: 'Offline', lastSeen: '2 hours ago' },
              ].map((user) => (
                <View key={user.name} style={styles.userActivityCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>{user.role}</Text>
                  </View>
                  <View style={styles.userStatus}>
                    <View style={[styles.statusDot, { 
                      backgroundColor: user.status === 'Active' ? theme.colors.success : 
                                     user.status === 'Idle' ? theme.colors.warning : theme.colors.gray 
                    }]} />
                    <Text style={styles.userLastSeen}>{user.lastSeen}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        
        {activeTab === 'loads' && (
          <>
            <View style={styles.loadStatsGrid}>
              <View style={styles.loadStatCard}>
                <Text style={styles.loadStatValue}>{liveMetrics.totalLoads}</Text>
                <Text style={styles.loadStatLabel}>Total Loads</Text>
              </View>
              <View style={styles.loadStatCard}>
                <Text style={styles.loadStatValue}>{liveMetrics.availableLoads}</Text>
                <Text style={styles.loadStatLabel}>Available</Text>
              </View>
              <View style={styles.loadStatCard}>
                <Text style={styles.loadStatValue}>{liveMetrics.inTransitLoads}</Text>
                <Text style={styles.loadStatLabel}>In Transit</Text>
              </View>
              <View style={styles.loadStatCard}>
                <Text style={styles.loadStatValue}>${liveMetrics.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.loadStatLabel}>Total Value</Text>
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>Load Distribution</Text>
            <View style={styles.loadDistribution}>
              {[
                { type: 'Van', count: Math.floor(liveMetrics.totalLoads * 0.4), color: theme.colors.primary },
                { type: 'Flatbed', count: Math.floor(liveMetrics.totalLoads * 0.3), color: theme.colors.secondary },
                { type: 'Reefer', count: Math.floor(liveMetrics.totalLoads * 0.2), color: theme.colors.success },
                { type: 'Other', count: Math.floor(liveMetrics.totalLoads * 0.1), color: theme.colors.warning },
              ].map((item) => (
                <View key={item.type} style={styles.distributionItem}>
                  <View style={[styles.distributionColor, { backgroundColor: item.color }]} />
                  <Text style={styles.distributionType}>{item.type}</Text>
                  <Text style={styles.distributionCount}>{item.count}</Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Recent Load Activity</Text>
            {loads.slice(0, 5).map((load) => (
              <View key={load.id} style={styles.loadActivityCard}>
                <View style={styles.loadActivityIcon}>
                  <Truck color={theme.colors.secondary} size={16} />
                </View>
                <View style={styles.loadActivityContent}>
                  <Text style={styles.loadActivityRoute}>
                    {load.origin.city}, {load.origin.state} → {load.destination.city}, {load.destination.state}
                  </Text>
                  <View style={styles.loadActivityDetails}>
                    <Text style={styles.loadActivityRate}>${load.rate.toLocaleString()}</Text>
                    <Text style={styles.loadActivityStatus}>{load.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
        
        {activeTab === 'system' && (
          <View style={styles.placeholder}>
            <Settings size={32} color={theme.colors.gray} />
            <Text style={styles.placeholderText}>System Configuration</Text>
            <Text style={styles.placeholderSubtext}>Manage system settings, API keys, and integrations</Text>
          </View>
        )}
        
        {activeTab === 'analytics' && (
          <>
            <Text style={styles.sectionTitle}>Revenue Analytics</Text>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueValue}>${liveMetrics.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
                <Text style={styles.revenueTrend}>+18% vs last month</Text>
              </View>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueValue}>${liveMetrics.avgRate.toFixed(0)}</Text>
                <Text style={styles.revenueLabel}>Avg Rate</Text>
                <Text style={styles.revenueTrend}>+5% vs last month</Text>
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.performanceList}>
              {[
                { metric: 'Load Completion Rate', value: '94.2%', trend: '+2.1%', color: theme.colors.success },
                { metric: 'Average Delivery Time', value: '2.3 days', trend: '-0.2 days', color: theme.colors.success },
                { metric: 'Customer Satisfaction', value: '4.7/5', trend: '+0.1', color: theme.colors.success },
                { metric: 'Driver Utilization', value: '87%', trend: '+3%', color: theme.colors.success },
                { metric: 'Platform Uptime', value: '99.9%', trend: '0%', color: theme.colors.success },
              ].map((item) => (
                <View key={item.metric} style={styles.performanceCard}>
                  <View style={styles.performanceInfo}>
                    <Text style={styles.performanceMetric}>{item.metric}</Text>
                    <Text style={styles.performanceValue}>{item.value}</Text>
                  </View>
                  <Text style={[styles.performanceTrend, { color: item.color }]}>{item.trend}</Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Growth Trends</Text>
            <View style={styles.trendsList}>
              {[
                { period: 'This Week', users: '+23', loads: '+45', revenue: '+$12.5K' },
                { period: 'This Month', users: '+89', loads: '+156', revenue: '+$47.2K' },
                { period: 'This Quarter', users: '+234', loads: '+567', revenue: '+$156.8K' },
              ].map((trend) => (
                <View key={trend.period} style={styles.trendCard}>
                  <Text style={styles.trendPeriod}>{trend.period}</Text>
                  <View style={styles.trendMetrics}>
                    <Text style={styles.trendItem}>Users: {trend.users}</Text>
                    <Text style={styles.trendItem}>Loads: {trend.loads}</Text>
                    <Text style={styles.trendItem}>Revenue: {trend.revenue}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  h1: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.gray, marginTop: 2 },
  headerControls: { flexDirection: 'row', alignItems: 'center' },
  liveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.md },
  liveBtnActive: { backgroundColor: theme.colors.success },
  liveBtnText: { marginLeft: 6, fontSize: theme.fontSize.sm, fontWeight: fontWeight600, color: theme.colors.gray },
  liveBtnTextActive: { color: theme.colors.white },
  lastUpdate: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginBottom: theme.spacing.md },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  accessDeniedTitle: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.danger, marginTop: theme.spacing.md },
  accessDeniedText: { fontSize: theme.fontSize.md, color: theme.colors.gray, marginTop: theme.spacing.sm },
  tabsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  tabBtnActive: { backgroundColor: hexToRgba(theme.colors.secondary, 0.1), borderColor: theme.colors.secondary },
  tabText: { color: theme.colors.gray, fontWeight: fontWeight600 },
  tabTextActive: { color: theme.colors.secondary },
  refreshBtn: { padding: 10, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 as unknown as number },
  card: { flex: 1, minWidth: 140, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: hexToRgba(theme.colors.secondary, 0.1), alignItems: 'center', justifyContent: 'center' },
  trendText: { fontSize: theme.fontSize.sm, fontWeight: fontWeight600, color: theme.colors.success },
  statValue: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark },
  statLabel: { color: theme.colors.gray, marginTop: 4 },

  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },

  placeholder: { padding: theme.spacing.xl, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  placeholderText: { fontSize: theme.fontSize.lg, fontWeight: fontWeight600, color: theme.colors.dark, marginTop: theme.spacing.md },
  placeholderSubtext: { fontSize: theme.fontSize.md, color: theme.colors.gray, marginTop: theme.spacing.sm, textAlign: 'center' },
  
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 as unknown as number },
  healthCard: { flex: 1, minWidth: 140, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  healthTitle: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthMetrics: { gap: 4 },
  healthMetric: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  
  activityCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: hexToRgba(theme.colors.gray, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  activityContent: { flex: 1 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityUser: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  activityTime: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  activityDetails: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  
  tabSpacer: { flex: 1 },
  
  // Live Metrics Styles
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 as unknown as number, marginBottom: theme.spacing.lg },
  metricCard: { flex: 1, minWidth: 140, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  metricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metricValue: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  metricLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  
  // Route Cards
  routeCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  routeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: hexToRgba(theme.colors.secondary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  routeContent: { flex: 1 },
  routeName: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  routeCount: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  
  // Booking Cards
  bookingCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  bookingIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: hexToRgba(theme.colors.success, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  bookingContent: { flex: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingRoute: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  bookingRate: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.success },
  bookingTime: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  
  // User Management Styles
  userStatsGrid: { flexDirection: 'row', gap: 12 as unknown as number, marginBottom: theme.spacing.lg },
  userStatCard: { flex: 1, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  userStatValue: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark, marginTop: 8 },
  userStatLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 4 },
  
  userActivityList: { gap: 8 },
  userActivityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  userInfo: { flex: 1 },
  userName: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  userRole: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  userStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  userLastSeen: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  
  // Load Management Styles
  loadStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 as unknown as number, marginBottom: theme.spacing.lg },
  loadStatCard: { flex: 1, minWidth: 140, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  loadStatValue: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark },
  loadStatLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 4 },
  
  loadDistribution: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.lg },
  distributionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  distributionColor: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  distributionType: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.dark },
  distributionCount: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  
  loadActivityCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  loadActivityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: hexToRgba(theme.colors.secondary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  loadActivityContent: { flex: 1 },
  loadActivityRoute: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  loadActivityDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  loadActivityRate: { fontSize: theme.fontSize.sm, fontWeight: fontWeight600, color: theme.colors.success },
  loadActivityStatus: { fontSize: theme.fontSize.sm, color: theme.colors.gray, textTransform: 'capitalize' },
  
  // Analytics Styles
  revenueGrid: { flexDirection: 'row', gap: 12 as unknown as number, marginBottom: theme.spacing.lg },
  revenueCard: { flex: 1, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  revenueValue: { fontSize: theme.fontSize.xxl, fontWeight: fontWeight700, color: theme.colors.dark },
  revenueLabel: { fontSize: theme.fontSize.md, color: theme.colors.gray, marginTop: 4 },
  revenueTrend: { fontSize: theme.fontSize.sm, color: theme.colors.success, marginTop: 4 },
  
  performanceList: { gap: 8, marginBottom: theme.spacing.lg },
  performanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  performanceInfo: { flex: 1 },
  performanceMetric: { fontSize: theme.fontSize.md, color: theme.colors.dark },
  performanceValue: { fontSize: theme.fontSize.lg, fontWeight: fontWeight600, color: theme.colors.dark, marginTop: 2 },
  performanceTrend: { fontSize: theme.fontSize.sm, fontWeight: fontWeight600 },
  
  trendsList: { gap: 8 },
  trendCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  trendPeriod: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark, marginBottom: 8 },
  trendMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  trendItem: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
});