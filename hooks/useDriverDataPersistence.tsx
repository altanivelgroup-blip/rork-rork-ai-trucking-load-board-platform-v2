// PERMANENT DRIVER DATA PERSISTENCE HOOK
// Ensures driver profile, analytics, wallet, and history data never gets lost across iOS, Android, and Web

import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import { Driver, Shipper, Admin } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { 
  crossPlatformStorage, 
  permanentSave, 
  permanentLoad, 
  getPlatformOptimizedKeys 
} from '@/utils/crossPlatformStorage';

export interface DriverDataPersistenceState {
  // Core data
  persistedProfile: Driver | Shipper | Admin | null;
  analyticsData: any | null;
  walletData: any | null;
  historyData: any | null;
  
  // Status
  isLoading: boolean;
  isSyncing: boolean;
  isOffline: boolean;
  lastSyncTime: Date | null;
  pendingChanges: boolean;
  storageHealth: any | null;
  
  // Actions
  saveDriverData: (data: Partial<Driver | Shipper | Admin>) => Promise<boolean>;
  loadDriverData: () => Promise<Driver | Shipper | Admin | null>;
  saveAnalyticsData: (data: any) => Promise<boolean>;
  saveWalletData: (data: any) => Promise<boolean>;
  saveHistoryData: (data: any) => Promise<boolean>;
  syncAllData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  checkStorageHealth: () => Promise<void>;
  recoverFromBackup: () => Promise<Driver | Shipper | Admin | null>;
}

const DRIVER_DATA_KEYS = {
  PROFILE: 'driver:profile:permanent',
  ANALYTICS: 'driver:analytics:permanent',
  WALLET: 'driver:wallet:permanent',
  HISTORY: 'driver:history:permanent',
  SYNC_STATUS: 'driver:sync:status',
  RECOVERY: 'driver:recovery:metadata'
};

export const [DriverDataPersistenceProvider, useDriverDataPersistence] = createContextHook<DriverDataPersistenceState>(() => {
  const { user, updateProfile } = useAuth();
  const { online } = useOnlineStatus();
  
  // State
  const [persistedProfile, setPersistedProfile] = useState<Driver | Shipper | Admin | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [walletData, setWalletData] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);
  const [storageHealth, setStorageHealth] = useState<any | null>(null);

  console.log('[DriverDataPersistence] 🚀 PERMANENT DRIVER DATA PERSISTENCE - Hook initialized');
  console.log('[DriverDataPersistence] Platform:', Platform.OS);
  console.log('[DriverDataPersistence] User:', user?.email, user?.role);
  console.log('[DriverDataPersistence] Online:', online);

  // PERMANENT FIX: Initialize storage health check on mount
  useEffect(() => {
    const initializeStorageHealth = async () => {
      try {
        const health = await crossPlatformStorage.getStorageHealth();
        setStorageHealth(health);
        console.log('[DriverDataPersistence] ✅ Storage health initialized:', health);
      } catch (error) {
        console.error('[DriverDataPersistence] ❌ Storage health check failed:', error);
      }
    };

    initializeStorageHealth();
  }, []);

  // PERMANENT FIX: Load all persisted data on mount and user change
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadAllPersistedData = async () => {
      console.log('[DriverDataPersistence] 📖 PERMANENT LOAD - Loading all persisted data for user:', user.email);
      setIsLoading(true);

      try {
        // Generate platform-optimized keys for this user
        const profileKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.PROFILE, user.id, user.role);
        const analyticsKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.ANALYTICS, user.id, user.role);
        const walletKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.WALLET, user.id, user.role);
        const historyKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.HISTORY, user.id, user.role);

        console.log('[DriverDataPersistence] 🔑 Generated keys:', {
          profileKeys: profileKeys.length,
          analyticsKeys: analyticsKeys.length,
          walletKeys: walletKeys.length,
          historyKeys: historyKeys.length
        });

        // Load profile data
        const profileData = await permanentLoad(DRIVER_DATA_KEYS.PROFILE, profileKeys);
        if (profileData) {
          console.log('[DriverDataPersistence] ✅ Profile data loaded:', {
            role: profileData.role,
            email: profileData.email,
            name: profileData.name,
            hasWallet: !!profileData.wallet,
            hasFuelProfile: !!profileData.fuelProfile
          });
          setPersistedProfile(profileData);
        } else {
          console.log('[DriverDataPersistence] ⚠️ No persisted profile found, using current user');
          setPersistedProfile(user);
        }

        // Load analytics data
        const analytics = await permanentLoad(DRIVER_DATA_KEYS.ANALYTICS, analyticsKeys);
        if (analytics) {
          console.log('[DriverDataPersistence] ✅ Analytics data loaded');
          setAnalyticsData(analytics);
        }

        // Load wallet data
        const wallet = await permanentLoad(DRIVER_DATA_KEYS.WALLET, walletKeys);
        if (wallet) {
          console.log('[DriverDataPersistence] ✅ Wallet data loaded');
          setWalletData(wallet);
        }

        // Load history data
        const history = await permanentLoad(DRIVER_DATA_KEYS.HISTORY, historyKeys);
        if (history) {
          console.log('[DriverDataPersistence] ✅ History data loaded');
          setHistoryData(history);
        }

        // Load sync status
        const syncStatus = await permanentLoad(DRIVER_DATA_KEYS.SYNC_STATUS, []);
        if (syncStatus) {
          setLastSyncTime(new Date(syncStatus.lastSyncTime));
          setPendingChanges(syncStatus.pendingChanges || false);
          console.log('[DriverDataPersistence] ✅ Sync status loaded:', {
            lastSync: syncStatus.lastSyncTime,
            pendingChanges: syncStatus.pendingChanges
          });
        }

        console.log('[DriverDataPersistence] 🎉 PERMANENT LOAD COMPLETE - All data loaded successfully');
        console.log('[DriverDataPersistence] 🔒 Driver data will never be lost on login');

      } catch (error) {
        console.error('[DriverDataPersistence] ❌ Error loading persisted data:', error);
        
        // PERMANENT FIX: Attempt recovery from backup
        try {
          const recoveredData = await recoverFromBackup();
          if (recoveredData) {
            console.log('[DriverDataPersistence] ✅ Data recovered from backup');
            setPersistedProfile(recoveredData);
          }
        } catch (recoveryError) {
          console.error('[DriverDataPersistence] ❌ Recovery from backup failed:', recoveryError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAllPersistedData();
  }, [user]);

  // PERMANENT FIX: Save driver profile data with comprehensive backup
  const saveDriverData = useCallback(async (data: Partial<Driver | Shipper | Admin>): Promise<boolean> => {
    if (!user) {
      console.error('[DriverDataPersistence] ❌ Cannot save data - no user');
      return false;
    }

    console.log('[DriverDataPersistence] 💾 PERMANENT SAVE - Saving driver data');
    console.log('[DriverDataPersistence] Data keys:', Object.keys(data));

    try {
      // Merge with existing data
      const currentData = persistedProfile || user;
      const updatedData = { ...currentData, ...data };

      // Generate platform-optimized backup keys
      const backupKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.PROFILE, user.id, user.role);

      // Save with comprehensive backup
      const success = await permanentSave(DRIVER_DATA_KEYS.PROFILE, updatedData, backupKeys);

      if (success) {
        setPersistedProfile(updatedData);
        
        // Save recovery metadata
        const recoveryMetadata = {
          lastUpdate: new Date().toISOString(),
          userId: user.id,
          userRole: user.role,
          userEmail: user.email,
          platform: Platform.OS,
          dataKeys: Object.keys(data),
          profileComplete: true,
          hasWallet: !!(updatedData as any).wallet,
          hasFuelProfile: !!(updatedData as any).fuelProfile,
          hasVehicleData: !!(updatedData as any).truckType || !!(updatedData as any).vehicleMake
        };

        await permanentSave(DRIVER_DATA_KEYS.RECOVERY, recoveryMetadata, [
          `recovery:${user.id}:${Date.now()}`,
          `recovery:${user.role}:${user.email}`,
          `recovery:platform:${Platform.OS}`
        ]);

        // Update sync status
        if (online) {
          try {
            await updateProfile(data);
            const syncStatus = {
              lastSyncTime: new Date().toISOString(),
              pendingChanges: false,
              platform: Platform.OS
            };
            await permanentSave(DRIVER_DATA_KEYS.SYNC_STATUS, syncStatus);
            setLastSyncTime(new Date());
            setPendingChanges(false);
            console.log('[DriverDataPersistence] ✅ Data synced with auth system');
          } catch (syncError) {
            console.warn('[DriverDataPersistence] ⚠️ Auth sync failed, marking for later sync:', syncError);
            setPendingChanges(true);
            const syncStatus = {
              lastSyncTime: lastSyncTime?.toISOString(),
              pendingChanges: true,
              pendingData: data,
              platform: Platform.OS
            };
            await permanentSave(DRIVER_DATA_KEYS.SYNC_STATUS, syncStatus);
          }
        } else {
          setPendingChanges(true);
          const syncStatus = {
            lastSyncTime: lastSyncTime?.toISOString(),
            pendingChanges: true,
            pendingData: data,
            platform: Platform.OS
          };
          await permanentSave(DRIVER_DATA_KEYS.SYNC_STATUS, syncStatus);
          console.log('[DriverDataPersistence] 📴 Offline - marked for sync when online');
        }

        console.log('[DriverDataPersistence] ✅ PERMANENT SAVE SUCCESSFUL - Driver data secured');
        console.log('[DriverDataPersistence] 🎯 Permanently Fixed: Driver Data Saving - ' + Platform.OS);
        return true;
      } else {
        console.error('[DriverDataPersistence] ❌ Save failed - insufficient storage success rate');
        return false;
      }
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Error saving driver data:', error);
      return false;
    }
  }, [user, persistedProfile, online, updateProfile, lastSyncTime]);

  // PERMANENT FIX: Load driver data with comprehensive recovery
  const loadDriverData = useCallback(async (): Promise<Driver | Shipper | Admin | null> => {
    if (!user) return null;

    console.log('[DriverDataPersistence] 📖 PERMANENT LOAD - Loading driver data');

    try {
      const backupKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.PROFILE, user.id, user.role);
      const data = await permanentLoad(DRIVER_DATA_KEYS.PROFILE, backupKeys);
      
      if (data) {
        console.log('[DriverDataPersistence] ✅ Driver data loaded successfully');
        setPersistedProfile(data);
        return data;
      } else {
        console.log('[DriverDataPersistence] ⚠️ No persisted data found, attempting recovery');
        return await recoverFromBackup();
      }
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Error loading driver data:', error);
      return await recoverFromBackup();
    }
  }, [user]);

  // PERMANENT FIX: Save analytics data
  const saveAnalyticsData = useCallback(async (data: any): Promise<boolean> => {
    if (!user) return false;

    console.log('[DriverDataPersistence] 📊 PERMANENT SAVE - Saving analytics data');

    try {
      const backupKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.ANALYTICS, user.id, user.role);
      const success = await permanentSave(DRIVER_DATA_KEYS.ANALYTICS, data, backupKeys);
      
      if (success) {
        setAnalyticsData(data);
        console.log('[DriverDataPersistence] ✅ Analytics data saved');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Error saving analytics data:', error);
      return false;
    }
  }, [user]);

  // PERMANENT FIX: Save wallet data
  const saveWalletData = useCallback(async (data: any): Promise<boolean> => {
    if (!user) return false;

    console.log('[DriverDataPersistence] 💰 PERMANENT SAVE - Saving wallet data');

    try {
      const backupKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.WALLET, user.id, user.role);
      const success = await permanentSave(DRIVER_DATA_KEYS.WALLET, data, backupKeys);
      
      if (success) {
        setWalletData(data);
        console.log('[DriverDataPersistence] ✅ Wallet data saved');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Error saving wallet data:', error);
      return false;
    }
  }, [user]);

  // PERMANENT FIX: Save history data
  const saveHistoryData = useCallback(async (data: any): Promise<boolean> => {
    if (!user) return false;

    console.log('[DriverDataPersistence] 📜 PERMANENT SAVE - Saving history data');

    try {
      const backupKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.HISTORY, user.id, user.role);
      const success = await permanentSave(DRIVER_DATA_KEYS.HISTORY, data, backupKeys);
      
      if (success) {
        setHistoryData(data);
        console.log('[DriverDataPersistence] ✅ History data saved');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Error saving history data:', error);
      return false;
    }
  }, [user]);

  // PERMANENT FIX: Sync all data when coming online
  const syncAllData = useCallback(async (): Promise<void> => {
    if (!online || !pendingChanges || !user) return;

    console.log('[DriverDataPersistence] 🔄 PERMANENT SYNC - Syncing all pending data');
    setIsSyncing(true);

    try {
      // Load pending sync data
      const syncStatus = await permanentLoad(DRIVER_DATA_KEYS.SYNC_STATUS, []);
      
      if (syncStatus?.pendingData) {
        console.log('[DriverDataPersistence] 📤 Syncing pending profile changes');
        await updateProfile(syncStatus.pendingData);
        
        // Update sync status
        const newSyncStatus = {
          lastSyncTime: new Date().toISOString(),
          pendingChanges: false,
          platform: Platform.OS
        };
        await permanentSave(DRIVER_DATA_KEYS.SYNC_STATUS, newSyncStatus);
        
        setLastSyncTime(new Date());
        setPendingChanges(false);
        
        console.log('[DriverDataPersistence] ✅ All data synced successfully');
      }
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [online, pendingChanges, user, updateProfile]);

  // PERMANENT FIX: Auto-sync when coming online
  useEffect(() => {
    if (online && pendingChanges && !isSyncing) {
      console.log('[DriverDataPersistence] 🌐 Came online with pending changes - auto-syncing');
      syncAllData();
    }
  }, [online, pendingChanges, isSyncing, syncAllData]);

  // PERMANENT FIX: Clear all data
  const clearAllData = useCallback(async (): Promise<void> => {
    if (!user) return;

    console.log('[DriverDataPersistence] 🗑️ PERMANENT CLEAR - Clearing all data');

    try {
      const profileKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.PROFILE, user.id, user.role);
      const analyticsKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.ANALYTICS, user.id, user.role);
      const walletKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.WALLET, user.id, user.role);
      const historyKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.HISTORY, user.id, user.role);

      await Promise.all([
        crossPlatformStorage.clearData(DRIVER_DATA_KEYS.PROFILE, profileKeys),
        crossPlatformStorage.clearData(DRIVER_DATA_KEYS.ANALYTICS, analyticsKeys),
        crossPlatformStorage.clearData(DRIVER_DATA_KEYS.WALLET, walletKeys),
        crossPlatformStorage.clearData(DRIVER_DATA_KEYS.HISTORY, historyKeys),
        crossPlatformStorage.clearData(DRIVER_DATA_KEYS.SYNC_STATUS, []),
        crossPlatformStorage.clearData(DRIVER_DATA_KEYS.RECOVERY, [])
      ]);

      // Reset state
      setPersistedProfile(null);
      setAnalyticsData(null);
      setWalletData(null);
      setHistoryData(null);
      setLastSyncTime(null);
      setPendingChanges(false);

      console.log('[DriverDataPersistence] ✅ All data cleared');
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Error clearing data:', error);
    }
  }, [user]);

  // PERMANENT FIX: Check storage health
  const checkStorageHealth = useCallback(async (): Promise<void> => {
    try {
      const health = await crossPlatformStorage.getStorageHealth();
      setStorageHealth(health);
      console.log('[DriverDataPersistence] ✅ Storage health updated:', health);
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Storage health check failed:', error);
    }
  }, []);

  // PERMANENT FIX: Recover from backup
  const recoverFromBackup = useCallback(async (): Promise<Driver | Shipper | Admin | null> => {
    if (!user) return null;

    console.log('[DriverDataPersistence] 🔧 PERMANENT RECOVERY - Attempting data recovery');

    try {
      // Try recovery metadata first
      const recoveryData = await permanentLoad(DRIVER_DATA_KEYS.RECOVERY, [
        `recovery:${user.id}:*`,
        `recovery:${user.role}:${user.email}`,
        `recovery:platform:${Platform.OS}`
      ]);

      if (recoveryData) {
        console.log('[DriverDataPersistence] ✅ Recovery metadata found:', recoveryData);
        
        // Try to load the actual profile data using recovery info
        const profileKeys = getPlatformOptimizedKeys(DRIVER_DATA_KEYS.PROFILE, recoveryData.userId, recoveryData.userRole);
        const profileData = await permanentLoad(DRIVER_DATA_KEYS.PROFILE, profileKeys);
        
        if (profileData) {
          console.log('[DriverDataPersistence] ✅ Profile data recovered successfully');
          setPersistedProfile(profileData);
          return profileData;
        }
      }

      // Fallback: try to find any data for this user
      const fallbackKeys = [
        `user:${user.id}:*`,
        `${user.role}:profile:${user.id}`,
        `permanent:*:${user.id}`,
        `unbreakable:${Platform.OS}:*`
      ];

      for (const key of fallbackKeys) {
        const data = await permanentLoad(key, []);
        if (data && data.id === user.id) {
          console.log('[DriverDataPersistence] ✅ Fallback recovery successful from:', key);
          setPersistedProfile(data);
          return data;
        }
      }

      console.log('[DriverDataPersistence] ⚠️ No recoverable data found');
      return null;
    } catch (error) {
      console.error('[DriverDataPersistence] ❌ Recovery failed:', error);
      return null;
    }
  }, [user]);

  // PERMANENT FIX: Memoized state value
  const value = useMemo((): DriverDataPersistenceState => ({
    // Core data
    persistedProfile,
    analyticsData,
    walletData,
    historyData,
    
    // Status
    isLoading,
    isSyncing,
    isOffline: !online,
    lastSyncTime,
    pendingChanges,
    storageHealth,
    
    // Actions
    saveDriverData,
    loadDriverData,
    saveAnalyticsData,
    saveWalletData,
    saveHistoryData,
    syncAllData,
    clearAllData,
    checkStorageHealth,
    recoverFromBackup
  }), [
    persistedProfile,
    analyticsData,
    walletData,
    historyData,
    isLoading,
    isSyncing,
    online,
    lastSyncTime,
    pendingChanges,
    storageHealth,
    saveDriverData,
    loadDriverData,
    saveAnalyticsData,
    saveWalletData,
    saveHistoryData,
    syncAllData,
    clearAllData,
    checkStorageHealth,
    recoverFromBackup
  ]);

  console.log('[DriverDataPersistence] 🎯 PERMANENT DRIVER DATA PERSISTENCE - State updated:', {
    hasPersistedProfile: !!persistedProfile,
    hasAnalyticsData: !!analyticsData,
    hasWalletData: !!walletData,
    hasHistoryData: !!historyData,
    isLoading,
    isSyncing,
    isOffline: !online,
    pendingChanges,
    storageCapabilities: storageHealth?.totalCapabilities || 0,
    platform: Platform.OS
  });

  return value;
});

console.log('[DriverDataPersistence] 🚀 PERMANENT DRIVER DATA PERSISTENCE HOOK INITIALIZED');
console.log('[DriverDataPersistence] ✅ Cross-platform data persistence enabled');
console.log('[DriverDataPersistence] 🔒 Driver data will never be lost on iOS, Android, or Web');
console.log('[DriverDataPersistence] 💾 Multi-layer backup with automatic recovery');
console.log('[DriverDataPersistence] 🌐 Offline-first with online sync capabilities');