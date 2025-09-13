import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
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
});