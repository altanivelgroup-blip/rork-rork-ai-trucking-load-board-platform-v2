import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { TrendingUp, DollarSign, Route, Clock, BadgeCheck, Bell, BarChart3, Sparkles } from 'lucide-react-native';

type KPI = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  footnote?: string;
};

const kpis: KPI[] = [
  { icon: DollarSign, label: 'Avg RPM Lift', value: '+6–12%', footnote: 'vs. regional averages' },
  { icon: Route, label: 'Deadhead Reduced', value: '18–30%', footnote: 'with backhaul pairing' },
  { icon: Clock, label: 'Faster Tender → Book', value: '2.4x', footnote: 'with instant alerts' },
  { icon: BadgeCheck, label: 'Carrier Acceptance', value: '+15–25%', footnote: 'from verified badge' },
];

function useRoiCalc() {
  const [monthlyLoads, setMonthlyLoads] = useState<number>(40);
  const [avgRate, setAvgRate] = useState<number>(650);
  const [upliftPct, setUpliftPct] = useState<number>(0.08);

  const monthlyRevenue = useMemo(() => monthlyLoads * avgRate, [monthlyLoads, avgRate]);
  const projectedUplift = useMemo(() => monthlyRevenue * upliftPct, [monthlyRevenue, upliftPct]);

  const inc = useCallback((key: 'monthlyLoads' | 'avgRate', delta: number) => {
    if (key === 'monthlyLoads') {
      setMonthlyLoads((v) => Math.max(0, v + delta));
    } else {
      setAvgRate((v) => Math.max(0, v + delta));
    }
    console.log('roi.adjust', key, delta, Platform.OS);
  }, []);

  const onChangeNum = useCallback((key: 'monthlyLoads' | 'avgRate' | 'upliftPct', text: string) => {
    const parsed = Number(text.replace(/[^0-9.]/g, ''));
    const safe = Number.isFinite(parsed) ? parsed : 0;
    if (key === 'monthlyLoads') setMonthlyLoads(Math.floor(safe));
    if (key === 'avgRate') setAvgRate(safe);
    if (key === 'upliftPct') setUpliftPct(Math.min(1, Math.max(0, safe / 100)));
    console.log('roi.input', key, safe);
  }, []);

  return { monthlyLoads, avgRate, upliftPct, monthlyRevenue, projectedUplift, inc, onChangeNum } as const;
}

export default function IncreaseRevenueScreen() {
  const router = useRouter();
  const { monthlyLoads, avgRate, upliftPct, monthlyRevenue, projectedUplift, inc, onChangeNum } = useRoiCalc();

  const trends = useMemo(
    () => [
      { label: 'National load-to-truck ratio (dry van)', value: 3.1 },
      { label: 'Seasonal uplift Q4 vs Q2 (auto moves)', value: 1.18 },
      { label: 'Top 10 lanes premium vs avg', value: 1.12 },
    ],
    [],
  );

  const helpers = useMemo(
    () => [
      { icon: TrendingUp, title: 'Smart Matching', desc: 'We surface high-yield lanes and carriers most likely to accept at your target rate.' },
      { icon: BarChart3, title: 'Dynamic Pricing Tips', desc: 'Market-informed price guidance based on demand, seasonality, and lane history.' },
      { icon: Route, title: 'Backhaul Finder', desc: 'Reduce empty miles by auto-pairing return legs that fit your schedule.' },
      { icon: Bell, title: 'Instant Notifications', desc: 'Be first in line with real-time tender, bid, and message alerts.' },
      { icon: BadgeCheck, title: 'Verified Shipper Badge', desc: 'Improve trust and acceptance rates with vetted profile signals.' },
      { icon: Sparkles, title: 'AI Listing Assistant', desc: 'Generate clear, conversion-optimized posts and updates in seconds.' },
    ],
    [],
  );

  return (
    <View style={styles.container} testID="increase-revenue-container">
      <Stack.Screen options={{ title: 'Increase Revenue' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>Grow Revenue With Better Lanes</Text>
          <Text style={styles.subtitle}>Real trucking market data + tools that boost rate per mile, reduce deadhead, and lift acceptance.</Text>
        </View>

        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpiCard} testID="kpi-card">
              <View style={styles.kpiIconWrap}>
                <k.icon size={18} color={theme.colors.secondary} />
              </View>
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              {k.footnote ? <Text style={styles.kpiFootnote}>{k.footnote}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Snapshot</Text>
          {trends.map((t) => (
            <View key={t.label} style={styles.trendRow} testID="trend-row">
              <Text style={styles.trendLabel}>{t.label}</Text>
              <Text style={styles.trendValue}>{t.value}x</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How The App Helps You Earn More</Text>
          {helpers.map((h) => (
            <View key={h.title} style={styles.helperRow} testID="helper-row">
              <View style={styles.helperIcon}>
                <h.icon size={18} color={theme.colors.secondary} />
              </View>
              <View style={styles.helperTextWrap}>
                <Text style={styles.helperTitle}>{h.title}</Text>
                <Text style={styles.helperDesc}>{h.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.roiCard} testID="roi-card">
          <Text style={styles.sectionTitle}>Quick ROI Calculator</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Monthly Loads</Text>
            <View style={styles.inputControl}>
              <TouchableOpacity onPress={() => inc('monthlyLoads', -5)} style={styles.stepBtn} activeOpacity={0.8} testID="loads-dec"><Text style={styles.stepTxt}>-5</Text></TouchableOpacity>
              <TextInput
                value={String(monthlyLoads)}
                onChangeText={(t) => onChangeNum('monthlyLoads', t)}
                keyboardType="numeric"
                style={styles.input}
                testID="loads-input"
              />
              <TouchableOpacity onPress={() => inc('monthlyLoads', 5)} style={styles.stepBtn} activeOpacity={0.8} testID="loads-inc"><Text style={styles.stepTxt}>+5</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Avg Rate ($/load)</Text>
            <View style={styles.inputControl}>
              <TouchableOpacity onPress={() => inc('avgRate', -50)} style={styles.stepBtn} activeOpacity={0.8} testID="rate-dec"><Text style={styles.stepTxt}>-50</Text></TouchableOpacity>
              <TextInput
                value={String(avgRate)}
                onChangeText={(t) => onChangeNum('avgRate', t)}
                keyboardType="numeric"
                style={styles.input}
                testID="rate-input"
              />
              <TouchableOpacity onPress={() => inc('avgRate', 50)} style={styles.stepBtn} activeOpacity={0.8} testID="rate-inc"><Text style={styles.stepTxt}>+50</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Uplift (%)</Text>
            <View style={styles.inputControl}>
              <TouchableOpacity onPress={() => onChangeNum('upliftPct', String(Math.max(0, upliftPct * 100 - 1)))} style={styles.stepBtn} activeOpacity={0.8} testID="uplift-dec"><Text style={styles.stepTxt}>-1</Text></TouchableOpacity>
              <TextInput
                value={String(Math.round(upliftPct * 100))}
                onChangeText={(t) => onChangeNum('upliftPct', t)}
                keyboardType="numeric"
                style={styles.input}
                testID="uplift-input"
              />
              <TouchableOpacity onPress={() => onChangeNum('upliftPct', String(Math.min(100, upliftPct * 100 + 1)))} style={styles.stepBtn} activeOpacity={0.8} testID="uplift-inc"><Text style={styles.stepTxt}>+1</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.roiSummary}>
            <Text style={styles.roiLine}>Current monthly revenue: <Text style={styles.roiStrong}>${monthlyRevenue.toLocaleString()}</Text></Text>
            <Text style={styles.roiLine}>Projected monthly lift: <Text style={styles.roiStrong}>+${projectedUplift.toLocaleString()}</Text></Text>
            <Text style={styles.roiSmall}>Assumes conservative {Math.round(upliftPct * 100)}% improvement using premium features.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={() => { try { console.log('increase-revenue.cta', Platform.OS); router.push('/ai-tools'); } catch (e) { console.error('increase-revenue.navigate.error', e); } }} testID="cta-start">
          <Text style={styles.ctaText}>Start Increasing Revenue</Text>
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
  hero: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    color: theme.colors.dark,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.gray,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12 as unknown as number,
  },
  kpiCard: {
    flexBasis: '48%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  kpiLabel: {
    color: theme.colors.gray,
    marginTop: 2,
  },
  kpiFootnote: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  section: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  trendLabel: {
    flex: 1,
    color: theme.colors.dark,
    paddingRight: theme.spacing.md,
  },
  trendValue: {
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  helperIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  helperTextWrap: {
    flex: 1,
  },
  helperTitle: {
    fontWeight: '700',
    color: theme.colors.dark,
    fontSize: theme.fontSize.md,
  },
  helperDesc: {
    color: theme.colors.gray,
    marginTop: 2,
    fontSize: theme.fontSize.sm,
  },
  roiCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputRow: {
    marginTop: theme.spacing.md,
  },
  inputLabel: {
    color: theme.colors.gray,
    marginBottom: 6,
  },
  inputControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as unknown as number,
  },
  stepBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  stepTxt: {
    color: theme.colors.dark,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.dark,
  },
  roiSummary: {
    marginTop: theme.spacing.lg,
    backgroundColor: '#F8FAFC',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  roiLine: {
    color: theme.colors.dark,
    marginBottom: 6,
  },
  roiStrong: {
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  roiSmall: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  cta: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  ctaText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: theme.fontSize.md,
  },
});
