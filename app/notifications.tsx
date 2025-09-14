import React, { useCallback, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Bell, Mail, MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { settings, isLoading, error, updateChannel, updateCategory } = useNotifications();
  const toast = useToast();

  useEffect(() => {
    if (error) {
      toast.show(error, 'error');
    }
  }, [error, toast]);

  const handleChannelToggle = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
    if (!channel || typeof enabled !== 'boolean') return;
    console.log('[Notifications] Toggle updated - Channel:', channel, 'enabled:', enabled);
    await updateChannel(channel, enabled);
    toast.show(`${channel} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
  }, [updateChannel, toast]);

  const handleCategoryToggle = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
    if (!category || typeof enabled !== 'boolean') return;
    console.log('[Notifications] Toggle updated - Category:', category, 'enabled:', enabled);
    await updateCategory(category, enabled);
    toast.show(`${category} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
  }, [updateCategory, toast]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ title: 'Notifications', headerShown: false }} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to manage notifications</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="notifications-screen">
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
                  router.push('/settings');
                }
              }}
            >
              <ArrowLeft size={24} color={theme.colors.dark} />
            </TouchableOpacity>
          )
        }} 
      />
      
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notification settings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <View style={styles.card}>
            <Row 
              icon={<Bell size={18} color={theme.colors.primary} />} 
              title="Push Notifications" 
              subtitle="Receive alerts on your device" 
              value={settings.channels.push} 
              onChange={(enabled) => handleChannelToggle('push', enabled)} 
              testID="notif-push" 
            />
            <Row 
              icon={<Mail size={18} color={theme.colors.primary} />} 
              title="Email" 
              subtitle="Get emails about important updates" 
              value={settings.channels.email} 
              onChange={(enabled) => handleChannelToggle('email', enabled)} 
              testID="notif-email" 
            />
            <Row 
              icon={<MessageSquare size={18} color={theme.colors.primary} />} 
              title="SMS" 
              subtitle="Texts for critical events" 
              value={settings.channels.sms} 
              onChange={(enabled) => handleChannelToggle('sms', enabled)} 
              testID="notif-sms" 
            />
          </View>

          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.card}>
            <Row 
              title="Load Updates" 
              subtitle="Notifications about load status changes"
              value={settings.categories.loadUpdates} 
              onChange={(enabled) => handleCategoryToggle('loadUpdates', enabled)} 
              testID="notif-loads" 
            />
            <Row 
              title="Payments" 
              subtitle="Payment confirmations and updates"
              value={settings.categories.payments} 
              onChange={(enabled) => handleCategoryToggle('payments', enabled)} 
              testID="notif-payments" 
            />
            <Row 
              title="System" 
              subtitle="App updates and maintenance notices"
              value={settings.categories.system} 
              onChange={(enabled) => handleCategoryToggle('system', enabled)} 
              testID="notif-system" 
            />
          </View>
          
          <View style={styles.successIndicator}>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text style={styles.successText}>Settings are automatically saved</Text>
          </View>
        </ScrollView>
      )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.error,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.success + '20',
  },
  successText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
});
