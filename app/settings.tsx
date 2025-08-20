import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, Link } from 'expo-router';
import { Bell, Mail, MessageSquare, Moon, Volume2, MapPin, RefreshCcw, WifiOff, Trash2, Download, Upload, Shield, CreditCard, HelpCircle, FileText, BookOpen, Info } from 'lucide-react-native';
import { lightTheme as theme } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsScreen() {
  const s = useSettings();

  const Row = useCallback(({ icon, title, subtitle, value, onValueChange, testID }: { icon: React.ReactNode; title: string; subtitle?: string; value?: boolean; onValueChange?: (v: boolean) => void; testID?: string; }) => (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {typeof value === 'boolean' && onValueChange ? (
        <Switch value={value} onValueChange={onValueChange} testID={`${testID}-switch`} />
      ) : null}
    </View>
  ), []);

  const SectionTitle = ({ children }: { children: string }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
  );

  const confirmReset = () => {
    Alert.alert('Reset Settings', 'Reset all settings to default?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => s.resetAll().catch(() => {}) },
    ]);
  };

  const confirmClear = () => {
    Alert.alert('Clear Cache', 'Free up storage space by clearing cached data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => s.clearCache().catch(() => {}) },
    ]);
  };

  const onExport = async () => {
    const mod = await import('@/utils/dataTransfer');
    await mod.exportData();
  };

  const onImport = async () => {
    const mod = await import('@/utils/dataTransfer');
    await mod.importData();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle>Notifications</SectionTitle>
        <View style={styles.card}>
          <Row icon={<Bell color={theme.colors.primary} size={20} />} title="Push Notifications" subtitle="Receive notifications on your device" value={s.pushNotifications} onValueChange={(v) => s.setToggle('pushNotifications', v)} testID="settings-push" />
          <Row icon={<Mail color={theme.colors.primary} size={20} />} title="Email Notifications" subtitle="Receive notifications via email" value={s.emailNotifications} onValueChange={(v) => s.setToggle('emailNotifications', v)} testID="settings-email" />
          <Row icon={<MessageSquare color={theme.colors.primary} size={20} />} title="SMS Notifications" subtitle="Receive notifications via text message" value={s.smsNotifications} onValueChange={(v) => s.setToggle('smsNotifications', v)} testID="settings-sms" />
        </View>

        <SectionTitle>Appearance & Sound</SectionTitle>
        <View style={styles.card}>
          <Row icon={<Moon color={theme.colors.primary} size={20} />} title="Dark Mode" subtitle="Use dark theme throughout the app" value={s.darkMode} onValueChange={(v) => s.setToggle('darkMode', v)} testID="settings-dark" />
          <Row icon={<Volume2 color={theme.colors.primary} size={20} />} title="Sound Effects" subtitle="Play sounds for app interactions" value={s.soundEffects} onValueChange={(v) => s.setToggle('soundEffects', v)} testID="settings-sound" />
        </View>

        <SectionTitle>Privacy & Location</SectionTitle>
        <View style={styles.card}>
          <Row icon={<MapPin color={theme.colors.primary} size={20} />} title="Location Services" subtitle="Allow app to access your location" value={s.locationServices} onValueChange={(v) => s.setToggle('locationServices', v)} testID="settings-location" />
          <Link href="/data-usage" asChild>
            <TouchableOpacity style={styles.row} testID="settings-data-usage">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><Info color={theme.colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>How We Use Your Data</Text>
                  <Text style={styles.rowSubtitle}>Plain-language explanations for permissions</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
          <Link href="/privacy-security" asChild>
            <TouchableOpacity style={styles.row} testID="settings-privacy-security">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><Shield color={theme.colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Privacy & Security</Text>
                  <Text style={styles.rowSubtitle}>Manage your privacy preferences</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
          <Link href="/privacy" asChild>
            <TouchableOpacity style={styles.row} testID="settings-privacy-policy">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><FileText color={theme.colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Privacy Policy</Text>
                  <Text style={styles.rowSubtitle}>How we collect and use your data</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
          <Link href="/terms" asChild>
            <TouchableOpacity style={styles.row} testID="settings-terms">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><BookOpen color={theme.colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Terms of Service</Text>
                  <Text style={styles.rowSubtitle}>Your rights and obligations</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
          <Link href="/account-deletion" asChild>
            <TouchableOpacity style={styles.row} testID="settings-account-deletion">
              <View style={styles.rowLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}><Trash2 color={theme.colors.danger} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.colors.danger }]}>Delete Account</Text>
                  <Text style={styles.rowSubtitle}>Permanently delete your account</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        <SectionTitle>Data & Storage</SectionTitle>
        <View style={styles.card}>
          <Row icon={<RefreshCcw color={theme.colors.primary} size={20} />} title="Auto Sync" subtitle="Automatically sync data when connected" value={s.autoSync} onValueChange={(v) => s.setToggle('autoSync', v)} testID="settings-autosync" />
          <Row icon={<WifiOff color={theme.colors.primary} size={20} />} title="Offline Mode" subtitle="Enable offline functionality" value={s.offlineMode} onValueChange={(v) => s.setToggle('offlineMode', v)} testID="settings-offline" />
          <TouchableOpacity style={styles.row} onPress={confirmClear} testID="settings-clearcache">
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}><Trash2 color={theme.colors.primary} size={20} /></View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Clear Cache</Text>
                <Text style={styles.rowSubtitle}>Free up storage space</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={onExport} testID="settings-export">
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}><Download color={theme.colors.primary} size={20} /></View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Export Data</Text>
                <Text style={styles.rowSubtitle}>Download your data</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={onImport} testID="settings-import">
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}><Upload color={theme.colors.primary} size={20} /></View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Import Data</Text>
                <Text style={styles.rowSubtitle}>Upload and restore your data</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <SectionTitle>Billing & Payments</SectionTitle>
        <View style={styles.card}>
          <Link href="/payment-methods" asChild>
            <TouchableOpacity style={styles.row} testID="settings-payment-methods">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><CreditCard color={theme.colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Payment Methods</Text>
                  <Text style={styles.rowSubtitle}>Manage cards, bank accounts, and services</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        <SectionTitle>Help & Support</SectionTitle>
        <View style={styles.card}>
          <Link href="/help-support" asChild>
            <TouchableOpacity style={styles.row} testID="settings-help-support">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><HelpCircle color={theme.colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Help & Support</Text>
                  <Text style={styles.rowSubtitle}>FAQs, docs, and contact options</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        <SectionTitle>Advanced</SectionTitle>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={confirmReset} testID="settings-reset">
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Trash2 color={theme.colors.danger} size={20} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.colors.danger }]}>Reset Settings</Text>
                <Text style={styles.rowSubtitle}>Reset all settings to default</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>Changes are saved automatically</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  row: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  rowText: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  rowSubtitle: { marginTop: 2, color: theme.colors.gray, fontSize: theme.fontSize.sm },
  footerNote: { textAlign: 'center', color: theme.colors.gray, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
});