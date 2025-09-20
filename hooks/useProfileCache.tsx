import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Driver, Shipper, Admin } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ProfileCacheState {
  cachedProfile: Driver | Shipper | Admin | null;
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: boolean;
  syncProfile: () => Promise<void>;
  updateCachedProfile: (updates: Partial<Driver | Shipper | Admin>) => Promise<void>;
  validateExperience: (years: number) => Promise<{ valid: boolean; message: string }>;
}

const PROFILE_CACHE_KEY = 'profile:cache';
const PROFILE_SYNC_KEY = 'profile:pending_sync';
const LAST_SYNC_KEY = 'profile:last_sync';

export const [ProfileCacheProvider, useProfileCache] = createContextHook<ProfileCacheState>(() => {
  const { user, updateProfile } = useAuth();
  const { online } = useOnlineStatus();
  const isOnline = online;
  const [cachedProfile, setCachedProfile] = useState<Driver | Shipper | Admin | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);

  // Load cached profile on mount
  useEffect(() => {
    const loadCachedProfile = async () => {
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
        const pending = await AsyncStorage.getItem(PROFILE_SYNC_KEY);
        
        if (cached) {
          setCachedProfile(JSON.parse(cached));
          console.log('[ProfileCache] Loaded cached profile');
        }
        
        if (lastSync) {
          setLastSyncTime(new Date(lastSync));
        }
        
        setPendingChanges(!!pending);
      } catch (error) {
        console.error('[ProfileCache] Error loading cached profile:', error);
      }
    };

    loadCachedProfile();
  }, []);

  // Update cache when user profile changes
  useEffect(() => {
    if (user && user !== cachedProfile) {
      setCachedProfile(user);
      AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(user));
      console.log('[ProfileCache] Updated cache with new user profile');
    }
  }, [user, cachedProfile]);

  // Mock API for experience validation
  const validateExperience = useCallback(async (years: number): Promise<{ valid: boolean; message: string }> => {
    console.log('[ProfileCache] Validating experience:', years);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation logic
    if (years < 0) {
      return { valid: false, message: 'Experience cannot be negative' };
    }
    
    if (years > 50) {
      return { valid: false, message: 'Experience seems unusually high. Please verify.' };
    }
    
    if (years >= 10) {
      return { valid: true, message: 'Experienced driver - Premium rates available!' };
    }
    
    if (years >= 5) {
      return { valid: true, message: 'Good experience level verified' };
    }
    
    return { valid: true, message: 'Entry level experience verified' };
  }, []);

  const updateCachedProfile = useCallback(async (updates: Partial<Driver | Shipper | Admin>) => {
    console.log('[ProfileCache] 🚀 Starting profile update process...');
    console.log('[ProfileCache] Updates to apply:', JSON.stringify(updates, null, 2));
    
    if (!cachedProfile) {
      console.error('[ProfileCache] ❌ No cached profile found - cannot update');
      throw new Error('No cached profile found. Please refresh and try again.');
    }

    console.log('[ProfileCache] Current cached profile:', JSON.stringify(cachedProfile, null, 2));
    const updatedProfile = { ...cachedProfile, ...updates };
    console.log('[ProfileCache] Updated profile prepared:', JSON.stringify(updatedProfile, null, 2));
    
    setCachedProfile(updatedProfile);
    console.log('[ProfileCache] ✅ Local state updated');
    
    try {
      // Always update local cache first
      console.log('[ProfileCache] 💾 Saving to AsyncStorage...');
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile));
      console.log('[ProfileCache] ✅ AsyncStorage updated successfully');
      
      if (isOnline) {
        // If online, sync immediately
        console.log('[ProfileCache] 🌐 Online - syncing profile immediately to Firebase...');
        
        try {
          await updateProfile(updates);
          console.log('[ProfileCache] ✅ Firebase sync successful');
          
          const now = new Date();
          setLastSyncTime(now);
          await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
          await AsyncStorage.removeItem(PROFILE_SYNC_KEY);
          setPendingChanges(false);
          
          console.log('[ProfileCache] ✅ Profile fully synced - All systems updated');
          console.log('[ProfileCache] ✅ Local cache, Firebase, and sync status all updated');
        } catch (syncError: any) {
          console.error('[ProfileCache] ❌ Firebase sync failed:', syncError);
          console.log('[ProfileCache] 📝 Marking for offline sync...');
          
          // Mark for later sync if Firebase fails
          await AsyncStorage.setItem(PROFILE_SYNC_KEY, JSON.stringify(updates));
          setPendingChanges(true);
          
          console.log('[ProfileCache] ⚠️ Profile saved locally, will sync when connection improves');
          // Don't throw here - local save succeeded
        }
      } else {
        // If offline, mark for later sync
        console.log('[ProfileCache] 📴 Offline - marking for sync when online');
        await AsyncStorage.setItem(PROFILE_SYNC_KEY, JSON.stringify(updates));
        setPendingChanges(true);
        console.log('[ProfileCache] ✅ Profile cached offline - Will sync when online');
      }
      
      console.log('[ProfileCache] 🎉 Profile update process completed successfully');
    } catch (error: any) {
      console.error('[ProfileCache] ❌ Critical error updating cached profile:', error);
      console.error('[ProfileCache] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      
      // Revert local state if storage failed
      setCachedProfile(cachedProfile);
      
      // Provide specific error message
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error?.message?.includes('storage')) {
        errorMessage = 'Storage error. Please check device storage and try again.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Network error. Profile saved locally, will sync when online.';
      }
      
      throw new Error(errorMessage);
    }
  }, [cachedProfile, isOnline, updateProfile]);

  const syncProfile = useCallback(async () => {
    if (!isOnline || !pendingChanges) return;

    setIsSyncing(true);
    console.log('[ProfileCache] Starting profile sync...');

    try {
      const pendingUpdates = await AsyncStorage.getItem(PROFILE_SYNC_KEY);
      
      if (pendingUpdates) {
        const updates = JSON.parse(pendingUpdates);
        await updateProfile(updates);
        
        // Clear pending changes
        await AsyncStorage.removeItem(PROFILE_SYNC_KEY);
        setPendingChanges(false);
        
        // Update sync time
        const now = new Date();
        setLastSyncTime(now);
        await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
        
        console.log('[ProfileCache] Profile synced - Ready');
      }
    } catch (error) {
      console.error('[ProfileCache] Error syncing profile:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, pendingChanges, updateProfile]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingChanges && !isSyncing) {
      console.log('[ProfileCache] Came online with pending changes - auto-syncing');
      syncProfile();
    }
  }, [isOnline, pendingChanges, isSyncing, syncProfile]);

  return {
    cachedProfile,
    isOffline: !isOnline,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    syncProfile,
    updateCachedProfile,
    validateExperience,
  };
});