import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Bell, Mail, MessageSquare, ArrowLeft, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';

function NotificationsScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, isLoading, error, updateChannel, updateCategory, refreshSettings } = useNotifications();
  const toast = useToast();
  const [hasShownError, setHasShownError] = useState<boolean>(false);

  console.log('[NotificationsScreen] Render - isLoading:', isLoading, 'error:', error);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    try {
      toast.show(message, type);
    } catch (err) {
      console.warn('[NotificationsScreen] Toast error:', err);
    }
  }, [toast]);

  useEffect(() => {
    if (error && !hasShownError) {
      console.error('[NotificationsScreen] Error:', error);
      showToast(error, 'error');
      setHasShownError(true);
    } else if (!error && hasShownError) {
      setHasShownError(false);
    }
  }, [error, showToast, hasShownError]);

  const handleChannelToggle = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
    if (!channel || typeof enabled !== 'boolean') return;
    
    console.log('[Notifications] Toggle updated - Channel:', channel, 'enabled:', enabled);
    try {
      await updateChannel(channel, enabled);
      showToast(`${channel} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: any) {
      console.error('[NotificationsScreen] Error updating channel:', err);
      const errorMsg = err?.message || 'Unknown error';
      showToast(`Failed to update ${channel} notifications: ${errorMsg}`, 'error');
    }
  }, [updateChannel, showToast]);

  const handleCategoryToggle = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
    if (!category || typeof enabled !== 'boolean') return;
    
    console.log('[Notifications] Toggle updated - Category:', category, 'enabled:', enabled);
    try {
      await updateCategory(category, enabled);
      showToast(`${category} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: any) {
      console.error('[NotificationsScreen] Error updating category:', err);
      const errorMsg = err?.message || 'Unknown error';
      showToast(`Failed to update ${category} notifications: ${errorMsg}`, 'error');
    }
  }, [updateCategory, showToast]);



  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="notifications-screen">
      <View style={styles.header}>
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notification settings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {error && (
            <View style={styles.errorBanner}>
              <AlertTriangle size={16} color={theme.colors.error} />
              <Text style={styles.errorText}>Settings saved locally</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={refreshSettings}
              >
                <RefreshCw 
                  size={16} 
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
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

export default function NotificationsScreen() {
  return (
    <ErrorBoundary>
      <NotificationsScreenContent />
    </ErrorBoundary>
  );
}

const Row = React.memo(function Row({ icon, title, subtitle, value, onChange, testID, disabled }: { icon?: React.ReactNode; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; testID?: string; disabled?: boolean; }) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowLeft}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled ?? false} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
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
  errorTextLarge: {
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '20',
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary + '20',
    marginLeft: theme.spacing.sm,
  },
});
