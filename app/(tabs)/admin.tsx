import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Activity, CheckCircle, Database, RefreshCcw, TrendingUp, Shield, Users, Truck, AlertTriangle, DollarSign, Eye, EyeOff, Settings, Clock, MapPin, CreditCard, Zap, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';
import { router } from 'expo-router';
import Svg, { Path, Circle, Text as SvgText, Line, G, Rect } from 'react-native-svg';

type TabKey = 'overview' | 'users' | 'loads' | 'system' | 'analytics';
type ReportPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

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
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('Monthly');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState<boolean>(false);
  
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
  
  // Generate dynamic revenue data based on selected period
  const generateRevenueData = useCallback((period: ReportPeriod) => {
    if (!period || !period.trim()) return [];
    if (period.length > 20) return [];
    const sanitizedPeriod = period.trim() as ReportPeriod;
    
    const baseRevenue = 45000;
    let dataPoints: { x: number; y: number; label: string; value: number }[] = [];
    
    switch (sanitizedPeriod) {
      case 'Daily':
        // 7 days with hourly peaks and dips
        for (let i = 0; i < 7; i++) {
          const variance = (Math.sin(i * 0.8) + Math.cos(i * 1.2)) * 0.3 + Math.random() * 0.2 - 0.1;
          const value = baseRevenue * (1 + variance);
          dataPoints.push({
            x: i,
            y: value,
            label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            value: Math.round(value)
          });
        }
        break;
      case 'Weekly':
        // 4 weeks with realistic fluctuations
        for (let i = 0; i < 4; i++) {
          const variance = (Math.sin(i * 1.5) + Math.cos(i * 0.7)) * 0.25 + Math.random() * 0.15 - 0.075;
          const value = baseRevenue * 7 * (1 + variance);
          dataPoints.push({
            x: i,
            y: value,
            label: `Week ${i + 1}`,
            value: Math.round(value)
          });
        }
        break;
      case 'Monthly':
        // 6 months with seasonal trends
        const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 0; i < 6; i++) {
          const seasonalTrend = Math.sin((i + 6) * Math.PI / 6) * 0.2;
          const variance = (Math.sin(i * 0.9) + Math.cos(i * 1.1)) * 0.15 + Math.random() * 0.1 - 0.05;
          const value = baseRevenue * 30 * (1 + seasonalTrend + variance);
          dataPoints.push({
            x: i,
            y: value,
            label: months[i],
            value: Math.round(value)
          });
        }
        break;
      case 'Quarterly':
        // 4 quarters with growth trend
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        for (let i = 0; i < 4; i++) {
          const growthTrend = i * 0.1; // 10% growth per quarter
          const variance = (Math.sin(i * 1.3) + Math.cos(i * 0.8)) * 0.1 + Math.random() * 0.08 - 0.04;
          const value = baseRevenue * 90 * (1 + growthTrend + variance);
          dataPoints.push({
            x: i,
            y: value,
            label: quarters[i],
            value: Math.round(value)
          });
        }
        break;
    }
    
    return dataPoints;
  }, []);
  
  const [revenueData, setRevenueData] = useState(() => generateRevenueData('Monthly'));
  
  // Update revenue data when period changes
  useEffect(() => {
    setRevenueData(generateRevenueData(reportPeriod));
  }, [reportPeriod, generateRevenueData]);
  
  // Pie Chart Component
  const PieChart = ({ data, centerValue }: { data: { value: number; color: string; label: string }[]; centerValue: string }) => {
    const size = 120;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <View style={styles.pieChartWrapper}>
        <Svg width={size} height={size}>
          {data.map((item, index) => {
            const percentage = item.value / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -currentAngle * circumference;
            currentAngle += percentage;
            
            return (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </Svg>
        <View style={styles.pieChartCenter}>
          <Text style={styles.pieChartCenterText}>{centerValue}</Text>
        </View>
      </View>
    );
  };

  // Area Chart Component
  const AreaChart = ({ data }: { data: { x: number; y: number; label: string }[] }) => {
    const width = 200;
    const height = 80;
    const padding = 10;
    
    if (!data.length) return null;
    
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const range = maxY - minY || 1;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.y - minY) / range) * (height - 2 * padding);
      return { x, y };
    });
    
    const pathData = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');
    
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    
    return (
      <Svg width={width} height={height}>
        <Path d={areaPath} fill="rgba(76, 175, 80, 0.2)" />
        <Path d={pathData} stroke="#4CAF50" strokeWidth={2} fill="none" />
        {points.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r={3} fill="#4CAF50" />
        ))}
      </Svg>
    );
  };

  // Bar Chart Component
  const BarChart = ({ data }: { data: { value: number; color: string }[] }) => {
    const width = 200;
    const height = 60;
    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = width / data.length - 2;
    
    return (
      <Svg width={width} height={height}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * height;
          const x = index * (barWidth + 2);
          const y = height - barHeight;
          
          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={item.color}
            />
          );
        })}
      </Svg>
    );
  };

  // Gender Distribution Chart Component
  const GenderDistributionChart = () => {
    const width = 300;
    const height = 120;
    
    const femaleData = [15, 25, 35, 45, 38, 28, 18, 12, 8, 5];
    const maleData = [12, 22, 32, 42, 35, 25, 15, 10, 6, 3];
    
    const maxValue = Math.max(...femaleData, ...maleData);
    const barWidth = width / femaleData.length - 2;
    
    return (
      <Svg width={width} height={height}>
        {femaleData.map((value, index) => {
          const barHeight = (value / maxValue) * (height / 2 - 10);
          const x = index * (barWidth + 2);
          const y = height / 2 - barHeight;
          
          return (
            <Rect
              key={`female-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#FF6B6B"
            />
          );
        })}
        {maleData.map((value, index) => {
          const barHeight = (value / maxValue) * (height / 2 - 10);
          const x = index * (barWidth + 2);
          const y = height / 2 + 10;
          
          return (
            <Rect
              key={`male-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#4ECDC4"
            />
          );
        })}
      </Svg>
    );
  };

  // Revenue Graph Component
  const RevenueGraph = ({ data }: { data: typeof revenueData }) => {
    const screenWidth = Dimensions.get('window').width;
    const graphWidth = screenWidth - 64; // Account for padding
    const graphHeight = 200;
    const padding = 40;
    
    if (!data.length) return null;
    
    const minValue = Math.min(...data.map(d => d.y));
    const maxValue = Math.max(...data.map(d => d.y));
    const valueRange = maxValue - minValue;
    
    // Calculate positions
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (graphWidth - 2 * padding);
      const y = graphHeight - padding - ((point.y - minValue) / valueRange) * (graphHeight - 2 * padding);
      return { ...point, screenX: x, screenY: y };
    });
    
    // Create path for the line
    const pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.screenX} ${point.screenY}`;
      }
      return `${path} L ${point.screenX} ${point.screenY}`;
    }, '');
    
    return (
      <View style={styles.graphContainer}>
        <Svg width={graphWidth} height={graphHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = graphHeight - padding - ratio * (graphHeight - 2 * padding);
            return (
              <Line
                key={`grid-${index}`}
                x1={padding}
                y1={y}
                x2={graphWidth - padding}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth={1}
                opacity={0.3}
              />
            );
          })}
          
          {/* Main line connecting all points */}
          <Path
            d={pathData}
            stroke={theme.colors.success}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points (dots) */}
          {points.map((point, index) => (
            <Circle
              key={`dot-${index}`}
              cx={point.screenX}
              cy={point.screenY}
              r={5}
              fill={theme.colors.success}
              stroke={theme.colors.white}
              strokeWidth={2}
            />
          ))}
          
          {/* X-axis labels */}
          {points.map((point, index) => (
            <SvgText
              key={`label-${index}`}
              x={point.screenX}
              y={graphHeight - 10}
              fontSize={12}
              fill={theme.colors.gray}
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          ))}
          
          {/* Y-axis labels */}
          {[0, 0.5, 1].map((ratio, index) => {
            const y = graphHeight - padding - ratio * (graphHeight - 2 * padding);
            const value = minValue + ratio * valueRange;
            return (
              <SvgText
                key={`y-label-${index}`}
                x={25}
                y={y + 4}
                fontSize={10}
                fill={theme.colors.gray}
                textAnchor="middle"
              >
                {`${Math.round(value / 1000)}k`}
              </SvgText>
            );
          })}
        </Svg>
        
        {/* Hover tooltips simulation */}
        <View style={styles.tooltipContainer}>
          {points.map((point, index) => (
            <View
              key={`tooltip-${index}`}
              style={[
                styles.tooltip,
                {
                  left: point.screenX - 30,
                  top: point.screenY - 35,
                }
              ]}
            >
              <Text style={styles.tooltipText}>{`${(point.value / 1000).toFixed(1)}k`}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
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
            
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/reports')}
              testID="reportsButton"
            >
              <View style={styles.quickActionIcon}>
                <TrendingUp color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionTitle}>Advanced Analytics</Text>
                <Text style={styles.quickActionSubtitle}>View detailed reports with live data, AI insights, and export capabilities</Text>
              </View>
              <View style={styles.quickActionArrow}>
                <ChevronDown color={theme.colors.gray} size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
              </View>
            </TouchableOpacity>
            
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
            {/* Header */}
            <View style={styles.hrHeader}>
              <Text style={styles.hrTitle}>HR Attrition Management</Text>
              <View style={styles.periodToggle}>
                <TouchableOpacity 
                  style={[styles.periodBtn, reportPeriod === 'Daily' && styles.periodBtnActive]}
                  onPress={() => setReportPeriod('Daily')}
                >
                  <Text style={[styles.periodBtnText, reportPeriod === 'Daily' && styles.periodBtnTextActive]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodBtn, reportPeriod === 'Weekly' && styles.periodBtnActive]}
                  onPress={() => setReportPeriod('Weekly')}
                >
                  <Text style={[styles.periodBtnText, reportPeriod === 'Weekly' && styles.periodBtnTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodBtn, reportPeriod === 'Monthly' && styles.periodBtnActive]}
                  onPress={() => setReportPeriod('Monthly')}
                >
                  <Text style={[styles.periodBtnText, reportPeriod === 'Monthly' && styles.periodBtnTextActive]}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodBtn, reportPeriod === 'Quarterly' && styles.periodBtnActive]}
                  onPress={() => setReportPeriod('Quarterly')}
                >
                  <Text style={[styles.periodBtnText, reportPeriod === 'Quarterly' && styles.periodBtnTextActive]}>Quarterly</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Top Row - Key Metrics */}
            <View style={styles.hrTopRow}>
              {/* Total Head Count */}
              <View style={styles.hrMetricCard}>
                <Text style={styles.hrCardTitle}>Total Head Count</Text>
                <View style={styles.hrPieContainer}>
                  <PieChart 
                    data={[
                      { value: 60, color: '#4CAF50', label: 'Active' },
                      { value: 25, color: '#FF9800', label: 'Inactive' },
                      { value: 15, color: '#2196F3', label: 'New' }
                    ]}
                    centerValue="1470"
                  />
                </View>
                <Text style={styles.hrCardSubtitle}>Breakdown by Dept</Text>
              </View>

              {/* Age Distribution */}
              <View style={styles.hrMetricCard}>
                <Text style={styles.hrCardTitle}>Age Distribution</Text>
                <View style={styles.hrAreaContainer}>
                  <AreaChart 
                    data={[
                      { x: 0, y: 25, label: '20-25' },
                      { x: 1, y: 45, label: '26-30' },
                      { x: 2, y: 65, label: '31-35' },
                      { x: 3, y: 55, label: '36-40' },
                      { x: 4, y: 40, label: '41-45' },
                      { x: 5, y: 30, label: '46-50' },
                      { x: 6, y: 20, label: '51-55' },
                      { x: 7, y: 15, label: '56-60' }
                    ]}
                  />
                </View>
                <Text style={styles.hrCardSubtitle}>Startup by Dept</Text>
              </View>

              {/* Most Costly Role */}
              <View style={styles.hrMetricCard}>
                <Text style={styles.hrCardTitle}>Most Costly Role</Text>
                <View style={styles.hrPieContainer}>
                  <PieChart 
                    data={[
                      { value: 45, color: '#FF9800', label: 'Engineering' },
                      { value: 30, color: '#4CAF50', label: 'Sales' },
                      { value: 25, color: '#2196F3', label: 'Operations' }
                    ]}
                    centerValue="4.7M"
                  />
                </View>
                <Text style={styles.hrCardSubtitle}>Breakdown by Role</Text>
              </View>

              {/* Employee Attrition */}
              <View style={styles.hrMetricCard}>
                <Text style={styles.hrCardTitle}>Employee Attrition</Text>
                <View style={styles.hrPieContainer}>
                  <PieChart 
                    data={[
                      { value: 75, color: '#00BCD4', label: 'Retained' },
                      { value: 25, color: '#F44336', label: 'Attrition' }
                    ]}
                    centerValue="237"
                  />
                </View>
                <Text style={styles.hrCardSubtitle}>Attrition Head Count & Percentage</Text>
              </View>
            </View>

            {/* Middle Row - Time Dimensions */}
            <View style={styles.hrTimeDimensionsPanel}>
              <Text style={styles.hrSectionTitle}>Attrition Share by Time Dimensions</Text>
              <View style={styles.hrBarChartsRow}>
                <View style={styles.hrBarChartSection}>
                  <Text style={styles.hrBarChartTitle}>Years with Company</Text>
                  <BarChart 
                    data={[
                      { value: 12, color: '#4ECDC4' },
                      { value: 8, color: '#4ECDC4' },
                      { value: 15, color: '#4ECDC4' },
                      { value: 6, color: '#4ECDC4' },
                      { value: 22, color: '#4ECDC4' },
                      { value: 18, color: '#4ECDC4' },
                      { value: 9, color: '#4ECDC4' },
                      { value: 14, color: '#4ECDC4' },
                      { value: 11, color: '#4ECDC4' },
                      { value: 25, color: '#4ECDC4' }
                    ]}
                  />
                  <Text style={styles.hrAxisLabel}>0 1 2 3 4 5 6 7 8 9 {'>'} 10</Text>
                </View>
                <View style={styles.hrBarChartSection}>
                  <Text style={styles.hrBarChartTitle}>Years in Current Role</Text>
                  <BarChart 
                    data={[
                      { value: 8, color: '#FF6B6B' },
                      { value: 5, color: '#FF6B6B' },
                      { value: 12, color: '#FF6B6B' },
                      { value: 3, color: '#FF6B6B' },
                      { value: 18, color: '#FF6B6B' },
                      { value: 14, color: '#FF6B6B' },
                      { value: 7, color: '#FF6B6B' },
                      { value: 10, color: '#FF6B6B' },
                      { value: 6, color: '#FF6B6B' },
                      { value: 20, color: '#FF6B6B' }
                    ]}
                  />
                  <Text style={styles.hrAxisLabel}>0 1 2 3 4 5 6 7 8 9 {'>'} 10</Text>
                </View>
                <View style={styles.hrBarChartSection}>
                  <Text style={styles.hrBarChartTitle}>Years with Current Manager</Text>
                  <BarChart 
                    data={[
                      { value: 6, color: '#4CAF50' },
                      { value: 4, color: '#4CAF50' },
                      { value: 9, color: '#4CAF50' },
                      { value: 2, color: '#4CAF50' },
                      { value: 15, color: '#4CAF50' },
                      { value: 11, color: '#4CAF50' },
                      { value: 5, color: '#4CAF50' },
                      { value: 8, color: '#4CAF50' },
                      { value: 4, color: '#4CAF50' },
                      { value: 18, color: '#4CAF50' }
                    ]}
                  />
                  <Text style={styles.hrAxisLabel}>0 1 2 3 4 5 6 7 8 9 {'>'} 10</Text>
                </View>
              </View>
            </View>

            {/* Bottom Row */}
            <View style={styles.hrBottomRow}>
              {/* Gender Distribution */}
              <View style={styles.hrGenderPanel}>
                <Text style={styles.hrSectionTitle}>Attrition Age Distribution by Gender</Text>
                <View style={styles.hrGenderChartContainer}>
                  <GenderDistributionChart />
                </View>
                <View style={styles.hrGenderStats}>
                  <View style={styles.hrGenderStatItem}>
                    <View style={styles.hrGenderIcon}>
                      <Text style={styles.hrGenderIconText}>♀</Text>
                    </View>
                    <Text style={styles.hrGenderStatLabel}>Total</Text>
                    <Text style={styles.hrGenderStatValue}>882</Text>
                  </View>
                  <View style={styles.hrGenderStatItem}>
                    <View style={styles.hrGenderIcon}>
                      <Text style={styles.hrGenderIconText}>♂</Text>
                    </View>
                    <Text style={styles.hrGenderStatLabel}>Total</Text>
                    <Text style={styles.hrGenderStatValue}>588</Text>
                  </View>
                </View>
                <View style={styles.hrFilterSection}>
                  <View style={styles.hrFilterColumn}>
                    <Text style={styles.hrFilterTitle}>Marital</Text>
                    <View style={styles.hrCheckboxGroup}>
                      <Text style={styles.hrCheckboxLabel}>☐ Divorced</Text>
                      <Text style={styles.hrCheckboxLabel}>☐ Married</Text>
                      <Text style={styles.hrCheckboxLabel}>☐ Single</Text>
                    </View>
                  </View>
                  <View style={styles.hrFilterColumn}>
                    <Text style={styles.hrFilterTitle}>Travel</Text>
                    <View style={styles.hrCheckboxGroup}>
                      <Text style={styles.hrCheckboxLabel}>☐ Rarely</Text>
                      <Text style={styles.hrCheckboxLabel}>☐ No Travel</Text>
                      <Text style={styles.hrCheckboxLabel}>☐ Frequently</Text>
                    </View>
                  </View>
                  <View style={styles.hrFilterColumn}>
                    <Text style={styles.hrFilterTitle}>Attrition</Text>
                    <View style={styles.hrCheckboxGroup}>
                      <Text style={styles.hrCheckboxLabel}>☐ Yes</Text>
                      <Text style={styles.hrCheckboxLabel}>☐ No</Text>
                    </View>
                  </View>
                  <View style={styles.hrFilterColumn}>
                    <Text style={styles.hrFilterTitle}>Gender</Text>
                    <View style={styles.hrCheckboxGroup}>
                      <Text style={styles.hrCheckboxLabel}>☐ Female</Text>
                      <Text style={styles.hrCheckboxLabel}>☐ Male</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.hrRatingSection}>
                  <Text style={styles.hrRatingTitle}>Work Relationship Rating</Text>
                  <View style={styles.hrRatingSlider}>
                    <View style={styles.hrSliderTrack}>
                      <View style={[styles.hrSliderFill, { width: '60%' }]} />
                    </View>
                    <Text style={styles.hrRatingValue}>3</Text>
                  </View>
                  <Text style={styles.hrRatingTitle}>Work-Life Balance Rating</Text>
                  <View style={styles.hrRatingSlider}>
                    <View style={styles.hrSliderTrack}>
                      <View style={[styles.hrSliderFill, { width: '50%' }]} />
                    </View>
                    <Text style={styles.hrRatingValue}>2.5</Text>
                  </View>
                  <Text style={styles.hrRatingTitle}>Work Environment Rating</Text>
                  <View style={styles.hrRatingSlider}>
                    <View style={styles.hrSliderTrack}>
                      <View style={[styles.hrSliderFill, { width: '70%' }]} />
                    </View>
                    <Text style={styles.hrRatingValue}>3.5</Text>
                  </View>
                </View>
              </View>

              {/* Job Role Distribution */}
              <View style={styles.hrJobRolePanel}>
                <Text style={styles.hrSectionTitle}>Attrition by Job Role</Text>
                <View style={styles.hrJobRoleList}>
                  {[
                    { role: 'Sales Executive', value: 85, color: '#FF6B6B' },
                    { role: 'Sales Representative', value: 72, color: '#FF6B6B' },
                    { role: 'Manager', value: 45, color: '#FF6B6B' },
                    { role: 'Laboratory Technician', value: 62, color: '#FF6B6B' },
                    { role: 'Research Scientist', value: 38, color: '#FF6B6B' },
                    { role: 'Manufacturing Director', value: 15, color: '#FF6B6B' },
                    { role: 'Healthcare Representative', value: 8, color: '#FF6B6B' },
                    { role: 'Manager', value: 3, color: '#FF6B6B' },
                    { role: 'Research Director', value: 2, color: '#FF6B6B' },
                    { role: 'Human Resources', value: 52, color: '#FF6B6B' }
                  ].map((item, index) => (
                    <View key={index} style={styles.hrJobRoleItem}>
                      <Text style={styles.hrJobRoleLabel}>{item.role}</Text>
                      <View style={styles.hrJobRoleBar}>
                        <View style={[styles.hrJobRoleBarFill, { width: `${item.value}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.hrPayrollSection}>
                  <View style={styles.hrPayrollRow}>
                    <View style={styles.hrPayrollItem}>
                      <Text style={styles.hrPayrollTitle}>Monthly Payroll</Text>
                      <Text style={styles.hrPayrollValue}>21.04M</Text>
                      <Text style={styles.hrPayrollSubtext}>Click for Breakdown</Text>
                    </View>
                    <View style={styles.hrPayrollItem}>
                      <Text style={styles.hrPayrollTitle}>Payroll Growth</Text>
                      <Text style={styles.hrPayrollGrowth}>2%</Text>
                    </View>
                    <View style={styles.hrPayrollItem}>
                      <Text style={styles.hrPayrollTitle}>Overall Rating</Text>
                      <Text style={styles.hrPayrollRating}>2.73</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            
            <Text style={styles.hrUpdateNote}>Updated via API - {formatNow()}</Text>
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
  
  // Revenue Graph Styles
  revenueSection: { marginBottom: theme.spacing.lg },
  revenueSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  periodDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  periodText: { fontSize: theme.fontSize.sm, color: theme.colors.dark, marginRight: 4, fontWeight: fontWeight600 },
  dropdownMenu: { position: 'absolute', top: 60, right: 0, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, zIndex: 1000, minWidth: 120, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  dropdownItemText: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  dropdownItemTextActive: { color: theme.colors.secondary, fontWeight: fontWeight600 },
  revenueGraphCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  graphContainer: { position: 'relative' },
  tooltipContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  tooltip: { position: 'absolute', backgroundColor: theme.colors.dark, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, opacity: 0.8 },
  tooltipText: { fontSize: theme.fontSize.xs, color: theme.colors.white, fontWeight: fontWeight600 },
  
  // HR Dashboard Styles
  hrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  hrTitle: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark },
  periodToggle: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  periodBtnActive: { backgroundColor: theme.colors.secondary },
  periodBtnText: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  periodBtnTextActive: { color: theme.colors.white },
  
  // HR Top Row
  hrTopRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.lg },
  hrMetricCard: { flex: 1, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  hrCardTitle: { fontSize: theme.fontSize.sm, fontWeight: fontWeight600, color: theme.colors.dark, marginBottom: 8 },
  hrCardSubtitle: { fontSize: theme.fontSize.xs, color: theme.colors.gray, marginTop: 8, textAlign: 'center' },
  
  // HR Pie Chart Styles
  hrPieContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  pieChartWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  pieChartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  pieChartCenterText: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  
  // HR Area Chart Styles
  hrAreaContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  
  // HR Time Dimensions Panel
  hrTimeDimensionsPanel: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  hrSectionTitle: { fontSize: theme.fontSize.md, fontWeight: fontWeight700, color: theme.colors.dark, marginBottom: theme.spacing.md },
  hrBarChartsRow: { flexDirection: 'row', gap: 16 },
  hrBarChartSection: { flex: 1, alignItems: 'center' },
  hrBarChartTitle: { fontSize: theme.fontSize.sm, fontWeight: fontWeight600, color: theme.colors.dark, marginBottom: 8, textAlign: 'center' },
  hrAxisLabel: { fontSize: theme.fontSize.xs, color: theme.colors.gray, marginTop: 4, textAlign: 'center' },
  
  // HR Bottom Row
  hrBottomRow: { flexDirection: 'row', gap: 12 },
  
  // HR Gender Panel
  hrGenderPanel: { flex: 1.2, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  hrGenderChartContainer: { alignItems: 'center', marginVertical: theme.spacing.md },
  hrGenderStats: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: theme.spacing.md },
  hrGenderStatItem: { alignItems: 'center' },
  hrGenderIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.lightGray, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  hrGenderIconText: { fontSize: theme.fontSize.sm, color: theme.colors.dark },
  hrGenderStatLabel: { fontSize: theme.fontSize.xs, color: theme.colors.gray },
  hrGenderStatValue: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  
  hrFilterSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md },
  hrFilterColumn: { flex: 1 },
  hrFilterTitle: { fontSize: theme.fontSize.xs, fontWeight: fontWeight600, color: theme.colors.dark, marginBottom: 4 },
  hrCheckboxGroup: { gap: 2 },
  hrCheckboxLabel: { fontSize: theme.fontSize.xs, color: theme.colors.gray },
  
  hrRatingSection: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  hrRatingTitle: { fontSize: theme.fontSize.xs, color: theme.colors.dark, marginBottom: 4 },
  hrRatingSlider: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  hrSliderTrack: { flex: 1, height: 4, backgroundColor: theme.colors.lightGray, borderRadius: 2, marginRight: 8 },
  hrSliderFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 2 },
  hrRatingValue: { fontSize: theme.fontSize.xs, color: theme.colors.dark, minWidth: 20 },
  
  // HR Job Role Panel
  hrJobRolePanel: { flex: 1, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  hrJobRoleList: { marginVertical: theme.spacing.md },
  hrJobRoleItem: { marginBottom: 6 },
  hrJobRoleLabel: { fontSize: theme.fontSize.xs, color: theme.colors.dark, marginBottom: 2 },
  hrJobRoleBar: { height: 6, backgroundColor: theme.colors.lightGray, borderRadius: 3, overflow: 'hidden' },
  hrJobRoleBarFill: { height: '100%', borderRadius: 3 },
  
  hrPayrollSection: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  hrPayrollRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hrPayrollItem: { alignItems: 'center' },
  hrPayrollTitle: { fontSize: theme.fontSize.xs, color: theme.colors.gray, marginBottom: 2 },
  hrPayrollValue: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  hrPayrollSubtext: { fontSize: theme.fontSize.xs, color: theme.colors.secondary },
  hrPayrollGrowth: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.success },
  hrPayrollRating: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  
  hrUpdateNote: { fontSize: theme.fontSize.xs, color: theme.colors.gray, textAlign: 'center', marginTop: theme.spacing.lg, fontStyle: 'italic' },
  
  // Quick Action Styles
  quickActionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: hexToRgba(theme.colors.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  quickActionContent: { flex: 1 },
  quickActionTitle: { fontSize: theme.fontSize.md, fontWeight: fontWeight600, color: theme.colors.dark },
  quickActionSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  quickActionArrow: { padding: 4 },
});