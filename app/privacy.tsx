import React from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, Alert } from 'react-native';
import { lightTheme as theme } from '@/constants/theme';
import { Shield, ExternalLink } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const openExternal = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', 'Please try again later.');
      }
    } catch (e) {
      console.error('[privacy] openExternal error', e);
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  return (
    <View style={styles.container} testID="privacy-screen">
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <View style={styles.iconWrap}>
            <Shield color={theme.colors.primary} size={24} />
          </View>
          <Text style={styles.title}>Your Privacy Matters</Text>
          <Text style={styles.subtitle}>We collect only what we need to run the app and improve your experience.</Text>
        </View>

        <Section title="Data We Collect">
          <Bullet>Account info: name, email, phone</Bullet>
          <Bullet>Operational data: loads you post or accept, documents you upload</Bullet>
          <Bullet>Device data: app version, crash logs</Bullet>
          <Bullet>Location (optional): only when you enable location services</Bullet>
        </Section>

        <Section title="How We Use Data">
          <Bullet>Provide and improve core features</Bullet>
          <Bullet>Fraud prevention and account security</Bullet>
          <Bullet>Customer support and service communications</Bullet>
        </Section>

        <Section title="Sharing">
          <Bullet>We do not sell your data</Bullet>
          <Bullet>We share with service providers (e.g., hosting, analytics) under strict contracts</Bullet>
        </Section>

        <Section title="Your Controls">
          <Bullet>Access/Export: Settings → Data & Storage → Export Data</Bullet>
          <Bullet>Delete: Settings → Delete Account</Bullet>
          <Bullet>Contact: privacy@yourcompany.com</Bullet>
        </Section>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openExternal('https://yourcompany.com/privacy')}
          testID="privacy-external-link"
        >
          <Text style={styles.linkText}>Read the full policy on our website</Text>
          <ExternalLink color={theme.colors.secondary} size={18} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  headerCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: theme.spacing.sm, fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  subtitle: { marginTop: 4, fontSize: theme.fontSize.sm, color: theme.colors.gray },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: theme.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary, marginTop: 7 },
  bulletText: { flex: 1, color: theme.colors.dark, fontSize: theme.fontSize.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md },
  linkText: { color: theme.colors.secondary, fontWeight: '700' },
});
