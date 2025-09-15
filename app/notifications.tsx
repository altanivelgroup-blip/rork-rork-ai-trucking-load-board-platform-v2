import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { Bell, Mail, MessageSquare, ArrowLeft } from 'lucide-react-native';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useToast } from '@/components/Toast';

export default function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { settings, isLoading, isSaving, error, retryLoadSettings, updateChannel, updateCategory } = useNotificationSettings();
  
  const handleChannelToggle = async (channel: 'push' | 'email' | 'sms', value: boolean) => {
    // Validate inputs
    if (!channel || typeof channel !== 'string' || !['push', 'email', 'sms'].includes(channel)) {
      console.warn('Invalid channel provided');
      return;
    }
    if (typeof value !== 'boolean') {
      console.warn('Invalid value provided');
      return;
    }
    
    const success = await updateChannel(channel, value);
    if (success) {
      toast.show(`Toggle updated - ${channel.charAt(0).toUpperCase() + channel.slice(1)} alerts ${value ? 'enabled' : 'disabled'}`, 'success');
    } else {
      toast.show('Failed to update notification settings', 'error');
    }
  };
  
  const handleCategoryToggle = async (category: 'loadUpdates' | 'payments' | 'system', value: boolean) => {
    // Validate inputs
    if (!category || typeof category !== 'string' || !['loadUpdates', 'payments', 'system'].includes(category)) {
      console.warn('Invalid category provided');
      return;
    }
    if (typeof value !== 'boolean') {
      console.warn('Invalid value provided');
      return;
    }
    
    const success = await updateCategory(category, value);
    if (success) {
      const categoryName = category === 'loadUpdates' ? 'Load Updates' : category === 'payments' ? 'Payments' : 'System';
      toast.show(`Toggle updated - ${categoryName} alerts ${value ? 'enabled' : 'disabled'}`, 'success');
    } else {
      toast.show('Failed to update notification settings', 'error');
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen options={{ title: 'Notifications' }} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryLoadSettings}>
              <Text style={styles.retryButtonText}>Permissions fixed - Retry loading</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

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
                  router.replace('/dashboard');
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
          <Row 
            icon={<Bell size={18} color={theme.colors.primary} />} 
            title="Push Notifications" 
            subtitle="Receive alerts on your device" 
            value={settings.channels.push} 
            onChange={(value) => handleChannelToggle('push', value)} 
            testID="notif-push"
            disabled={isSaving}
          />
          <Row 
            icon={<Mail size={18} color={theme.colors.primary} />} 
            title="Email" 
            subtitle="Get emails about important updates" 
            value={settings.channels.email} 
            onChange={(value) => handleChannelToggle('email', value)} 
            testID="notif-email"
            disabled={isSaving}
          />
          <Row 
            icon={<MessageSquare size={18} color={theme.colors.primary} />} 
            title="SMS" 
            subtitle="Texts for critical events" 
            value={settings.channels.sms} 
            onChange={(value) => handleChannelToggle('sms', value)} 
            testID="notif-sms"
            disabled={isSaving}
          />
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.card}>
          <Row 
            title="Load Updates" 
            subtitle="Notifications about load status changes" 
            value={settings.categories.loadUpdates} 
            onChange={(value) => handleCategoryToggle('loadUpdates', value)} 
            testID="notif-loads"
            disabled={isSaving}
          />
          <Row 
            title="Payments" 
            subtitle="Payment confirmations and updates" 
            value={settings.categories.payments} 
            onChange={(value) => handleCategoryToggle('payments', value)} 
            testID="notif-payments"
            disabled={isSaving}
          />
          <Row 
            title="System" 
            subtitle="App updates and maintenance notices" 
            value={settings.categories.system} 
            onChange={(value) => handleCategoryToggle('system', value)} 
            testID="notif-system"
            disabled={isSaving}
          />
        </View>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryLoadSettings}>
              <Text style={styles.retryButtonText}>Permissions fixed - Retry loading</Text>
            </TouchableOpacity>
          </View>
        )}
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
  loadingContainer: { justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
  loadingText: { fontSize: theme.fontSize.md, color: theme.colors.gray },
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
  errorContainer: { marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: '#FEF2F2', borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: theme.fontSize.sm, color: '#DC2626', marginBottom: theme.spacing.sm },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md },
  retryButtonText: { color: theme.colors.card, fontSize: theme.fontSize.sm, fontWeight: '600', textAlign: 'center' },
});
