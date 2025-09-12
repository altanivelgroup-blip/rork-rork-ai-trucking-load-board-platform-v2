import React, { useMemo, useState, useEffect } from 'react';
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
  ChevronDown,
  Activity,
  Truck,
  AlertCircle,
  CheckCircle
} from 'lucide-react-native';

type MetricCard = {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

type ChartData = {
  label: string;
  value: number;
  color?: string;
};

type RevenueData = {
  month: string;
  revenue: number;
  loads: number;
};

type UserActivityData = {
  type: 'Drivers' | 'Shippers' | 'Admins';
  percentage: number;
  color: string;
};

export default function ShipperAnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState<boolean>(false);
  const [liveData, setLiveData] = useState<any>({});
  const [, setChartData] = useState<ChartData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [userActivityData, setUserActivityData] = useState<UserActivityData[]>([]);
  
  // Allow both shippers and admins
  React.useEffect(() => {
    if (user && !isShipper && !isAdmin) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isShipper, isAdmin, router]);

  // Simulate live data updates for admin
  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(() => {
        setLiveData({
          activeUsers: Math.floor(Math.random() * 50) + 200,
          activeLoads: Math.floor(Math.random() * 20) + 80,
          systemUptime: 99.8 + Math.random() * 0.2,
          errorRate: Math.random() * 0.5,
          lastUpdate: new Date().toLocaleTimeString()
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Initialize chart data based on selected period
  useEffect(() => {
    if (isAdmin) {
      // Generate data based on selected period
      let revenueDataSet: RevenueData[] = [];
      let chartDataSet: ChartData[] = [];
      
      if (selectedPeriod === 'daily') {
        // Last 7 days data
        revenueDataSet = [
          { month: 'Mon', revenue: 1500, loads: 4 },
          { month: 'Tue', revenue: 2200, loads: 6 },
          { month: 'Wed', revenue: 1800, loads: 5 },
          { month: 'Thu', revenue: 2800, loads: 8 },
          { month: 'Fri', revenue: 3200, loads: 9 },
          { month: 'Sat', revenue: 2100, loads: 6 },
          { month: 'Sun', revenue: 1900, loads: 5 }
        ];
        chartDataSet = [
          { label: 'Total Loads', value: 43, color: '#3B82F6' },
          { label: 'Completed', value: 38, color: '#10B981' },
          { label: 'In Progress', value: 3, color: '#F59E0B' },
          { label: 'Cancelled', value: 2, color: '#EF4444' }
        ];
      } else if (selectedPeriod === 'weekly') {
        // Last 8 weeks data
        revenueDataSet = [
          { month: 'W1', revenue: 12000, loads: 32 },
          { month: 'W2', revenue: 15000, loads: 38 },
          { month: 'W3', revenue: 11000, loads: 29 },
          { month: 'W4', revenue: 18000, loads: 45 },
          { month: 'W5', revenue: 16000, loads: 42 },
          { month: 'W6', revenue: 19000, loads: 48 },
          { month: 'W7', revenue: 14000, loads: 35 },
          { month: 'W8', revenue: 17000, loads: 43 }
        ];
        chartDataSet = [
          { label: 'Total Loads', value: 312, color: '#3B82F6' },
          { label: 'Completed', value: 289, color: '#10B981' },
          { label: 'In Progress', value: 15, color: '#F59E0B' },
          { label: 'Cancelled', value: 8, color: '#EF4444' }
        ];
      } else if (selectedPeriod === 'monthly') {
        // Last 6 months data
        revenueDataSet = [
          { month: 'Jan', revenue: 45000, loads: 120 },
          { month: 'Feb', revenue: 52000, loads: 135 },
          { month: 'Mar', revenue: 48000, loads: 128 },
          { month: 'Apr', revenue: 61000, loads: 155 },
          { month: 'May', revenue: 58000, loads: 148 },
          { month: 'Jun', revenue: 67000, loads: 172 }
        ];
        chartDataSet = [
          { label: 'Total Loads', value: 1250, color: '#3B82F6' },
          { label: 'Completed', value: 1180, color: '#10B981' },
          { label: 'In Progress', value: 45, color: '#F59E0B' },
          { label: 'Cancelled', value: 25, color: '#EF4444' }
        ];
      } else if (selectedPeriod === 'quarterly') {
        // Last 4 quarters data
        revenueDataSet = [
          { month: 'Q1', revenue: 145000, loads: 383 },
          { month: 'Q2', revenue: 186000, loads: 475 },
          { month: 'Q3', revenue: 167000, loads: 428 },
          { month: 'Q4', revenue: 203000, loads: 512 }
        ];
        chartDataSet = [
          { label: 'Total Loads', value: 1798, color: '#3B82F6' },
          { label: 'Completed', value: 1689, color: '#10B981' },
          { label: 'In Progress', value: 67, color: '#F59E0B' },
          { label: 'Cancelled', value: 42, color: '#EF4444' }
        ];
      }
      
      setRevenueData(revenueDataSet);
      setChartData(chartDataSet);

      // User activity distribution (remains consistent across periods)
      setUserActivityData([
        { type: 'Drivers', percentage: 68.43, color: '#3B82F6' },
        { type: 'Shippers', percentage: 23, color: '#10B981' },
        { type: 'Admins', percentage: 8.57, color: '#F59E0B' }
      ]);
    }
  }, [isAdmin, selectedPeriod]);

  const periods = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' }
  ];

  const metrics: MetricCard[] = useMemo(() => {
    const multiplier = selectedPeriod === 'daily' ? 0.03 : selectedPeriod === 'weekly' ? 0.23 : selectedPeriod === 'monthly' ? 1 : 3;
    
    if (isAdmin) {
      // Calculate dynamic metrics based on period and live data
      const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
      const totalLoads = revenueData.reduce((sum, item) => sum + item.loads, 0);
      const avgRate = totalLoads > 0 ? Math.floor(totalRevenue / totalLoads) : 0;
      
      // Period-specific comparison text
      const comparisonText = selectedPeriod === 'daily' ? 'vs yesterday' : 
                           selectedPeriod === 'weekly' ? 'vs last week' :
                           selectedPeriod === 'monthly' ? 'vs last month' :
                           'vs last quarter';
      
      return [
        {
          id: 'revenue',
          title: 'Total Revenue',
          value: `${totalRevenue.toLocaleString()}`,
          change: `+${selectedPeriod === 'daily' ? '8.2' : selectedPeriod === 'weekly' ? '12.5' : selectedPeriod === 'monthly' ? '18' : '22.3'}% ${comparisonText}`,
          isPositive: true,
          icon: DollarSign
        },
        {
          id: 'avgRate',
          title: 'Avg Rate per Load',
          value: `${avgRate.toLocaleString()}`,
          change: `+${selectedPeriod === 'daily' ? '2.1' : selectedPeriod === 'weekly' ? '3.8' : selectedPeriod === 'monthly' ? '5' : '7.2'}% ${comparisonText}`,
          isPositive: true,
          icon: TrendingUp
        },
        {
          id: 'loads',
          title: 'Total Loads',
          value: `${totalLoads.toLocaleString()}`,
          change: `+${selectedPeriod === 'daily' ? '5' : selectedPeriod === 'weekly' ? '8' : selectedPeriod === 'monthly' ? '15' : '28'}% ${comparisonText}`,
          isPositive: true,
          icon: Package
        },
        {
          id: 'completion',
          title: 'Load Completion Rate',
          value: '94.2%',
          change: `+${selectedPeriod === 'daily' ? '0.8' : selectedPeriod === 'weekly' ? '1.2' : selectedPeriod === 'monthly' ? '2.1' : '3.5'}%`,
          isPositive: true,
          icon: BarChart3
        },
        {
          id: 'deliveryTime',
          title: 'Average Delivery Time',
          value: selectedPeriod === 'daily' ? '8.5 hrs' : selectedPeriod === 'weekly' ? '1.8 days' : '2.3 days',
          change: selectedPeriod === 'daily' ? '-1.2 hrs' : selectedPeriod === 'weekly' ? '-0.3 days' : '-0.2 days',
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
          value: `${Math.floor((liveData.activeUsers || 247) * (selectedPeriod === 'daily' ? 0.8 : selectedPeriod === 'weekly' ? 0.9 : 1))}`,
          change: `+${selectedPeriod === 'daily' ? '5.2' : selectedPeriod === 'weekly' ? '8.7' : selectedPeriod === 'monthly' ? '12.3' : '18.9'}%`,
          isPositive: true,
          icon: Users
        },
        {
          id: 'errors',
          title: 'System Errors',
          value: `${selectedPeriod === 'daily' ? '2' : selectedPeriod === 'weekly' ? '8' : selectedPeriod === 'monthly' ? '23' : '67'}`,
          change: `${selectedPeriod === 'daily' ? '-1' : selectedPeriod === 'weekly' ? '-3' : selectedPeriod === 'monthly' ? '-8' : '-15'} ${comparisonText}`,
          isPositive: true,
          icon: AlertCircle
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
  }, [user, selectedPeriod, isAdmin, revenueData, liveData.activeUsers]);

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

        {/* Revenue Trends Chart Section - Admin Only */}
        {isAdmin && (
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Revenue Trends</Text>
              <View style={styles.chartPeriodSelector}>
                <TouchableOpacity 
                  style={[styles.periodTab, selectedPeriod === 'daily' && styles.periodTabActive]}
                  onPress={() => setSelectedPeriod('daily')}
                >
                  <Text style={[styles.periodTabText, selectedPeriod === 'daily' && styles.periodTabTextActive]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodTab, selectedPeriod === 'weekly' && styles.periodTabActive]}
                  onPress={() => setSelectedPeriod('weekly')}
                >
                  <Text style={[styles.periodTabText, selectedPeriod === 'weekly' && styles.periodTabTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodTab, selectedPeriod === 'monthly' && styles.periodTabActive]}
                  onPress={() => setSelectedPeriod('monthly')}
                >
                  <Text style={[styles.periodTabText, selectedPeriod === 'monthly' && styles.periodTabTextActive]}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodTab, selectedPeriod === 'quarterly' && styles.periodTabActive]}
                  onPress={() => setSelectedPeriod('quarterly')}
                >
                  <Text style={[styles.periodTabText, selectedPeriod === 'quarterly' && styles.periodTabTextActive]}>Quarterly</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Bar Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.chartYAxis}>
                {selectedPeriod === 'daily' ? (
                  <>
                    <Text style={styles.yAxisLabel}>4k</Text>
                    <Text style={styles.yAxisLabel}>3k</Text>
                    <Text style={styles.yAxisLabel}>2k</Text>
                    <Text style={styles.yAxisLabel}>1k</Text>
                    <Text style={styles.yAxisLabel}>0</Text>
                  </>
                ) : selectedPeriod === 'weekly' ? (
                  <>
                    <Text style={styles.yAxisLabel}>20k</Text>
                    <Text style={styles.yAxisLabel}>15k</Text>
                    <Text style={styles.yAxisLabel}>10k</Text>
                    <Text style={styles.yAxisLabel}>5k</Text>
                    <Text style={styles.yAxisLabel}>0</Text>
                  </>
                ) : selectedPeriod === 'quarterly' ? (
                  <>
                    <Text style={styles.yAxisLabel}>250k</Text>
                    <Text style={styles.yAxisLabel}>200k</Text>
                    <Text style={styles.yAxisLabel}>150k</Text>
                    <Text style={styles.yAxisLabel}>100k</Text>
                    <Text style={styles.yAxisLabel}>0</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.yAxisLabel}>80k</Text>
                    <Text style={styles.yAxisLabel}>60k</Text>
                    <Text style={styles.yAxisLabel}>40k</Text>
                    <Text style={styles.yAxisLabel}>20k</Text>
                    <Text style={styles.yAxisLabel}>0</Text>
                  </>
                )}
              </View>
              <View style={styles.chartArea}>
                <View style={styles.barsContainer}>
                  {revenueData.map((item, index) => {
                    // Dynamic height calculation based on period
                    const maxRevenue = selectedPeriod === 'daily' ? 4000 : 
                                     selectedPeriod === 'weekly' ? 20000 :
                                     selectedPeriod === 'quarterly' ? 250000 : 70000;
                    const height = (item.revenue / maxRevenue) * 120;
                    return (
                      <View key={item.month} style={styles.barGroup}>
                        <View style={[styles.bar, { height, backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.barLabel}>{item.month}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.chartGrid}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <View key={i} style={styles.gridLine} />
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Revenue vs User Activity Section - Admin Only */}
        {isAdmin && (
          <View style={styles.dualChartSection}>
            <View style={styles.dualChartContainer}>
              {/* Revenue Line Chart */}
              <View style={styles.halfChart}>
                <Text style={styles.chartTitle}>Revenues</Text>
                <View style={styles.lineChartContainer}>
                  <View style={styles.lineChart}>
                    {/* Y-axis labels */}
                    <View style={styles.yAxisLabels}>
                      {selectedPeriod === 'daily' ? (
                        <>
                          <Text style={styles.yAxisText}>4k</Text>
                          <Text style={styles.yAxisText}>3k</Text>
                          <Text style={styles.yAxisText}>2k</Text>
                          <Text style={styles.yAxisText}>1k</Text>
                          <Text style={styles.yAxisText}>0</Text>
                        </>
                      ) : selectedPeriod === 'weekly' ? (
                        <>
                          <Text style={styles.yAxisText}>20k</Text>
                          <Text style={styles.yAxisText}>15k</Text>
                          <Text style={styles.yAxisText}>10k</Text>
                          <Text style={styles.yAxisText}>5k</Text>
                          <Text style={styles.yAxisText}>0</Text>
                        </>
                      ) : selectedPeriod === 'quarterly' ? (
                        <>
                          <Text style={styles.yAxisText}>250k</Text>
                          <Text style={styles.yAxisText}>200k</Text>
                          <Text style={styles.yAxisText}>150k</Text>
                          <Text style={styles.yAxisText}>100k</Text>
                          <Text style={styles.yAxisText}>0</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.yAxisText}>80k</Text>
                          <Text style={styles.yAxisText}>60k</Text>
                          <Text style={styles.yAxisText}>40k</Text>
                          <Text style={styles.yAxisText}>20k</Text>
                          <Text style={styles.yAxisText}>0</Text>
                        </>
                      )}
                    </View>
                    
                    {/* Chart area with connected line */}
                    <View style={styles.chartPlotArea}>
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => (
                        <View key={`grid-${i}`} style={[styles.gridLine, { top: `${i * 20}%` }]} />
                      ))}
                      
                      {/* Connected line path */}
                      <View style={styles.lineContainer}>
                        {/* Render line segments connecting all points */}
                        {revenueData.slice(0, selectedPeriod === 'quarterly' ? 4 : selectedPeriod === 'daily' ? 7 : 6).map((item, index, array) => {
                          if (index === array.length - 1) return null;
                          
                          const nextItem = array[index + 1];
                          const maxRevenue = selectedPeriod === 'daily' ? 4000 : 
                                           selectedPeriod === 'weekly' ? 20000 :
                                           selectedPeriod === 'quarterly' ? 250000 : 80000;
                          
                          // Calculate positions with proper spacing
                          const containerWidth = 100; // percentage
                          const containerHeight = 80; // percentage of usable area
                          
                          const x1 = (index / Math.max(array.length - 1, 1)) * containerWidth;
                          const y1 = containerHeight - (item.revenue / maxRevenue) * containerHeight;
                          const x2 = ((index + 1) / Math.max(array.length - 1, 1)) * containerWidth;
                          const y2 = containerHeight - (nextItem.revenue / maxRevenue) * containerHeight;
                          
                          // Calculate line properties
                          const deltaX = x2 - x1;
                          const deltaY = y2 - y1;
                          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                          
                          return (
                            <View
                              key={`line-${index}`}
                              style={[
                                styles.lineSegment,
                                {
                                  left: `${x1}%`,
                                  top: `${y1}%`,
                                  width: `${length}%`,
                                  transform: [{ rotate: `${angle}deg` }]
                                }
                              ]}
                            />
                          );
                        })}
                        
                        {/* Data points with hover effect */}
                        {revenueData.slice(0, selectedPeriod === 'quarterly' ? 4 : selectedPeriod === 'daily' ? 7 : 6).map((item, index, array) => {
                          const containerWidth = 100;
                          const containerHeight = 80;
                          const x = (index / Math.max(array.length - 1, 1)) * containerWidth;
                          const maxRevenue = selectedPeriod === 'daily' ? 4000 : 
                                           selectedPeriod === 'weekly' ? 20000 :
                                           selectedPeriod === 'quarterly' ? 250000 : 80000;
                          const y = containerHeight - (item.revenue / maxRevenue) * containerHeight;
                          
                          return (
                            <TouchableOpacity 
                              key={item.month}
                              style={[
                                styles.dataPoint,
                                { left: `${x}%`, top: `${y}%` }
                              ]}
                              onPress={() => {
                                // Show tooltip with value
                                console.log(`${item.month}: ${item.revenue.toLocaleString()}`);
                              }}
                            >
                              <View style={styles.dataPointInner} />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                  <View style={styles.lineChartLabels}>
                    {revenueData.slice(0, 6).map(item => (
                      <Text key={item.month} style={styles.lineChartLabel}>{item.month}</Text>
                    ))}
                  </View>
                </View>
              </View>

              {/* User Activity Pie Chart */}
              <View style={styles.halfChart}>
                <Text style={styles.chartTitle}>User Activity</Text>
                <View style={styles.pieChartContainer}>
                  <View style={styles.pieChart}>
                    {userActivityData.map((item, index) => {
                      return (
                        <View 
                          key={item.type}
                          style={[
                            styles.pieSlice,
                            { 
                              backgroundColor: item.color,
                              transform: [{ rotate: `${index * 120}deg` }]
                            }
                          ]} 
                        />
                      );
                    })}
                  </View>
                  <View style={styles.pieLegend}>
                    {userActivityData.map(item => (
                      <View key={item.type} style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.type}</Text>
                        <Text style={styles.legendPercentage}>{item.percentage}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Key Metrics Table - Admin Only */}
        {isAdmin && (
          <View style={styles.metricsTableSection}>
            <View style={styles.metricsTableHeader}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.tableFilters}>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterText}>Loads</Text>
                  <ChevronDown size={14} color={theme.colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterText}>Revenue</Text>
                  <ChevronDown size={14} color={theme.colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterText}>Users</Text>
                  <ChevronDown size={14} color={theme.colors.gray} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.metricsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Key Metrics</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Average</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Revenue</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Revenue</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Completion</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Collection</Text>
              </View>
              
              {[
                { metric: 'Total Loads', avg: '139,103', rev1: '96,500', rev2: '1.5%', completion: '1.9%', collection: '12500' },
                { metric: 'Total Loads', avg: '359,85', rev1: '35,800', rev2: '1.35', completion: '1.2%', collection: '12500' },
                { metric: 'Total Loads', avg: '368,29', rev1: '59,900', rev2: '1.34', completion: '1.6%', collection: '21530' },
                { metric: 'Total Loads', avg: '34,17', rev1: '48,800', rev2: '20%', completion: '1.9%', collection: '16330' },
                { metric: 'Total Loads', avg: '159,56', rev1: '45,000', rev2: '1.34', completion: '1.8%', collection: '26560' },
                { metric: 'Total Loads', avg: '122,45', rev1: '92,800', rev2: '1.3%', completion: '1.3%', collection: '21530' }
              ].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <View style={styles.tableCellContent}>
                      <View style={styles.metricDot} />
                      <Text style={styles.tableCellText}>{row.metric}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{row.avg}</Text>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{row.rev1}</Text>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{row.rev2}</Text>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{row.completion}</Text>
                  <Text style={[styles.tableCellText, { flex: 1, color: theme.colors.primary }]}>{row.collection}</Text>
                </View>
              ))}
              
              <View style={styles.tablePagination}>
                <TouchableOpacity style={styles.paginationButton}>
                  <Text style={styles.paginationText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.paginationButton, styles.paginationActive]}>
                  <Text style={[styles.paginationText, styles.paginationActiveText]}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.paginationButton}>
                  <Text style={styles.paginationText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.paginationButton}>
                  <Text style={styles.paginationText}>3</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.paginationButton}>
                  <Text style={styles.paginationText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Performance Metrics Section - Shipper Only */}
        {!isAdmin && (
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
        )}

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

        {/* Live System Status - Admin Only */}
        {isAdmin && (
          <View style={styles.liveStatusSection}>
            <Text style={styles.sectionTitle}>Live System Status</Text>
            <View style={styles.liveStatusGrid}>
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Activity size={20} color={theme.colors.success} />
                  <Text style={styles.statusValue}>{liveData.activeUsers || 247}</Text>
                </View>
                <Text style={styles.statusLabel}>Active Users</Text>
                <Text style={styles.statusChange}>+12 from last hour</Text>
              </View>
              
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Truck size={20} color={theme.colors.primary} />
                  <Text style={styles.statusValue}>{liveData.activeLoads || 89}</Text>
                </View>
                <Text style={styles.statusLabel}>Active Loads</Text>
                <Text style={styles.statusChange}>+5 new loads</Text>
              </View>
              
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <CheckCircle size={20} color={theme.colors.success} />
                  <Text style={styles.statusValue}>{(liveData.systemUptime || 99.8).toFixed(1)}%</Text>
                </View>
                <Text style={styles.statusLabel}>System Uptime</Text>
                <Text style={styles.statusChange}>Last 24 hours</Text>
              </View>
              
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <AlertCircle size={20} color={theme.colors.warning} />
                  <Text style={styles.statusValue}>{(liveData.errorRate || 0.2).toFixed(1)}%</Text>
                </View>
                <Text style={styles.statusLabel}>Error Rate</Text>
                <Text style={styles.statusChange}>-0.1% from yesterday</Text>
              </View>
            </View>
          </View>
        )}

        {/* Performance Summary - Shipper Only */}
        {!isAdmin && (
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
        )}

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
  chartSection: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  chartPeriodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: 2,
  },
  periodTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  periodTabActive: {
    backgroundColor: theme.colors.primary,
  },
  periodTabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  periodTabTextActive: {
    color: theme.colors.white,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
  },
  chartYAxis: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  chartGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  dualChartSection: {
    marginBottom: theme.spacing.lg,
  },
  dualChartContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfChart: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  lineChartContainer: {
    height: 120,
  },
  lineChart: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginLeft: -6,
    marginTop: -6,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dataPointInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    alignSelf: 'center',
    marginTop: 2,
  },
  trendLine: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.6,
  },
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineChartLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChart: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.lightGray,
    marginBottom: theme.spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  pieSlice: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: 0,
    left: '50%',
    transformOrigin: '0 100%',
  },
  pieLegend: {
    gap: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    flex: 1,
  },
  legendPercentage: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  metricsTableSection: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricsTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  tableFilters: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  filterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  metricsTable: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightGray,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  tableHeaderText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.gray,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  tableCellText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    textAlign: 'center',
  },
  tablePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  paginationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.lightGray,
  },
  paginationActive: {
    backgroundColor: theme.colors.primary,
  },
  paginationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  paginationActiveText: {
    color: theme.colors.white,
  },
  liveStatusSection: {
    marginBottom: theme.spacing.lg,
  },
  liveStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  statusValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  statusLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  statusChange: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '500',
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
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingVertical: 10,
  },
  yAxisText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  chartPlotArea: {
    flex: 1,
    marginLeft: 35,
    position: 'relative',
  },
  lineContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
  },
  lineSegment: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#3B82F6',
    transformOrigin: '0 50%',
    borderRadius: 3,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});