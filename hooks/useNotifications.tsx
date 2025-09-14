import { useCallback, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

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

const STORAGE_KEY = 'notification_settings';

export function useNotifications(): NotificationState {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // tRPC mutations
  const updateChannelMutation = trpc.notifications.updateChannel.useMutation();
  const updateCategoryMutation = trpc.notifications.updateCategory.useMutation();

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalSettings({
          channels: {
            push: parsed.channels?.push ?? defaultSettings.channels.push,
            email: parsed.channels?.email ?? defaultSettings.channels.email,
            sms: parsed.channels?.sms ?? defaultSettings.channels.sms,
          },
          categories: {
            loadUpdates: parsed.categories?.loadUpdates ?? defaultSettings.categories.loadUpdates,
            payments: parsed.categories?.payments ?? defaultSettings.categories.payments,
            system: parsed.categories?.system ?? defaultSettings.categories.system,
          },
        });
        console.log('[Notifications] Loaded settings from storage:', parsed);
      } else {
        console.log('[Notifications] No stored settings, using defaults');
        setLocalSettings(defaultSettings);
      }
    } catch (err: any) {
      console.error('[Notifications] Error loading settings:', err);
      setError('Failed to load notification settings');
      setLocalSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (settings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('[Notifications] Settings saved to storage:', settings);
    } catch (err: any) {
      console.error('[Notifications] Error saving settings:', err);
      throw new Error('Failed to save notification settings');
    }
  }, []);

  const updateChannel = useCallback(async (channel: 'push' | 'email' | 'sms', enabled: boolean) => {
    try {
      console.log('[Notifications] Updating channel:', channel, 'to', enabled);
      setError(null);
      
      const updatedSettings = {
        ...localSettings,
        channels: {
          ...localSettings.channels,
          [channel]: enabled,
        },
      };
      
      // Update local state immediately for optimistic UI
      setLocalSettings(updatedSettings);
      
      // Save to AsyncStorage
      await saveSettings(updatedSettings);
      
      // Try to sync with backend if user is available
      if (user?.uid) {
        try {
          await updateChannelMutation.mutateAsync({
            userId: user.uid,
            channel,
            enabled,
          });
          console.log('[Notifications] ✅ Channel synced with backend');
        } catch (backendError: any) {
          console.warn('[Notifications] Backend sync failed, but local update succeeded:', backendError);
          // Don't throw here - local update succeeded
        }
      }
      
      console.log('[Notifications] ✅ Channel updated successfully');
    } catch (err: any) {
      console.error('[Notifications] Error updating channel:', err);
      setError(err.message || 'Failed to update channel');
      // Revert on error
      setLocalSettings(prev => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: !enabled,
        },
      }));
      throw err;
    }
  }, [localSettings, saveSettings, user?.uid, updateChannelMutation]);

  const updateCategory = useCallback(async (category: 'loadUpdates' | 'payments' | 'system', enabled: boolean) => {
    try {
      console.log('[Notifications] Updating category:', category, 'to', enabled);
      setError(null);
      
      const updatedSettings = {
        ...localSettings,
        categories: {
          ...localSettings.categories,
          [category]: enabled,
        },
      };
      
      // Update local state immediately for optimistic UI
      setLocalSettings(updatedSettings);
      
      // Save to AsyncStorage
      await saveSettings(updatedSettings);
      
      // Try to sync with backend if user is available
      if (user?.uid) {
        try {
          await updateCategoryMutation.mutateAsync({
            userId: user.uid,
            category,
            enabled,
          });
          console.log('[Notifications] ✅ Category synced with backend');
        } catch (backendError: any) {
          console.warn('[Notifications] Backend sync failed, but local update succeeded:', backendError);
          // Don't throw here - local update succeeded
        }
      }
      
      console.log('[Notifications] ✅ Category updated successfully');
    } catch (err: any) {
      console.error('[Notifications] Error updating category:', err);
      setError(err.message || 'Failed to update category');
      // Revert on error
      setLocalSettings(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: !enabled,
        },
      }));
      throw err;
    }
  }, [localSettings, saveSettings, user?.uid, updateCategoryMutation]);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const settings = useMemo(() => {
    return localSettings;
  }, [localSettings]);

  return {
    settings,
    isLoading: isLoading || updateChannelMutation.isLoading || updateCategoryMutation.isLoading,
    error,
    updateChannel,
    updateCategory,
    refreshSettings,
  };
}