import { useCallback, useMemo } from 'react';
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
  const settingsQuery = trpc.notifications.getSettings.useQuery(
    { userId: 'demo-user' },
    { 
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  );

  const updateChannelMutation = trpc.notifications.updateChannel.useMutation({
    onSuccess: () => {
      settingsQuery.refetch();
    },
  });
  
  const updateCategoryMutation = trpc.notifications.updateCategory.useMutation({
    onSuccess: () => {
      settingsQuery.refetch();
    },
  });

  const updateChannel = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
    try {
      console.log('[Notifications] Updating channel:', channel, 'to', enabled);
      
      const result = await updateChannelMutation.mutateAsync({
        userId: 'demo-user',
        channel,
        enabled,
      });

      if (!result.success) {
        console.error('[Notifications] Failed to update channel:', result.error);
        throw new Error(result.error || 'Failed to update channel');
      }
      
      console.log('[Notifications] ✅ Channel updated:', result.message);
    } catch (err: any) {
      console.error('[Notifications] Error updating channel:', err);
      throw err;
    }
  }, [updateChannelMutation]);

  const updateCategory = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
    try {
      console.log('[Notifications] Updating category:', category, 'to', enabled);
      
      const result = await updateCategoryMutation.mutateAsync({
        userId: 'demo-user',
        category,
        enabled,
      });

      if (!result.success) {
        console.error('[Notifications] Failed to update category:', result.error);
        throw new Error(result.error || 'Failed to update category');
      }
      
      console.log('[Notifications] ✅ Category updated:', result.message);
    } catch (err: any) {
      console.error('[Notifications] Error updating category:', err);
      throw err;
    }
  }, [updateCategoryMutation]);

  const refreshSettings = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const settings = useMemo(() => {
    if (settingsQuery.data?.success && settingsQuery.data.settings) {
      return settingsQuery.data.settings;
    }
    return defaultSettings;
  }, [settingsQuery.data]);

  const error = useMemo(() => {
    if (settingsQuery.error) {
      return settingsQuery.error.message;
    }
    if (settingsQuery.data && !settingsQuery.data.success) {
      return settingsQuery.data.error || 'Failed to load notification settings';
    }
    return null;
  }, [settingsQuery.error, settingsQuery.data]);

  return {
    settings,
    isLoading: settingsQuery.isLoading,
    error,
    updateChannel,
    updateCategory,
    refreshSettings,
  };
}