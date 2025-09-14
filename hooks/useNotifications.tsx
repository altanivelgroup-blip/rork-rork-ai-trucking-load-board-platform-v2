import { useCallback, useState } from 'react';
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

export function useNotifications(): NotificationState {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = trpc.notifications.getSettings.useQuery(
    { userId: 'demo-user' },
    { 
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      onSuccess: (data) => {
        if (data?.success && data.settings) {
          setSettings(data.settings);
          setError(null);
        } else if (data && !data.success) {
          setError(data.error || 'Failed to load notification settings');
        }
      },
      onError: (error) => {
        console.error('[Notifications] Query error:', error);
        setError(error.message || 'Failed to load notification settings');
      },
    }
  );

  const updateChannelMutation = trpc.notifications.updateChannel.useMutation();
  const updateCategoryMutation = trpc.notifications.updateCategory.useMutation();

  const updateChannel = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
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
        userId: 'demo-user',
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
  }, [updateChannelMutation]);

  const updateCategory = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
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
        userId: 'demo-user',
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
  }, [updateCategoryMutation]);

  const refreshSettings = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  return {
    settings,
    isLoading: settingsQuery.isLoading,
    error,
    updateChannel,
    updateCategory,
    refreshSettings,
  };
}