import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { ShieldCheck, Lock, Eye, KeyRound, FileCheck2, Fingerprint, Activity, BadgeCheck } from 'lucide-react-native';

type Stat = { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string; footnote?: string };
type Benefit = { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; desc: string };

export default function AdvanceSecurityScreen() {
  const router = useRouter();
  const stats: Stat[] = useMemo(
    () => [
      { icon: Activity, label: 'Cargo Theft Cost', value: '$1.1B+', footnote: 'annual losses across US trucking (2024 est.)' },
      { icon: Eye, label: 'Phishing Growth', value: '+18%', footnote: 'YoY in logistics-focused scams' },
      { icon: FileCheck2, label: 'Doc Fraud Attempts', value: '1 in 20', footnote: 'loads see altered BOL/COI attempts' },
      { icon: BadgeCheck, label: 'Verified Partners', value: '100%', footnote: 'KYB/KYC vetting required' },
    ],
    [],
  );

  const benefits: Benefit[] = useMemo(
    () => [
      { icon: ShieldCheck, title: 'End-to-End Secure Workspace', desc: 'Encrypted at rest and in transit. Sensitive load details protected by modern TLS and key management.' },
      { icon: Lock, title: 'Role-Based Access Control', desc: 'Granular permissions for shippers, dispatchers, and admins. Prevent overexposure of rates and documents.' },
      { icon: KeyRound, title: 'Two-Factor Authentication', desc: 'Add a second step at sign-in to block unauthorized access, even if a password leaks.' },
      { icon: FileCheck2, title: 'Trusted Document Vault', desc: 'COI, BOL, W-9, safety docs kept in a tamper-evident vault with versioning and watermarking.' },
      { icon: Fingerprint, title: 'Fraud & Impersonation Signals', desc: 'Behavioral flags for spoofed emails, sudden banking changes, and mismatched MC/SCAC metadata.' },
      { icon: Eye, title: 'Audit Trails & Alerts', desc: 'Every sensitive action is logged. Get alerts for risky changes like pay-to updates or modified addresses.' },
    ],
    [],
  );

  return (
    <View style={styles.container} testID="advance-security-container">
      <Stack.Screen options={{ title: 'Advanced Security' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>Protect Every Load, Every Step</Text>
          <Text style={styles.subtitle}>Security built for modern trucking: stop fraud, safeguard documents, and control access with precision.</Text>
        </View>

        <View style={styles.kpiGrid}>
          {stats.map((s, idx) => {
            const rightMargin = idx % 2 === 0 ? 8 : 0;
            return (
              <View key={s.label} style={[styles.kpiCard, { marginRight: rightMargin, marginBottom: 8 }]} testID="security-kpi">
                <View style={styles.kpiIconWrap}>
                  <s.icon size={18} color={theme.colors.secondary} />
                </View>
                <Text style={styles.kpiValue}>{s.value}</Text>
                <Text style={styles.kpiLabel}>{s.label}</Text>
                {s.footnote ? <Text style={styles.kpiFootnote}>{s.footnote}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Keep You Safe</Text>
          {benefits.map((b) => (
            <View key={b.title} style={styles.benefitRow} testID="security-benefit">
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
          <Text style={styles.body}>The industry faces rising identity fraud, fictitious pickups, and document tampering. Bad actors target busy ops teams with spoofed emails and urgency tactics. Our security stack reduces exposure by enforcing identity checks, automating verification, and tightening who sees what—without slowing your workflow.</Text>
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => {
            console.log('advance-security.cta', Platform.OS);
            router.push('/privacy-security');
          }}
          testID="cta-enable-security"
        >
          <Text style={styles.ctaText}>Enable Advanced Security</Text>
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
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
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
