import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, ensureFirebaseAuth, auth } from '@/utils/firebase';

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
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load settings from Firestore
  const loadSettings = useCallback(async () => {
    try {
      // Ensure Firebase auth is working before accessing Firestore
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        console.warn('Firebase auth failed, using default notification settings');
        setSettings(defaultSettings);
        setIsLoading(false);
        return;
      }

      // Use Firebase Auth UID directly for Firestore document access
      const firebaseUid = auth?.currentUser?.uid;
      if (!firebaseUid) {
        console.warn('No authenticated Firebase user, using default notification settings');
        setSettings(defaultSettings);
        setIsLoading(false);
        return;
      }

      console.log('Loading notification settings for Firebase user:', firebaseUid);
      const docRef = doc(db, 'notificationSettings', firebaseUid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as NotificationSettings;
        console.log('Loaded notification settings:', data);
        setSettings(data);
      } else {
        console.log('No notification settings found, using defaults');
        setSettings(defaultSettings);
      }
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      
      // Handle specific Firebase errors
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied - user may not be properly authenticated');
        // Try to re-authenticate
        try {
          await ensureFirebaseAuth();
          console.log('Re-authentication successful, using default settings for now');
        } catch (reAuthError) {
          console.error('Re-authentication failed:', reAuthError);
        }
      }
      
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to Firestore
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    // Input validation
    if (!newSettings || typeof newSettings !== 'object') {
      console.warn('Invalid notification settings provided');
      return false;
    }
    
    setIsSaving(true);
    try {
      // Ensure Firebase auth is working before accessing Firestore
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        console.warn('Firebase auth failed, cannot save notification settings');
        setIsSaving(false);
        return false;
      }

      // Use Firebase Auth UID directly for Firestore document access
      const firebaseUid = auth?.currentUser?.uid;
      if (!firebaseUid) {
        console.warn('No authenticated Firebase user, cannot save notification settings');
        setIsSaving(false);
        return false;
      }

      console.log('Saving notification settings for Firebase user:', firebaseUid);
      const docRef = doc(db, 'notificationSettings', firebaseUid);
      await setDoc(docRef, {
        ...newSettings,
        updatedAt: new Date(),
        userId: firebaseUid,
      });
      
      setSettings(newSettings);
      console.log('Profile enhanced - Notification settings saved');
      return true;
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      
      // Handle specific Firebase errors
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied - user may not be properly authenticated');
        // Try to re-authenticate
        try {
          await ensureFirebaseAuth();
          console.log('Re-authentication successful, but save failed');
        } catch (reAuthError) {
          console.error('Re-authentication failed:', reAuthError);
        }
      }
      
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

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

  // Load settings when component mounts - with delay to ensure auth is ready
  useEffect(() => {
    // Add a small delay to ensure Firebase auth state is properly established
    const timer = setTimeout(() => {
      loadSettings();
    }, 500); // Increased delay to ensure Firebase auth is ready
    
    return () => clearTimeout(timer);
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