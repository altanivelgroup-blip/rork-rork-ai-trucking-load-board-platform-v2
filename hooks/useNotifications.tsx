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
      retry: 1,
      retryDelay: 2000,
      staleTime: 5 * 60 * 1000,
      onError: (error) => {
        console.error('[Notifications] Query error:', error);
        setError(error.message || 'Failed to load notification settings');
      },
    }
  );

  const updateChannelMutation = trpc.notifications.updateChannel.useMutation();
  const updateCategoryMutation = trpc.notifications.updateCategory.useMutation();

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      console.log('[Notifications] User not authenticated, using defaults');
      setSettings(defaultSettings);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (settingsQuery.data?.success && settingsQuery.data.settings) {
      console.log('[Notifications] Settings loaded:', settingsQuery.data.settings);
      setSettings(prev => {
        const newSettings = settingsQuery.data.settings;
        if (JSON.stringify(prev) !== JSON.stringify(newSettings)) {
          return newSettings;
        }
        return prev;
      });
      setError(null);
    } else if (settingsQuery.error) {
      console.error('[Notifications] Error loading settings:', settingsQuery.error);
      setError(settingsQuery.error.message || 'Failed to load notification settings');
    } else if (settingsQuery.data && !settingsQuery.data.success) {
      console.warn('[Notifications] Query returned unsuccessful result:', settingsQuery.data);
      setError(settingsQuery.data.error || 'Failed to load notification settings');
    }
  }, [settingsQuery.data, settingsQuery.error, isAuthenticated, userId]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      setIsLoading(settingsQuery.isLoading);
    } else {
      setIsLoading(false);
    }
  }, [settingsQuery.isLoading, isAuthenticated, userId]);

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
      
      // Optimistic update
      setSettings(prev => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: enabled,
        },
      }));

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
        // Revert optimistic update
        setSettings(prev => ({
          ...prev,
          channels: {
            ...prev.channels,
            [channel]: !enabled,
          },
        }));
        setError(result.error || 'Failed to update channel');
      }
    } catch (err: any) {
      console.error('[Notifications] Error updating channel:', err);
      // Revert optimistic update
      setSettings(prev => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: !enabled,
        },
      }));
      setError(err.message || 'Failed to update channel');
    }
  }, [userId, updateChannelMutation]);

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
      
      // Optimistic update
      setSettings(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: enabled,
        },
      }));

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
        // Revert optimistic update
        setSettings(prev => ({
          ...prev,
          categories: {
            ...prev.categories,
            [category]: !enabled,
          },
        }));
        setError(result.error || 'Failed to update category');
      }
    } catch (err: any) {
      console.error('[Notifications] Error updating category:', err);
      // Revert optimistic update
      setSettings(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: !enabled,
        },
      }));
      setError(err.message || 'Failed to update category');
    }
  }, [userId, updateCategoryMutation]);

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