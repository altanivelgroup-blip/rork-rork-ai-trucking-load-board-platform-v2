import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
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
  const isUpdatingRef = useRef<boolean>(false);
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  
  const settingsQuery = trpc.notifications.getSettings.useQuery(
    { userId: 'demo-user' },
    { 
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
      enabled: !isUpdatingRef.current,
    }
  );

  useEffect(() => {
    if (settingsQuery.data?.success && settingsQuery.data.settings) {
      setLocalSettings(settingsQuery.data.settings);
    }
    if (settingsQuery.data || settingsQuery.error) {
      setHasInitialized(true);
    }
  }, [settingsQuery.data, settingsQuery.error]);

  const updateChannelMutation = trpc.notifications.updateChannel.useMutation();
  const updateCategoryMutation = trpc.notifications.updateCategory.useMutation();

  const updateChannel = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
    try {
      console.log('[Notifications] Updating channel:', channel, 'to', enabled);
      
      // Optimistically update local state
      setLocalSettings(prev => ({
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

      if (!result.success) {
        console.error('[Notifications] Failed to update channel:', result.error);
        // Revert optimistic update
        setLocalSettings(prev => ({
          ...prev,
          channels: {
            ...prev.channels,
            [channel]: !enabled,
          },
        }));
        throw new Error(result.error || 'Failed to update channel');
      }
      
      console.log('[Notifications] ✅ Channel updated:', result.message);
    } catch (err: any) {
      console.error('[Notifications] Error updating channel:', err);
      // Revert optimistic update on error
      setLocalSettings(prev => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: !enabled,
        },
      }));
      throw err;
    }
  }, [updateChannelMutation]);

  const updateCategory = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
    try {
      console.log('[Notifications] Updating category:', category, 'to', enabled);
      
      // Optimistically update local state
      setLocalSettings(prev => ({
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

      if (!result.success) {
        console.error('[Notifications] Failed to update category:', result.error);
        // Revert optimistic update
        setLocalSettings(prev => ({
          ...prev,
          categories: {
            ...prev.categories,
            [category]: !enabled,
          },
        }));
        throw new Error(result.error || 'Failed to update category');
      }
      
      console.log('[Notifications] ✅ Category updated:', result.message);
    } catch (err: any) {
      console.error('[Notifications] Error updating category:', err);
      // Revert optimistic update on error
      setLocalSettings(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: !enabled,
        },
      }));
      throw err;
    }
  }, [updateCategoryMutation]);

  const refreshSettings = useCallback(async () => {
    if (!isUpdatingRef.current) {
      await settingsQuery.refetch();
    }
  }, [settingsQuery]);

  const settings = useMemo(() => {
    return localSettings;
  }, [localSettings]);

  const error = useMemo(() => {
    if (updateChannelMutation.error) {
      return updateChannelMutation.error.message;
    }
    if (updateCategoryMutation.error) {
      return updateCategoryMutation.error.message;
    }
    if (settingsQuery.error) {
      return settingsQuery.error.message;
    }
    if (settingsQuery.data && !settingsQuery.data.success) {
      return settingsQuery.data.error || 'Failed to load notification settings';
    }
    return null;
  }, [settingsQuery.error, settingsQuery.data, updateChannelMutation.error, updateCategoryMutation.error]);

  return {
    settings,
    isLoading: (!hasInitialized && settingsQuery.isLoading) || updateChannelMutation.isLoading || updateCategoryMutation.isLoading,
    error,
    updateChannel,
    updateCategory,
    refreshSettings,
  };
}