import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Switch, Alert } from 'react-native';
import { CreditCard, Banknote, Fuel, Plus, Shield, DollarSign, Check, Trash2, Edit2, Lightbulb, Crown, Zap, Lock } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';

type PlanId = 'basic' | 'pro' | 'business';

const PLAN_META: Record<PlanId, { label: string; price: string; period: string; description: string }> = {
  basic: { label: 'Basic', price: '$5', period: '/month', description: 'Starter tier' },
  pro: { label: 'Pro', price: '$49', period: '/month', description: 'Most popular' },
  business: { label: 'Business', price: '$99.99', period: '/month', description: 'For teams' },
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string }>();
  const { updateProfile, user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const selectedPlan: PlanId | undefined = useMemo(() => {
    const p = (params.plan ?? '').toString().toLowerCase();
    const allowed: PlanId[] = ['basic', 'pro', 'business'];
    if (allowed.includes(p as PlanId)) return p as PlanId;
    return undefined;
  }, [params.plan]);

  const activePlan: PlanId | undefined = useMemo(() => {
    const tier = user?.membershipTier;
    const allowed: PlanId[] = ['basic', 'pro', 'business'];
    return allowed.includes((tier as PlanId) ?? 'basic') ? (tier as PlanId) : undefined;
  }, [user?.membershipTier]);

  const effectivePlan: PlanId | undefined = selectedPlan ?? activePlan;
  useEffect(() => {
    try {
      if (selectedPlan && scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    } catch (e) {
      console.log('paymentMethods.autoscroll.error', e);
    }
  }, [selectedPlan]);
  const isLockedFromActive = !selectedPlan && !!activePlan;
  const { methods, services, setDefault, deleteMethod, isHydrating, toggleService } = usePayments();

  const iconForType = useCallback((type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard color={theme.colors.primary} size={24} />;
      case 'bank':
        return <Banknote color={theme.colors.primary} size={24} />;
      case 'fleet':
        return <Fuel color={theme.colors.primary} size={24} />;
      default:
        return <Shield color={theme.colors.primary} size={24} />;
    }
  }, []);

  const headerRight = useMemo(() => (
    <TouchableOpacity
      testID="addMethodBtn"
      style={[styles.addBtn, !!selectedPlan && { opacity: 0.5 }]}
      onPress={() => console.log('Add pressed')}
      disabled={!!selectedPlan}
    >
      <Plus color={theme.colors.white} size={18} />
      <Text style={styles.addBtnText}>Add</Text>
    </TouchableOpacity>
  ), [selectedPlan]);

  return (
    <View style={styles.container} testID="paymentMethodsScreen">
      <Stack.Screen options={{ title: 'Payment Methods', headerRight: () => headerRight }} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="paymentMethodsScroll">
        {!!effectivePlan && (
          <View style={styles.planBanner} testID="selectedPlanBanner">
            <View style={styles.planIconWrap}>
              {effectivePlan === 'pro' ? (
                <Zap color={theme.colors.warning} size={20} />
              ) : (
                <Crown color={effectivePlan === 'business' ? theme.colors.secondary : theme.colors.primary} size={20} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planBannerTitle}>{isLockedFromActive ? 'Active Plan' : 'Locked Plan'}</Text>
              <Text style={styles.planBannerSubtitle}>
                {PLAN_META[effectivePlan].label} {PLAN_META[effectivePlan].price}
                <Text style={{ color: theme.colors.gray }}> {PLAN_META[effectivePlan].period}</Text>
              </Text>
              <Text style={styles.planBannerHint}>
                {isLockedFromActive ? 'This is your current subscription. Plan selection is locked.' : 'Plan is locked from ?plan. You can confirm below.'}
              </Text>
            </View>
            <Lock size={18} color={theme.colors.gray} />
          </View>
        )}
        <Text style={styles.sectionTitle}>Payment Methods</Text>

        {methods.map((m) => (
          <View key={m.id} style={styles.card} testID={`method-${m.id}`}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>{iconForType(m.type)}</View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{m.name}</Text>
                <Text style={styles.cardSubtitle}>{m.detail}{m.expires ? `\nExpires ${m.expires}` : ''}</Text>
              </View>
              <View style={styles.badges}>
                {m.isDefault && (
                  <View accessibilityRole="text" style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
                {m.verified && <Check color={theme.colors.success} size={18} />}
              </View>
            </View>

            <View style={styles.actionsRow}>
              {!m.isDefault && (
                <TouchableOpacity testID={`setDefault-${m.id}`} style={[styles.pill, styles.pillGray]} onPress={() => setDefault(m.id)}>
                  <Text style={[styles.pillText, styles.pillTextDark]}>Set as Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity testID={`edit-${m.id}`} style={[styles.pill, styles.pillBlue]} onPress={() => console.log('Edit', m.id)}>
                <Edit2 color={theme.colors.white} size={14} />
                <Text style={styles.pillTextLight}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity testID={`delete-${m.id}`} style={[styles.pill, styles.pillRed]} onPress={() => deleteMethod(m.id)}>
                <Trash2 color={theme.colors.white} size={14} />
                <Text style={styles.pillTextLight}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Payment Services</Text>
        <Text style={styles.sectionSubtitle}>Enable additional payment features to get paid faster</Text>

        <ServiceToggle
          testID="toggle-autopay"
          title="Auto Pay"
          subtitle="Automatically charge your default method on renewal"
          icon={Check}
          value={services.autoPay}
          onValueChange={(v) => toggleService('autoPay', v)}
        />
        <ServiceToggle
          testID="toggle-quickpay"
          title="Quick Pay"
          subtitle="Get paid within 24 hours\nFee: 2.5%"
          icon={Lightbulb}
          value={services.quickPay}
          onValueChange={(v) => toggleService('quickPay', v)}
        />
        <ServiceToggle
          testID="toggle-fuel"
          title="Fuel Advance"
          subtitle="Get fuel money upfront\nFee: 3%"
          icon={Fuel}
          value={services.fuelAdvance}
          onValueChange={(v) => toggleService('fuelAdvance', v)}
        />
        <ServiceToggle
          testID="toggle-factoring"
          title="Invoice Factoring"
          subtitle="Sell invoices for immediate cash\nFee: 2-5%"
          icon={Shield}
          value={services.invoiceFactoring}
          onValueChange={(v) => toggleService('invoiceFactoring', v)}
        />
        <ServiceToggle
          testID="toggle-crypto"
          title="Cryptocurrency"
          subtitle="Accept Bitcoin and other crypto\nFee: 1%"
          icon={DollarSign}
          value={services.crypto}
          onValueChange={(v) => toggleService('crypto', v)}
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      {!!effectivePlan && (
        <View style={styles.lockedFooter} testID="lockedFooter">
          <View style={styles.footerSummary}>
            <Text style={styles.footerPlan}>{PLAN_META[effectivePlan].label}</Text>
            <Text style={styles.footerPrice}>
              {PLAN_META[effectivePlan].price}
              <Text style={styles.footerPeriod}> {PLAN_META[effectivePlan].period}</Text>
            </Text>
            <Text style={styles.footerNote}>
              {services.autoPay ? 'Auto Pay: ON (charges default method on renewal)' : 'Auto Pay: OFF'}
            </Text>
          </View>
          {!isLockedFromActive ? (
            <TouchableOpacity
              testID="confirmSubscribeBtn"
              style={[styles.confirmBtn, isConfirming && { opacity: 0.6 }]}
              onPress={async () => {
                if (!effectivePlan) return;
                try {
                  setIsConfirming(true);
                  await updateProfile({ membershipTier: effectivePlan });
                  Alert.alert('Success', `Subscribed to ${PLAN_META[effectivePlan].label}.`, [
                    { text: 'OK', onPress: () => router.back() },
                  ]);
                } catch (e) {
                  Alert.alert('Error', 'Could not update membership. Please try again.');
                } finally {
                  setIsConfirming(false);
                }
              }}
              disabled={isConfirming}
            >
              <Text style={styles.confirmText}>Confirm / Subscribe</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.confirmBtn, { backgroundColor: '#E5E7EB' }]} accessibilityRole="button" accessibilityState={{ disabled: true }}>
              <Text style={[styles.confirmText, { color: theme.colors.dark }]}>Current Plan</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const ServiceToggle = React.memo(function ServiceToggle({ title, subtitle, icon, value, onValueChange, testID }: { title: string; subtitle: string; icon: React.ComponentType<{ size?: number; color?: string }>; value: boolean; onValueChange: (v: boolean) => void; testID?: string; }) {
  const Icon = icon;
  return (
    <View style={styles.serviceCard} testID={testID}>
      <View style={styles.row}>
        <View style={styles.iconWrapSmall}>
          <Icon color={theme.colors.primary} size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.serviceTitle}>{title}</Text>
          <Text style={styles.serviceSubtitle}>{subtitle}</Text>
        </View>
        <Switch
          testID={`${testID}-switch`}
          value={value}
          onValueChange={onValueChange}
          thumbColor={Platform.OS === 'android' ? (value ? theme.colors.white : '#f4f3f4') : undefined}
          trackColor={{ false: '#D1D5DB', true: theme.colors.secondary }}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.lg },
  planBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md, gap: 10 as unknown as number },
  planIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: theme.spacing.md },
  planBannerTitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  planBannerSubtitle: { fontSize: theme.fontSize.lg, fontWeight: '800' as const, color: theme.colors.dark },
  planBannerHint: { marginTop: 2, fontSize: theme.fontSize.xs, color: theme.colors.gray },
  sectionTitle: { fontSize: theme.fontSize.xl, fontWeight: '700' as const, color: theme.colors.dark, marginBottom: theme.spacing.md },
  sectionSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginBottom: theme.spacing.md },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EAF0FF', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  iconWrapSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF0FF', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  flex: { flex: 1 },
  cardTitle: { fontSize: theme.fontSize.lg, fontWeight: '700' as const, color: theme.colors.dark, marginBottom: 2 },
  cardSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  badges: { alignItems: 'flex-end', gap: 6 as unknown as number },
  defaultBadge: { backgroundColor: '#E3EBFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  defaultBadgeText: { color: theme.colors.primary, fontSize: theme.fontSize.xs, fontWeight: '700' as const },
  actionsRow: { marginTop: theme.spacing.md, flexDirection: 'row' as const, gap: theme.spacing.sm as unknown as number, flexWrap: 'wrap' as const },
  pill: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 as unknown as number },
  pillGray: { backgroundColor: '#E5E7EB' },
  pillBlue: { backgroundColor: theme.colors.secondary },
  pillRed: { backgroundColor: '#fecaca' },
  pillText: { fontSize: theme.fontSize.sm },
  pillTextDark: { color: theme.colors.dark, fontWeight: '600' as const },
  pillTextLight: { color: theme.colors.white, fontWeight: '700' as const, marginLeft: 6 },
  addBtn: { backgroundColor: theme.colors.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 as unknown as number },
  addBtnText: { color: theme.colors.white, fontWeight: '700' as const, marginLeft: 6 },
  serviceCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  serviceTitle: { fontSize: theme.fontSize.lg, fontWeight: '700' as const, color: theme.colors.dark, marginBottom: 2 },
  serviceSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  lockedFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.md as unknown as number },
  footerSummary: { flex: 1 },
  footerPlan: { fontSize: theme.fontSize.md, fontWeight: '700' as const, color: theme.colors.dark },
  footerPrice: { fontSize: theme.fontSize.lg, fontWeight: '800' as const, color: theme.colors.dark },
  footerPeriod: { fontSize: theme.fontSize.sm, color: theme.colors.gray },
  footerNote: { marginTop: 4, fontSize: theme.fontSize.xs, color: theme.colors.gray },
  confirmBtn: { backgroundColor: theme.colors.secondary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  confirmText: { color: theme.colors.white, fontWeight: '800' as const },
});
