import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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
  const { user, userId, isAuthenticated, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Retry loading settings function
  const retryLoadSettings = useCallback(async () => {
    if (!userId) {
      console.warn('No user to retry loading settings for');
      return;
    }
    
    console.log('[NotificationSettings] Retry loading notification settings');
    setError(null);
    setIsLoading(true);
    
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      
      const unsubscribe = onSnapshot(docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as NotificationSettings;
            console.log('[NotificationSettings] Retry loaded settings:', data);
            setSettings(data);
          } else {
            console.log('[NotificationSettings] No settings found on retry, using defaults');
            setSettings(defaultSettings);
          }
          setIsLoading(false);
        },
        (error: any) => {
          const errorMessage = error && typeof error === 'object' && error.message ? error.message : 'Unknown error';
          console.error('[NotificationSettings] Retry error:', errorMessage);
          setError('Authentication required. Please sign in to access notification settings.');
          setSettings(defaultSettings);
          setIsLoading(false);
        }
      );
      
      // Clean up listener after a short time for retry
      setTimeout(() => unsubscribe(), 5000);
    } catch (error) {
      console.warn('[NotificationSettings] Retry failed:', error);
      setError('Retry failed. Please try again.');
      setIsLoading(false);
    }
  }, [userId]);

  // Save settings to Firestore
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    // Input validation
    if (!newSettings || typeof newSettings !== 'object') {
      console.warn('Invalid notification settings provided');
      return false;
    }
    
    if (!userId) {
      console.warn('No authenticated user, cannot save notification settings');
      return false;
    }
    
    setIsSaving(true);
    try {
      console.log('Saving notification settings for Firebase user:', userId);
      const docRef = doc(db, 'notificationSettings', userId);
      await setDoc(docRef, {
        ...newSettings,
        updatedAt: new Date(),
        userId: userId,
      });
      
      console.log('Profile enhanced - Notification settings saved');
      return true;
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      
      // Handle specific Firebase errors gracefully
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied - user may not be properly authenticated');
        setError('Authentication required. Please sign in to save notification settings.');
      } else if (error?.code === 'unavailable') {
        console.warn('Firestore temporarily unavailable - cannot save settings');
        setError('Service unavailable. Please try again later.');
      } else {
        console.warn('Firestore error - cannot save settings:', error?.code);
        setError(`Save failed: ${error?.code || 'unknown error'}`);
      }
      
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

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

  // Load settings when user authentication changes
  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let isMounted = true;
    
    // Wait for auth to be ready and user to be authenticated
    if (authLoading) {
      console.log('[NotificationSettings] Waiting for auth to complete...');
      return;
    }
    
    if (!isAuthenticated || !userId) {
      console.log('[NotificationSettings] No authenticated user, using default settings');
      setSettings(defaultSettings);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    console.log('[NotificationSettings] Loading settings for authenticated user:', userId);
    setError(null);
    
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      
      unsubscribeSettings = onSnapshot(docRef, 
        (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            const data = docSnap.data() as NotificationSettings;
            console.log('[NotificationSettings] Loaded settings:', data);
            setSettings(data);
          } else {
            console.log('[NotificationSettings] No settings found, using defaults');
            setSettings(defaultSettings);
          }
          setIsLoading(false);
        },
        (error: any) => {
          if (!isMounted) return;
          const errorMessage = error && typeof error === 'object' && error.message ? error.message : 'Unknown error';
          console.error('[NotificationSettings] Error loading settings:', errorMessage);
          
          if (error?.code === 'permission-denied') {
            console.warn('[NotificationSettings] Permission denied - authentication issue');
            setError('Authentication required. Please sign in to access notification settings.');
          } else if (error?.code === 'unavailable') {
            console.warn('[NotificationSettings] Firestore temporarily unavailable');
            setError('Service temporarily unavailable. Using default settings.');
          } else {
            console.warn('[NotificationSettings] Firestore error:', error?.code);
            setError(`Using default settings due to: ${error?.code || 'unknown error'}`);
          }
          
          setSettings(defaultSettings);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.warn('[NotificationSettings] Failed to set up listener:', error);
      if (isMounted) {
        setSettings(defaultSettings);
        setIsLoading(false);
        setError('Failed to load notification settings. Using defaults.');
      }
    }
    
    return () => {
      isMounted = false;
      if (unsubscribeSettings) {
        unsubscribeSettings();
      }
    };
  }, [authLoading, isAuthenticated, userId]);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    retryLoadSettings,
    updateChannel,
    updateCategory,
    saveSettings,
  };
}