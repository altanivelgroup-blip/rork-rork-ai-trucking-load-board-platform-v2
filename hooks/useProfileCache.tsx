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
  const { isOnline } = useOnlineStatus();
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
    if (!cachedProfile) return;

    const updatedProfile = { ...cachedProfile, ...updates };
    setCachedProfile(updatedProfile);
    
    try {
      // Always update local cache
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile));
      
      if (isOnline) {
        // If online, sync immediately
        console.log('[ProfileCache] Online - syncing profile immediately');
        await updateProfile(updates);
        setLastSyncTime(new Date());
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        await AsyncStorage.removeItem(PROFILE_SYNC_KEY);
        setPendingChanges(false);
        console.log('[ProfileCache] Profile synced - Ready');
      } else {
        // If offline, mark for later sync
        console.log('[ProfileCache] Offline - marking for sync');
        await AsyncStorage.setItem(PROFILE_SYNC_KEY, JSON.stringify(updates));
        setPendingChanges(true);
        console.log('[ProfileCache] Profile cached offline - Will sync when online');
      }
    } catch (error) {
      console.error('[ProfileCache] Error updating cached profile:', error);
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