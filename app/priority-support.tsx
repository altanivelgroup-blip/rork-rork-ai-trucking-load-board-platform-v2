import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { Headset, Clock, MessageCircle, Users, Zap, LifeBuoy, PhoneCall, BadgeCheck } from 'lucide-react-native';

type Stat = { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string; footnote?: string };
type Benefit = { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; desc: string };

export default function PrioritySupportScreen() {
  const stats: Stat[] = useMemo(
    () => [
      { icon: Clock, label: 'First Response', value: '<10 min', footnote: 'priority queue, 24/7/365' },
      { icon: Zap, label: 'Faster Resolution', value: '35% quicker', footnote: 'vs. standard support' },
      { icon: BadgeCheck, label: 'CSAT Score', value: '4.8 / 5', footnote: 'rolling 90-day average' },
      { icon: Users, label: 'Dedicated AM', value: 'Included', footnote: 'for onboarding + growth' },
    ],
    [],
  );

  const benefits: Benefit[] = useMemo(
    () => [
      { icon: Headset, title: 'Always-On Help', desc: 'Round-the-clock coverage so late-night tenders, weekend recoveries, and after-hours ops never wait.' },
      { icon: PhoneCall, title: 'Multi-Channel Support', desc: 'Live chat, phone hotline, and in-app messaging with automatic context from your account.' },
      { icon: Zap, title: 'Priority Routing', desc: 'Your requests jump to the front of the line with specialized triage for time-critical issues.' },
      { icon: MessageCircle, title: 'Carrier Outreach', desc: 'We’ll contact carriers on your behalf for confirmations, updates, and escalations when timelines slip.' },
      { icon: Users, title: 'Dedicated Account Manager', desc: 'White-glove onboarding, quarterly reviews, and best practices tailored to your freight mix.' },
      { icon: LifeBuoy, title: 'Proactive Monitoring', desc: 'Health checks on active loads, missed-doc reminders, and early intervention on risky patterns.' },
    ],
    [],
  );

  return (
    <View style={styles.container} testID="priority-support-container">
      <Stack.Screen options={{ title: 'Priority Support' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>Get Help First—Any Time, Any Load</Text>
          <Text style={styles.subtitle}>Trucking doesn’t stop at 5 PM. Our priority support keeps your freight moving with faster answers and hands-on assistance.</Text>
        </View>

        <View style={styles.kpiGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.kpiCard} testID="priority-kpi">
              <View style={styles.kpiIconWrap}>
                <s.icon size={18} color={theme.colors.secondary} />
              </View>
              <Text style={styles.kpiValue}>{s.value}</Text>
              <Text style={styles.kpiLabel}>{s.label}</Text>
              {s.footnote ? <Text style={styles.kpiFootnote}>{s.footnote}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You Get</Text>
          {benefits.map((b) => (
            <View key={b.title} style={styles.benefitRow} testID="priority-benefit">
              <View style={styles.benefitIcon}>
                <b.icon size={18} color={theme.colors.secondary} />
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why It Matters In Trucking</Text>
          <Text style={styles.body}>Freight windows are tight and exceptions happen. Missed updates, stalled docs, or late-night pickup changes can kill a day’s plan. Priority Support gives you rapid human help, proactive load monitoring, and direct carrier outreach—so you resolve issues faster, protect customer SLAs, and keep drivers and docks on schedule.</Text>
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => {
            console.log('priority-support.cta', Platform.OS);
          }}
          testID="cta-enable-priority"
        >
          <Text style={styles.ctaText}>Enable Priority Support</Text>
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
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  benefitIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontWeight: '700',
    color: theme.colors.dark,
    fontSize: theme.fontSize.md,
  },
  benefitDesc: {
    color: theme.colors.gray,
    marginTop: 2,
    fontSize: theme.fontSize.sm,
  },
  body: {
    color: theme.colors.dark,
    lineHeight: 20,
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
