import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Crown, PlusCircle, BarChart3, Upload, Package, DollarSign, Settings, Eye, FileText, Zap, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';

const Tile = memo(function Tile({ title, subtitle, onPress, Icon, testID }: { title: string; subtitle: string; onPress: () => void; Icon: React.ComponentType<{ size?: number; color?: string }>; testID: string; }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.tile} testID={testID}>
      <View style={styles.tileIconWrap}>
        <Icon size={20} color={theme.colors.secondary} />
      </View>
      <View style={styles.tileTextWrap}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function ShipperHome() {
  const router = useRouter();
  const { user, userId } = useAuth();
  const { loads, isLoading } = useLoads();
  
  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'OPEN':
        return '#10b981';
      case 'in-transit':
        return '#f59e0b';
      case 'delivered':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };
  
  // Manual refresh function
  const handleRefresh = useCallback(() => {
    console.log('Refreshing loads...');
    // In a real app, you would call a refresh function here
    // For now, we'll just log it
  }, []);
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  
  // Filter loads posted by this shipper
  const myLoads = useMemo(() => {
    const uid = userId || user?.id || null;
    if (!uid) return [];
    
    return loads.filter(load => {
      const isOwner = load.shipperId === uid || 
                     (load as any).createdBy === uid ||
                     (load as any).userId === uid;
      return isOwner;
    });
  }, [loads, user?.id, userId]);
  
  // Calculate quick stats
  const stats = useMemo(() => {
    const totalLoads = myLoads.length;
    const activeLoads = myLoads.filter(l => l.status === 'available' || l.status === 'in-transit').length;
    const completedLoads = myLoads.filter(l => l.status === 'delivered').length;
    const totalRevenue = myLoads.reduce((sum, l) => sum + (l.rate || 0), 0);
    
    return { totalLoads, activeLoads, completedLoads, totalRevenue };
  }, [myLoads]);
  
  // Always call hooks in the same order
  const goMembership = useCallback(() => {
    console.log('shipper.goMembership');
    router.push('/shipper-membership');
  }, [router]);

  const goPostLoad = useCallback(() => {
    console.log('shipper.goPostLoad');
    try {
      router.push('/post-load');
    } catch (error) {
      console.error('Post load navigation error:', error);
    }
  }, [router]);

  const goShipperDashboard = useCallback(() => {
    console.log('shipper.goShipperDashboard');
    router.push('/shipper-dashboard');
  }, [router]);
  
  const goMyLoads = useCallback(() => {
    console.log('shipper.goMyLoads');
    router.push('/loads');
  }, [router]);
  
  const goLoadTemplates = useCallback(() => {
    console.log('shipper.goLoadTemplates');
    router.push('/load-templates');
  }, [router]);

  const goCsvBulkUpload = useCallback(() => {
    console.log('shipper.goCsvBulkUpload');
    router.push('/csv-bulk-upload');
  }, [router]);

  const goAiTools = useCallback(() => {
    console.log('shipper.goAiTools');
    router.push('/ai-tools');
  }, [router]);

  const goIncreaseRevenue = useCallback(() => {
    console.log('shipper.goIncreaseRevenue');
    router.push('/increase-revenue');
  }, [router]);

  const goAdvancedSecurity = useCallback(() => {
    console.log('shipper.goAdvancedSecurity');
    router.push('/advance-security');
  }, [router]);

  // Removed unused goPhotoUploadTest function
  
  // Redirect non-shippers
  React.useEffect(() => {
    if (user && !isShipper) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isShipper, router]);
  
  if (!isShipper) {
    return null;
  }

  return (
    <View style={styles.container} testID="shipper-home-container">
      <Stack.Screen options={{ title: 'Shipper' }} />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Welcome, Shipper</Text>
        <Text style={styles.subheading}>Quick actions and tools</Text>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Package size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.totalLoads}</Text>
            <Text style={styles.statLabel}>Posted</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={20} color={theme.colors.success} />
            <Text style={styles.statValue}>${stats.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <BarChart3 size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{stats.activeLoads}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Post & Manage Loads</Text>
        </View>
        <Tile title="Post a Load" subtitle="Create a new shipment" onPress={goPostLoad} Icon={PlusCircle} testID="tile-post-load" />
        <Tile title="CSV Bulk Upload" subtitle="Upload loads from CSV file" onPress={goCsvBulkUpload} Icon={Upload} testID="tile-csv-bulk-upload" />
        <Tile title="Load Templates" subtitle="Save and reuse configurations" onPress={goLoadTemplates} Icon={FileText} testID="tile-load-templates" />
        
        {/* My Loads Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Loads</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <RefreshCw size={16} color={theme.colors.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {myLoads.length === 0 ? (
          <View style={styles.emptyLoadsCard}>
            <Package size={32} color={theme.colors.gray} />
            <Text style={styles.emptyLoadsTitle}>No loads posted yet</Text>
            <Text style={styles.emptyLoadsSubtitle}>Tap &quot;Post a Load&quot; above to get started</Text>
          </View>
        ) : (
          <View style={styles.loadsPreview}>
            {myLoads.slice(0, 3).map((load) => (
              <View key={load.id} style={styles.loadPreviewCard}>
                <View style={styles.loadPreviewHeader}>
                  <Text style={styles.loadPreviewTitle} numberOfLines={1}>
                    {load.description || 'Untitled Load'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(load.status) }]}>
                    <Text style={styles.statusText}>{load.status}</Text>
                  </View>
                </View>
                <Text style={styles.loadPreviewRoute}>
                  {load.origin?.city || 'Unknown'} → {load.destination?.city || 'Unknown'}
                </Text>
                <Text style={styles.loadPreviewRate}>${(load.rate || 0).toLocaleString()}</Text>
              </View>
            ))}
            {myLoads.length > 3 && (
              <TouchableOpacity onPress={goMyLoads} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All {myLoads.length} Loads</Text>
                <Eye size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Tools & Features */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tools & Features</Text>
        </View>
        <Tile title="AI Tools" subtitle="Draft posts, quotes and more" onPress={goAiTools} Icon={Zap} testID="tile-ai-tools" />
        <Tile title="Analytics Dashboard" subtitle="View detailed performance metrics" onPress={goShipperDashboard} Icon={BarChart3} testID="tile-shipper-dashboard" />
        <Tile title="Increase Revenue" subtitle="Tips and premium placement" onPress={goIncreaseRevenue} Icon={DollarSign} testID="tile-increase-revenue" />
        <Tile title="Advanced Security" subtitle="Protect posts and payments" onPress={goAdvancedSecurity} Icon={Settings} testID="tile-advanced-security" />
        <Tile title="Membership" subtitle="Upgrade for more features" onPress={goMembership} Icon={Crown} testID="tile-membership" />
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
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  subheading: {
    marginTop: 4,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.md,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  tileTextWrap: {
    flex: 1,
  },
  tileTitle: {
    fontWeight: '700',
    color: theme.colors.dark,
    fontSize: theme.fontSize.md,
  },
  tileSubtitle: {
    marginTop: 2,
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
    gap: theme.spacing.xs,
  },
  refreshText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyLoadsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyLoadsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.sm,
  },
  emptyLoadsSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  loadsPreview: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  loadPreviewCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  loadPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  loadPreviewTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
    marginRight: theme.spacing.sm,
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
  loadPreviewRoute: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  loadPreviewRate: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
