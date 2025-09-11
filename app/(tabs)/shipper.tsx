import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Crown, PlusCircle, BarChart3, Upload, Package, DollarSign, Settings } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  
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

  const goPhotoUploadTest = useCallback(() => {
    console.log('shipper.goPhotoUploadTest');
    router.push('/photo-uploader-demo');
  }, [router]);
  
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
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Welcome, Shipper</Text>
        <Text style={styles.subheading}>Quick actions and tools</Text>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Package size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{(user as any)?.totalLoadsPosted ?? 0}</Text>
            <Text style={styles.statLabel}>Posted</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={20} color={theme.colors.success} />
            <Text style={styles.statValue}>${((user as any)?.totalRevenue ?? 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <BarChart3 size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{(user as any)?.activeLoads ?? 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <Tile title="Shipper Dashboard" subtitle="View your loads and analytics" onPress={goShipperDashboard} Icon={BarChart3} testID="tile-shipper-dashboard" />
        <Tile title="Post a Load" subtitle="Create a new shipment" onPress={goPostLoad} Icon={PlusCircle} testID="tile-post-load" />
        <Tile title="CSV Bulk Upload" subtitle="Upload loads from CSV file" onPress={goCsvBulkUpload} Icon={Upload} testID="tile-csv-bulk-upload" />
        <Tile title="Add Photo Test" subtitle="Quick test for photo upload" onPress={goPhotoUploadTest} Icon={Package} testID="tile-add-photo-test" />
        <Tile title="AI Tools" subtitle="Draft posts, quotes and more" onPress={goAiTools} Icon={Crown} testID="tile-ai-tools" />
        <Tile title="Increase Revenue" subtitle="Tips and premium placement" onPress={goIncreaseRevenue} Icon={BarChart3} testID="tile-increase-revenue" />
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
});
