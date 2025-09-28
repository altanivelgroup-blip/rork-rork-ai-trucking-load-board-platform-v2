import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import LiveAnalyticsDashboard from '@/components/LiveAnalyticsDashboard';
import { useLoads } from '@/hooks/useLoads';
import { Crown, Zap, DollarSign, Settings } from 'lucide-react-native';
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
  const { loads } = useLoads();
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  
  const goMembership = useCallback(() => {
    console.log('shipper.goMembership');
    router.push('/shipper-membership');
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


  
  // Don't redirect - let the tab layout handle role-based access
  if (!user) {
    return null;
  }
  
  if (!isShipper) {
    console.log('[ShipperHome] Non-shipper user accessing shipper tab:', user.role);
    // Show access denied instead of redirecting
    return (
      <View style={styles.container} testID="shipper-access-denied">
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>This section is for shippers only.</Text>
        </View>
      </View>
    );
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
        
        {/* ANALYTICS PREVIEW FOR SHIPPERS */}
        {loads.length > 0 && (
          <View style={styles.analyticsPreview}>
            <Text style={styles.analyticsPreviewTitle}>📊 Driver Analytics Preview</Text>
            <Text style={styles.analyticsPreviewSubtitle}>
              This is what drivers see when they view your loads:
            </Text>
            <LiveAnalyticsDashboard 
              load={loads[0]} 
              compact={false} 
              showTitle={false} 
              enabled={true}
            />
            <Text style={styles.analyticsPreviewNote}>
              Live analytics help drivers make informed decisions about your loads
            </Text>
          </View>
        )}

        {/* Main Actions - Consolidated to Post Loads tab */}

        {/* Tools & Features */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tools & Features</Text>
        </View>

        <Tile title="AI Tools" subtitle="Draft posts, quotes and more" onPress={goAiTools} Icon={Zap} testID="tile-ai-tools" />
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

  sectionHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  analyticsPreview: {
    backgroundColor: '#F0F9FF',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  analyticsPreviewTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: '#0C4A6E',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  analyticsPreviewSubtitle: {
    fontSize: theme.fontSize.sm,
    color: '#0369A1',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  analyticsPreviewNote: {
    fontSize: theme.fontSize.xs,
    color: '#0369A1',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  accessDeniedTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  accessDeniedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
});