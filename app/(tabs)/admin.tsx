import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Activity, CheckCircle, Database, RefreshCcw, TrendingUp, Shield, Users, Truck, AlertTriangle, DollarSign, Eye, EyeOff, Settings } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
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
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  
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
  
  const [recentActivity] = useState([
    { id: '1', type: 'user_login', user: 'John Driver', time: '2 min ago', details: 'Logged in from mobile' },
    { id: '2', type: 'load_posted', user: 'ABC Logistics', time: '5 min ago', details: 'Posted load: Chicago → Dallas' },
    { id: '3', type: 'payment', user: 'Mike Trucker', time: '8 min ago', details: 'Payment processed: $2,450' },
    { id: '4', type: 'alert', user: 'System', time: '12 min ago', details: 'High API response time detected' },
  ]);
  
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
  
  // Live data refresh
  useEffect(() => {
    if (!isLiveMode) return;
    
    const interval = setInterval(() => {
      // Simulate live data updates
      setStats(prev => prev.map(stat => ({
        ...stat,
        value: stat.id === 'activeUsers' ? String(Math.floor(Math.random() * 50) + 120) :
               stat.id === 'activeLoads' ? String(Math.floor(Math.random() * 30) + 85) :
               stat.id === 'revenue' ? `${(Math.random() * 5000 + 45000).toFixed(0)}` :
               stat.value
      })));
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isLiveMode]);
  
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accessDenied}>
          <Shield size={48} color={theme.colors.danger} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>Admin privileges required</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="adminScreen">
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
            if (!key?.trim()) return null;
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

            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.map((activity) => (
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
          <View style={styles.placeholder}>
            <Users size={32} color={theme.colors.gray} />
            <Text style={styles.placeholderText}>User Management</Text>
            <Text style={styles.placeholderSubtext}>Monitor active users, registrations, and user activity</Text>
          </View>
        )}
        
        {activeTab === 'loads' && (
          <View style={styles.placeholder}>
            <Truck size={32} color={theme.colors.gray} />
            <Text style={styles.placeholderText}>Load Monitoring</Text>
            <Text style={styles.placeholderSubtext}>Track load postings, assignments, and delivery status</Text>
          </View>
        )}
        
        {activeTab === 'system' && (
          <View style={styles.placeholder}>
            <Settings size={32} color={theme.colors.gray} />
            <Text style={styles.placeholderText}>System Configuration</Text>
            <Text style={styles.placeholderSubtext}>Manage system settings, API keys, and integrations</Text>
          </View>
        )}
        
        {activeTab === 'analytics' && (
          <View style={styles.placeholder}>
            <TrendingUp size={32} color={theme.colors.gray} />
            <Text style={styles.placeholderText}>Analytics Dashboard</Text>
            <Text style={styles.placeholderSubtext}>View detailed analytics, reports, and business insights</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
});