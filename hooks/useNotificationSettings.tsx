import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';

type NotificationChannels = {
  push: boolean;
  email: boolean;
  sms: boolean;
};

type NotificationCategories = {
  loadUpdates: boolean;
  payments: boolean;
  system: boolean;
};

type NotificationSettings = {
  channels: NotificationChannels;
  categories: NotificationCategories;
};

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

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load settings from Firestore
  const loadSettings = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading notification settings for user:', user.id);
      const docRef = doc(db, 'notificationSettings', user.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as NotificationSettings;
        console.log('Loaded notification settings:', data);
        setSettings(data);
      } else {
        console.log('No notification settings found, using defaults');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Save settings to Firestore
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    if (!user?.id) {
      console.warn('Cannot save notification settings: no user ID');
      return false;
    }

    setIsSaving(true);
    try {
      console.log('Saving notification settings:', newSettings);
      const docRef = doc(db, 'notificationSettings', user.id);
      await setDoc(docRef, {
        ...newSettings,
        updatedAt: new Date(),
        userId: user.id,
      });
      
      setSettings(newSettings);
      console.log('Profile enhanced - Notification settings saved');
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  // Update channel setting
  const updateChannel = useCallback(async (channel: keyof NotificationChannels, value: boolean) => {
    const newSettings = {
      ...settings,
      channels: {
        ...settings.channels,
        [channel]: value,
      },
    };
    
    const success = await saveSettings(newSettings);
    if (success) {
      console.log(`Profile enhanced - ${channel} notifications ${value ? 'enabled' : 'disabled'}`);
    }
    return success;
  }, [settings, saveSettings]);

  // Update category setting
  const updateCategory = useCallback(async (category: keyof NotificationCategories, value: boolean) => {
    const newSettings = {
      ...settings,
      categories: {
        ...settings.categories,
        [category]: value,
      },
    };
    
    const success = await saveSettings(newSettings);
    if (success) {
      console.log(`Profile enhanced - ${category} alerts ${value ? 'enabled' : 'disabled'}`);
    }
    return success;
  }, [settings, saveSettings]);

  // Load settings when user changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    updateChannel,
    updateCategory,
    saveSettings,
    loadSettings,
  };
}