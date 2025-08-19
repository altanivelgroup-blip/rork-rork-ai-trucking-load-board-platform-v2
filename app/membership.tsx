import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import HeaderBack from '@/components/HeaderBack';
import { Crown, CheckCircle2, Shield, Truck, Wallet, Bell, Image as ImageIcon, Wrench, Search } from 'lucide-react-native';

export default function MembershipScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const isActive = useMemo(() => !!user?.membershipTier, [user?.membershipTier]);

  const highlights = useMemo(
    () => [
      { key: 'backhaul', title: 'Backhaul Finder', desc: 'Auto-activates near delivery to surface return loads within 50 miles.', icon: Truck },
      { key: 'docs', title: 'Documents & Verification', desc: 'Company, insurance, vehicle & trailer docs in one place.', icon: Shield },
      { key: 'wallet', title: 'Wallet & Payouts', desc: 'Track balance, transfers, and payout history.', icon: Wallet },
      { key: 'photos', title: 'Pickup & Delivery Photos', desc: 'Capture condition with guided photo flow.', icon: ImageIcon },
      { key: 'service', title: 'Service Finder', desc: 'Find nearby repair, tires, towing, and more.', icon: Search },
      { key: 'maint', title: 'Maintenance Tracking', desc: 'Keep vehicles and trailers on schedule.', icon: Wrench },
      { key: 'alerts', title: 'Smart Notifications', desc: 'Proactive alerts for loads, docs, and schedule.', icon: Bell },
    ],
    [],
  );

  const onActivate = useCallback(async () => {
    try {
      console.log('membership.driver.cta -> /payment-methods?plan=basic');
      router.push('/payment-methods?plan=basic');
    } catch (e) {
      Alert.alert('Error', 'Could not open payment page. Please try again.');
    }
  }, [router]);

  return (
    <View style={styles.container} testID="membership-container">
      <Stack.Screen
        options={{
          title: 'Driver Membership',
          headerLeft: ({ tintColor }) => (
            <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} targetPath="/settings" />
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.planCard} testID="membership-plan-card">
          <View style={styles.planHeader}>
            <View style={styles.planIconWrap}>
              <Crown size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.planText}>
              <Text style={styles.planTitle}>Driver Membership</Text>
              <Text style={styles.planSubtitle}>Single tier • Simple benefits</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>$0</Text>
            <Text style={styles.priceSub}>/month</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onActivate}
            style={[styles.cta, isActive && styles.ctaActive]}
            disabled={isUpdating || isActive}
            testID="membership-cta"
            accessibilityState={{ disabled: isUpdating || isActive }}
          >
            <Text style={[styles.ctaText, isActive && styles.ctaTextActive]}>
              {isActive ? 'Active' : isUpdating ? 'Activating…' : 'Activate Free Plan'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle} testID="membership-highlights-title">App Highlights</Text>
        <View style={styles.list}>
          {highlights.map((h) => (
            <View key={h.key} style={styles.item} testID={`highlight-${h.key}`}>
              <View style={styles.itemIconWrap}>
                {<h.icon size={20} color={theme.colors.primary} />}
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>{h.title}</Text>
                <Text style={styles.itemDesc}>{h.desc}</Text>
              </View>
              <CheckCircle2 size={20} color={theme.colors.success} />
            </View>
          ))}
        </View>

        <Text style={styles.footnote} testID="membership-footnote">
          Need different tiers, billing, or custom limits? Enable Backend in the header and share pricing to wire up real subscriptions.
        </Text>
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
  planCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  planText: {
    flex: 1,
  },
  planTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark,
    fontWeight: '700',
  },
  planSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: theme.spacing.md,
  },
  priceMain: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  priceSub: {
    marginLeft: 6,
    marginBottom: 6,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  cta: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  ctaActive: {
    backgroundColor: '#E5E7EB',
  },
  ctaText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  ctaTextActive: {
    color: theme.colors.gray,
  },
  sectionTitle: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark,
    fontWeight: '700',
  },
  list: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '700',
  },
  itemDesc: {
    marginTop: 2,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  footnote: {
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
  },
});