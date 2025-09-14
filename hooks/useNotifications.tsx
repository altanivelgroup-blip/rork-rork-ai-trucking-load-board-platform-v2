import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { trpc } from '@/lib/trpc';

export interface NotificationSettings {
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  categories: {
    loadUpdates: boolean;
    payments: boolean;
    system: boolean;
  };
}

interface NotificationState {
  settings: NotificationSettings;
  isLoading: boolean;
  error: string | null;
  updateChannel: (channel: 'push' | 'email' | 'sms', enabled: boolean) => Promise<void>;
  updateCategory: (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: NotificationSettings = {
  channels: {
    push: true,
    email: true,
    sms: false,
  },
  categories: {
    loadUpdates: true,
    payments: true,
    system: true,
  },
};

export const [NotificationProvider, useNotifications] = createContextHook<NotificationState>(() => {
  const { userId, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = trpc.notifications.getSettings.useQuery(
    { userId: userId || '' },
    { 
      enabled: !!userId && isAuthenticated,
      refetchOnWindowFocus: false,
    }
  );

  const updateChannelMutation = trpc.notifications.updateChannel.useMutation();
  const updateCategoryMutation = trpc.notifications.updateCategory.useMutation();

  useEffect(() => {
    if (settingsQuery.data?.success && settingsQuery.data.settings) {
      console.log('[Notifications] Settings loaded:', settingsQuery.data.settings);
      setSettings(settingsQuery.data.settings);
      setError(null);
    } else if (settingsQuery.error) {
      console.error('[Notifications] Error loading settings:', settingsQuery.error);
      setError(settingsQuery.error.message);
    }
    setIsLoading(settingsQuery.isLoading);
  }, [settingsQuery.data, settingsQuery.error, settingsQuery.isLoading]);

  const updateChannel = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
    if (!userId) {
      console.warn('[Notifications] No user ID available');
      return;
    }

    if (!channel || typeof enabled !== 'boolean') {
      console.warn('[Notifications] Invalid parameters');
      return;
    }

    try {
      console.log('[Notifications] Updating channel:', channel, 'to', enabled);
      
      const optimisticSettings = {
        ...settings,
        channels: {
          ...settings.channels,
          [channel]: enabled,
        },
      };
      setSettings(optimisticSettings);

      const result = await updateChannelMutation.mutateAsync({
        userId,
        channel,
        enabled,
      });

      if (result.success) {
        console.log('[Notifications] ✅ Channel updated:', result.message);
        if (result.settings) {
          setSettings(result.settings);
        }
      } else {
        console.error('[Notifications] Failed to update channel:', result.error);
        setSettings(settings);
        setError(result.error || 'Failed to update channel');
      }
    } catch (err: any) {
      console.error('[Notifications] Error updating channel:', err);
      setSettings(settings);
      setError(err.message || 'Failed to update channel');
    }
  }, [userId, settings, updateChannelMutation]);

  const updateCategory = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
    if (!userId) {
      console.warn('[Notifications] No user ID available');
      return;
    }

    if (!category || typeof enabled !== 'boolean') {
      console.warn('[Notifications] Invalid parameters');
      return;
    }

    try {
      console.log('[Notifications] Updating category:', category, 'to', enabled);
      
      const optimisticSettings = {
        ...settings,
        categories: {
          ...settings.categories,
          [category]: enabled,
        },
      };
      setSettings(optimisticSettings);

      const result = await updateCategoryMutation.mutateAsync({
        userId,
        category,
        enabled,
      });

      if (result.success) {
        console.log('[Notifications] ✅ Category updated:', result.message);
        if (result.settings) {
          setSettings(result.settings);
        }
      } else {
        console.error('[Notifications] Failed to update category:', result.error);
        setSettings(settings);
        setError(result.error || 'Failed to update category');
      }
    } catch (err: any) {
      console.error('[Notifications] Error updating category:', err);
      setSettings(settings);
      setError(err.message || 'Failed to update category');
    }
  }, [userId, settings, updateCategoryMutation]);

  const refreshSettings = useCallback(async () => {
    if (userId) {
      await settingsQuery.refetch();
    }
  }, [userId, settingsQuery]);

  const value = useMemo<NotificationState>(() => ({
    settings,
    isLoading,
    error,
    updateChannel,
    updateCategory,
    refreshSettings,
  }), [settings, isLoading, error, updateChannel, updateCategory, refreshSettings]);

  return value;
});