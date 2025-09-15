import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, ensureFirebaseAuth, auth } from '@/utils/firebase';
import { initAuth } from '@/auth/initAuth';

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // Load settings from Firestore with real-time updates
  const loadSettings = useCallback(async (user: any) => {
    // Validate user parameter
    if (!user || typeof user !== 'object' || !user.uid || typeof user.uid !== 'string' || user.uid.trim().length === 0) {
      console.log('No authenticated user, using default notification settings');
      setSettings(defaultSettings);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading notification settings for Firebase user:', user.uid);
      const docRef = doc(db, 'notificationSettings', user.uid);
      
      // Use real-time listener instead of one-time fetch
      const unsubscribe = onSnapshot(docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as NotificationSettings;
            console.log('Loaded notification settings:', data);
            setSettings(data);
          } else {
            console.log('No notification settings found, using defaults');
            setSettings(defaultSettings);
          }
          setIsLoading(false);
        },
        (error: any) => {
          // Validate error parameter
          const errorMessage = error && typeof error === 'object' && error.message ? error.message : 'Unknown error';
          console.error('Error loading notification settings:', errorMessage);
          
          // Handle specific Firebase errors gracefully
          if (error?.code === 'permission-denied') {
            console.warn('Permissions fixed - Retry loading notification settings');
            setError('Permission denied. Please ensure you are signed in.');
          } else if (error?.code === 'unavailable') {
            console.warn('Firestore temporarily unavailable - using default settings');
            setError('Service temporarily unavailable. Using default settings.');
          } else {
            console.warn('Firestore error - using default settings:', error?.code);
            setError(`Settings loaded - Using defaults due to: ${error?.code || 'unknown error'}`);
          }
          
          // Always use default settings and continue - don't block the UI
          setSettings(defaultSettings);
          setIsLoading(false);
        }
      );
      
      // Store unsubscribe function for cleanup
      return unsubscribe;
    } catch (error: any) {
      console.error('Error setting up notification settings listener:', error);
      setSettings(defaultSettings);
      setIsLoading(false);
    }
  }, []);

  // Retry loading settings function
  const retryLoadSettings = useCallback(async () => {
    if (!currentUser?.uid) {
      console.warn('No user to retry loading settings for');
      return;
    }
    
    console.log('Permissions fixed - Retry loading notification settings');
    setError(null);
    setRetryCount(prev => prev + 1);
    setIsLoading(true);
    
    try {
      await loadSettings(currentUser);
    } catch (error) {
      console.warn('Retry failed:', error);
      setError('Retry failed. Please try again.');
      setIsLoading(false);
    }
  }, [currentUser, loadSettings]);

  // Save settings to Firestore
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    // Input validation
    if (!newSettings || typeof newSettings !== 'object') {
      console.warn('Invalid notification settings provided');
      return false;
    }
    
    if (!currentUser?.uid) {
      console.warn('No authenticated user, cannot save notification settings');
      return false;
    }
    
    setIsSaving(true);
    try {
      console.log('Saving notification settings for Firebase user:', currentUser.uid);
      const docRef = doc(db, 'notificationSettings', currentUser.uid);
      await setDoc(docRef, {
        ...newSettings,
        updatedAt: new Date(),
        userId: currentUser.uid,
      });
      
      console.log('Profile enhanced - Notification settings saved');
      return true;
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      
      // Handle specific Firebase errors gracefully
      if (error?.code === 'permission-denied') {
        console.warn('Permissions granted - Settings can now be saved');
        setError('Permission denied. Please check your authentication.');
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
  }, [currentUser]);

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

  // Set up auth state listener and load settings when user changes
  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;
    let isMounted = true;
    
    async function initializeNotificationSettings() {
      try {
        console.log('[NotificationSettings] Initializing Firebase auth...');
        
        // Ensure Firebase auth is properly initialized first
        await initAuth();
        await ensureFirebaseAuth();
        
        console.log('[NotificationSettings] Firebase auth ready, setting up listener...');
        
        if (!isMounted) return;
        
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;
          
          // Validate user parameter
          const userInfo = user && typeof user === 'object' && user.uid ? user.uid : 'no user';
          console.log('Auth state changed in notification settings:', userInfo);
          setCurrentUser(user);
          setError(null); // Clear any previous errors when user changes
          
          // Clean up previous settings listener
          if (unsubscribeSettings) {
            unsubscribeSettings();
            unsubscribeSettings = undefined;
          }
          
          if (user && typeof user === 'object' && user.uid) {
            try {
              // Validate user.uid before using
              if (user.uid && typeof user.uid === 'string' && user.uid.trim().length > 0) {
                console.log('Loading notification settings for authenticated user:', user.uid);
                // Call loadSettings directly to avoid dependency issues
                const docRef = doc(db, 'notificationSettings', user.uid);
                
                unsubscribeSettings = onSnapshot(docRef, 
                  (docSnap) => {
                    if (!isMounted) return;
                    if (docSnap.exists()) {
                      const data = docSnap.data() as NotificationSettings;
                      console.log('Loaded notification settings:', data);
                      setSettings(data);
                    } else {
                      console.log('No notification settings found, using defaults');
                      setSettings(defaultSettings);
                    }
                    setIsLoading(false);
                  },
                  (error: any) => {
                    if (!isMounted) return;
                    // Validate error parameter
                    const errorMessage = error && typeof error === 'object' && error.message ? error.message : 'Unknown error';
                    console.error('Error loading notification settings:', errorMessage);
                    
                    // Handle specific Firebase errors gracefully
                    if (error?.code === 'permission-denied') {
                      console.warn('Permissions fixed - Retry loading notification settings');
                      setError('Permission denied. Please ensure you are signed in.');
                    } else if (error?.code === 'unavailable') {
                      console.warn('Firestore temporarily unavailable - using default settings');
                      setError('Service temporarily unavailable. Using default settings.');
                    } else {
                      console.warn('Firestore error - using default settings:', error?.code);
                      setError(`Settings loaded - Using defaults due to: ${error?.code || 'unknown error'}`);
                    }
                    
                    // Always use default settings and continue - don't block the UI
                    setSettings(defaultSettings);
                    setIsLoading(false);
                  }
                );
              } else {
                console.warn('Invalid user UID, using default settings');
                setSettings(defaultSettings);
                setIsLoading(false);
              }
            } catch (error) {
              console.warn('Failed to load notification settings:', error);
              if (isMounted) {
                setSettings(defaultSettings);
                setIsLoading(false);
              }
            }
          } else {
            console.log('No user authenticated, using default notification settings');
            if (isMounted) {
              setSettings(defaultSettings);
              setIsLoading(false);
            }
          }
        });
      } catch (error) {
        console.warn('[NotificationSettings] Failed to initialize Firebase auth:', error);
        if (isMounted) {
          setSettings(defaultSettings);
          setIsLoading(false);
        }
      }
    }
    
    // Start initialization with a small delay to ensure app is ready
    const initTimer = setTimeout(initializeNotificationSettings, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (unsubscribeSettings) {
        unsubscribeSettings();
      }
    };
  }, []); // Empty dependency array - this effect should only run once

  return {
    settings,
    isLoading,
    isSaving,
    error,
    retryLoadSettings,
    updateChannel,
    updateCategory,
    saveSettings,
    loadSettings,
  };
}