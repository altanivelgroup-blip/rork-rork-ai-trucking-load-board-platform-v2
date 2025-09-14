import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { Bell, Mail, MessageSquare, ArrowLeft } from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [smsEnabled, setSmsEnabled] = useState<boolean>(false);

  return (
    <View style={styles.container} testID="notifications-screen">
      <Stack.Screen 
        options={{ 
          title: 'Notifications',
          headerLeft: () => (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
            >
              <ArrowLeft size={24} color={theme.colors.dark} />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Channels</Text>
        <View style={styles.card}>
          <Row icon={<Bell size={18} color={theme.colors.primary} />} title="Push Notifications" subtitle="Receive alerts on your device" value={pushEnabled} onChange={setPushEnabled} testID="notif-push" />
          <Row icon={<Mail size={18} color={theme.colors.primary} />} title="Email" subtitle="Get emails about important updates" value={emailEnabled} onChange={setEmailEnabled} testID="notif-email" />
          <Row icon={<MessageSquare size={18} color={theme.colors.primary} />} title="SMS" subtitle="Texts for critical events" value={smsEnabled} onChange={setSmsEnabled} testID="notif-sms" />
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.card}>
          <Row title="Load Updates" value={true} onChange={() => {}} disabled testID="notif-loads" />
          <Row title="Payments" value={true} onChange={() => {}} disabled testID="notif-payments" />
          <Row title="System" value={true} onChange={() => {}} disabled testID="notif-system" />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, title, subtitle, value, onChange, testID, disabled }: { icon?: React.ReactNode; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; testID?: string; disabled?: boolean; }) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowLeft}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled ?? false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  row: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  rowText: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  rowSubtitle: { marginTop: 2, color: theme.colors.gray, fontSize: theme.fontSize.sm },
});
