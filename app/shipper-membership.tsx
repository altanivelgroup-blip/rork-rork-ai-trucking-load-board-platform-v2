import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Crown, Check, Zap, TrendingUp, Shield, UserRound, Smartphone } from 'lucide-react-native';

type Tier = {
  id: 'basic' | 'pro' | 'business';
  title: string;
  subtitle: string;
  price: string;
  period: string;
  popular?: boolean;
  accent: string;
  iconBg: string;
  features: string[];
};

const tiers: Tier[] = [
  {
    id: 'basic',
    title: 'Basic',
    subtitle: 'Perfect for getting started',
    price: '$5',
    period: '/month',
    accent: '#E5E7EB',
    iconBg: '#EEF2FF',
    features: [
      '1 vehicle post per month (Private)',
      '3 vehicle posts per month (Business)',
      'Limited to local listings (250 miles)',
      'Basic AI prompt access',
      'Email notifications only',
      '7-day post expiration',
    ],
  },
  {
    id: 'pro',
    title: 'Pro',
    subtitle: 'For business owners, dealerships & auctions',
    price: '$49',
    period: '/month',
    popular: true,
    accent: theme.colors.warning,
    iconBg: '#FFFBEB',
    features: [
      'Up to 50 vehicle posts per month',
      'National exposure with map tracking',
      'AI-enhanced listing assistant',
      'Dealer dashboard with analytics',
      'API access (read-only)',
      'Premium post badge & branding',
      'CRM export capabilities',
      'SMS/email/app notifications',
      'AI cost forecasting',
      'Priority customer support',
    ],
  },
  {
    id: 'business',
    title: 'Business',
    subtitle: 'For fleets, brokers, and enterprises',
    price: '$99.99',
    period: '/month',
    accent: '#E5E7EB',
    iconBg: '#F8FAFC',
    features: [
      'Unlimited vehicle posts',
      'Priority placement on searches',
      'Full API access (read/write)',
      'White-label options',
      'Up to 10 team users',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 priority support',
      'Fleet move planning',
      'Advanced analytics',
    ],
  },
];

function useSelection() {
  const [selected, setSelected] = useState<Tier['id']>('pro');
  const onSelect = useCallback((id: Tier['id']) => {
    setSelected(id);
    console.log('membership.select', id);
  }, []);
  return { selected, onSelect } as const;
}

const FeatureRow = memo(function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow} testID="feature-row">
      <View style={styles.checkWrap}>
        <Check size={16} color={theme.colors.success} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
});

const TierCard = memo(function TierCard({ tier, selected, onSelect }: { tier: Tier; selected: boolean; onSelect: (id: Tier['id']) => void }) {
  const borderStyle = useMemo(() => {
    if (tier.popular) {
      return { borderColor: theme.colors.warning };
    }
    return { borderColor: theme.colors.border };
  }, [tier.popular]);

  return (
    <View style={[styles.card, borderStyle]} testID={`tier-${tier.id}`}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: tier.iconBg }]}> 
          {tier.id === 'business' ? <Crown size={22} color={theme.colors.secondary} /> : tier.id === 'pro' ? <Zap size={22} color={theme.colors.warning} /> : <Crown size={22} color={theme.colors.primary} />}
        </View>
        <View style={styles.cardHeadings}>
          <Text style={styles.cardTitle}>{tier.title}</Text>
          <Text style={styles.cardSubtitle}>{tier.subtitle}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.priceMain}>{tier.price}</Text>
          <Text style={styles.priceSub}>{tier.period}</Text>
        </View>
      </View>

      {tier.popular && (
        <View style={styles.popularBadge} testID="popular-badge">
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}

      <View style={styles.featuresWrap}>
        {tier.features.map((f) => (
          <FeatureRow key={f} text={f} />
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onSelect(tier.id)}
        style={[styles.selectBtn, selected && styles.selectBtnActive]}
        testID={`select-${tier.id}`}
      >
        <Text style={[styles.selectText, selected && styles.selectTextActive]}>{selected ? 'Selected' : 'Choose Plan'}</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function ShipperMembershipScreen() {
  const { selected, onSelect } = useSelection();
  const router = useRouter();

  type WhyItem = {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    title: string;
    bullets: string[];
  };

  const why: WhyItem[] = useMemo(
    () => [
      {
        icon: TrendingUp,
        title: 'Increase Revenue',
        bullets: [
          'Priority placement on high-paying lanes',
          'Instant access to backhauls that fit your routes',
          'Smart pricing tips based on market demand',
          'Featured shipper badge to attract top carriers',
        ],
      },
      {
        icon: Shield,
        title: 'Advanced Security',
        bullets: [
          'Enhanced fraud screening on posts and payments',
          'Escrow-style payment protections with dispute workflow',
          'Multi-factor authentication for teams',
          'Audit trails on quotes, edits, and approvals',
        ],
      },
      {
        icon: UserRound,
        title: 'Priority Support',
        bullets: [
          '24/7 live support with <10 min first response',
          'Dedicated account manager for onboarding',
          'Fast-track issue resolution and carrier outreach',
          'Proactive health checks on your active loads',
        ],
      },
      {
        icon: Smartphone,
        title: 'AI-Powered Tools',
        bullets: [
          'AI matchmaker to pair loads with best-fit carriers',
          'Auto-generate postings, rate confirmations, and updates',
          'Voice assistant for quick post, edit, and search',
          'Analytics insights: lane trends, seasonality, and spend',
        ],
      },
    ],
    [],
  );

  const onUpgrade = useCallback(() => {
    console.log('membership.upgrade', selected, Platform.OS);
  }, [selected]);

  return (
    <View style={styles.container} testID="shipper-membership-container">
      <Stack.Screen options={{ title: 'Membership' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={styles.pageTitle}>Choose Your Plan</Text>
          <Text style={styles.pageSubtitle}>Unlock premium features and grow your business</Text>
        </View>

        {tiers.map((t) => (
          <TierCard key={t.id} tier={t} selected={selected === t.id} onSelect={onSelect} />
        ))}

        <View style={styles.whyCard} testID="why-upgrade">
          <Text style={styles.whyTitle}>Why Upgrade?</Text>
          {why.map((w) => {
            const isIncreaseRevenue = w.title === 'Increase Revenue';
            const RowComp = isIncreaseRevenue ? TouchableOpacity : View;
            return (
              <RowComp
                key={w.title}
                style={styles.whyRow}
                {...(isIncreaseRevenue ? { activeOpacity: 0.85, onPress: () => { console.log('why.open', w.title); router.push('/increase-revenue'); } } : {})}
                testID={isIncreaseRevenue ? 'why-increase-revenue' : undefined}
              >
                <View style={styles.whyIcon}>
                  <w.icon size={20} color={theme.colors.secondary} />
                </View>
                <View style={styles.whyTextWrap}>
                  <Text style={[styles.whyHeading, isIncreaseRevenue && styles.linkHeading]}>{w.title}</Text>
                  {w.bullets.map((b) => (
                    <View key={b} style={styles.whyBulletRow} testID="why-bullet">
                      <Check size={14} color={theme.colors.success} />
                      <Text style={styles.whyDesc}>{b}</Text>
                    </View>
                  ))}
                </View>
              </RowComp>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onUpgrade} style={styles.upgradeBar} testID="upgrade-now">
          <Text style={styles.upgradeText}>Upgrade Now</Text>
        </TouchableOpacity>
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
  headerWrap: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  cardHeadings: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceMain: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  priceSub: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  popularBadge: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: theme.spacing.sm,
  },
  popularText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  featuresWrap: {
    marginTop: theme.spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkWrap: {
    width: 22,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  selectBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  selectBtnActive: {
    backgroundColor: '#E5E7EB',
  },
  selectText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  selectTextActive: {
    color: theme.colors.gray,
  },
  whyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  whyTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  whyIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  whyTextWrap: {
    flex: 1,
  },
  whyHeading: {
    fontWeight: '700',
    color: theme.colors.dark,
    fontSize: theme.fontSize.md,
  },
  linkHeading: {
    textDecorationLine: 'underline',
    color: theme.colors.secondary,
  },
  whyDesc: {
    color: theme.colors.gray,
    marginTop: 2,
    fontSize: theme.fontSize.sm,
  },
  whyBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8 as unknown as number,
    marginTop: 4,
  },
  upgradeBar: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  upgradeText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: theme.fontSize.md,
  },
});