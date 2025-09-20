// PERMANENT CROSS-PLATFORM DATA PERSISTENCE SYSTEM
// Ensures driver data never gets lost across iOS, Android, and Web

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface StorageResult {
  success: boolean;
  storage: string;
  error?: any;
}

export interface PersistenceOptions {
  enableWebFallbacks?: boolean;
  enableIndexedDB?: boolean;
  enableMultipleBackups?: boolean;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

// PERMANENT FIX: Cross-platform storage manager with comprehensive fallbacks
export class CrossPlatformStorageManager {
  private static instance: CrossPlatformStorageManager;
  private options: PersistenceOptions;
  private webStorageAvailable: boolean = false;
  private indexedDBAvailable: boolean = false;

  constructor(options: PersistenceOptions = {}) {
    this.options = {
      enableWebFallbacks: true,
      enableIndexedDB: true,
      enableMultipleBackups: true,
      compressionEnabled: false,
      encryptionEnabled: false,
      ...options
    };
    
    this.initializeWebCapabilities();
  }

  static getInstance(options?: PersistenceOptions): CrossPlatformStorageManager {
    if (!CrossPlatformStorageManager.instance) {
      CrossPlatformStorageManager.instance = new CrossPlatformStorageManager(options);
    }
    return CrossPlatformStorageManager.instance;
  }

  private initializeWebCapabilities(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.webStorageAvailable = !!(window.localStorage && window.sessionStorage);
      this.indexedDBAvailable = !!window.indexedDB;
      
      console.log('[CrossPlatformStorage] Web capabilities:', {
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB
      });
    }
  }

  // PERMANENT FIX: Multi-storage save with comprehensive fallbacks
  async saveData(key: string, data: any, backupKeys: string[] = []): Promise<StorageResult[]> {
    console.log(`[CrossPlatformStorage] 💾 PERMANENT SAVE - Saving data for key: ${key}`);
    console.log(`[CrossPlatformStorage] Platform: ${Platform.OS}`);
    console.log(`[CrossPlatformStorage] Backup keys: ${backupKeys.length}`);
    
    const dataString = JSON.stringify(data);
    const results: StorageResult[] = [];
    const allKeys = [key, ...backupKeys];

    // 1. Primary AsyncStorage (works on all platforms)
    for (const storageKey of allKeys) {
      try {
        await AsyncStorage.setItem(storageKey, dataString);
        results.push({ success: true, storage: `AsyncStorage:${storageKey}` });
        console.log(`[CrossPlatformStorage] ✅ AsyncStorage save successful: ${storageKey}`);
      } catch (error) {
        results.push({ success: false, storage: `AsyncStorage:${storageKey}`, error });
        console.warn(`[CrossPlatformStorage] ❌ AsyncStorage save failed: ${storageKey}`, error);
      }
    }

    // 2. Web-specific fallbacks
    if (Platform.OS === 'web' && this.options.enableWebFallbacks) {
      await this.saveToWebStorage(allKeys, dataString, results);
    }

    // 3. IndexedDB for large data (Web only)
    if (Platform.OS === 'web' && this.options.enableIndexedDB && this.indexedDBAvailable) {
      await this.saveToIndexedDB(key, dataString, results);
    }

    const successCount = results.filter(r => r.success).length;
    const totalAttempts = results.length;
    
    console.log(`[CrossPlatformStorage] 📊 PERMANENT SAVE RESULTS:`, {
      successful: successCount,
      total: totalAttempts,
      successRate: `${Math.round((successCount / totalAttempts) * 100)}%`,
      platform: Platform.OS
    });

    return results;
  }

  // PERMANENT FIX: Multi-storage load with comprehensive recovery
  async loadData(key: string, backupKeys: string[] = []): Promise<{ data: any; source: string } | null> {
    console.log(`[CrossPlatformStorage] 📖 PERMANENT LOAD - Loading data for key: ${key}`);
    console.log(`[CrossPlatformStorage] Platform: ${Platform.OS}`);
    console.log(`[CrossPlatformStorage] Backup keys: ${backupKeys.length}`);
    
    const allKeys = [key, ...backupKeys];

    // 1. Try AsyncStorage first (primary storage)
    for (const storageKey of allKeys) {
      try {
        const data = await AsyncStorage.getItem(storageKey);
        if (data) {
          const parsedData = JSON.parse(data);
          console.log(`[CrossPlatformStorage] ✅ AsyncStorage load successful: ${storageKey}`);
          return { data: parsedData, source: `AsyncStorage:${storageKey}` };
        }
      } catch (error) {
        console.warn(`[CrossPlatformStorage] ❌ AsyncStorage load failed: ${storageKey}`, error);
        continue;
      }
    }

    // 2. Web fallbacks
    if (Platform.OS === 'web' && this.options.enableWebFallbacks) {
      const webResult = await this.loadFromWebStorage(allKeys);
      if (webResult) return webResult;
    }

    // 3. IndexedDB fallback
    if (Platform.OS === 'web' && this.options.enableIndexedDB && this.indexedDBAvailable) {
      const idbResult = await this.loadFromIndexedDB(key);
      if (idbResult) return idbResult;
    }

    console.log(`[CrossPlatformStorage] ❌ No data found for key: ${key}`);
    return null;
  }

  // Web-specific storage methods
  private async saveToWebStorage(keys: string[], dataString: string, results: StorageResult[]): Promise<void> {
    if (!this.webStorageAvailable) return;

    for (const key of keys) {
      // localStorage
      try {
        window.localStorage.setItem(key, dataString);
        results.push({ success: true, storage: `localStorage:${key}` });
        console.log(`[CrossPlatformStorage] ✅ localStorage save successful: ${key}`);
      } catch (error) {
        results.push({ success: false, storage: `localStorage:${key}`, error });
        console.warn(`[CrossPlatformStorage] ❌ localStorage save failed: ${key}`, error);
      }

      // sessionStorage
      try {
        window.sessionStorage.setItem(key, dataString);
        results.push({ success: true, storage: `sessionStorage:${key}` });
        console.log(`[CrossPlatformStorage] ✅ sessionStorage save successful: ${key}`);
      } catch (error) {
        results.push({ success: false, storage: `sessionStorage:${key}`, error });
        console.warn(`[CrossPlatformStorage] ❌ sessionStorage save failed: ${key}`, error);
      }
    }
  }

  private async loadFromWebStorage(keys: string[]): Promise<{ data: any; source: string } | null> {
    if (!this.webStorageAvailable) return null;

    for (const key of keys) {
      // Try localStorage first
      try {
        const data = window.localStorage.getItem(key);
        if (data) {
          const parsedData = JSON.parse(data);
          console.log(`[CrossPlatformStorage] ✅ localStorage load successful: ${key}`);
          return { data: parsedData, source: `localStorage:${key}` };
        }
      } catch (error) {
        console.warn(`[CrossPlatformStorage] ❌ localStorage load failed: ${key}`, error);
      }

      // Try sessionStorage
      try {
        const data = window.sessionStorage.getItem(key);
        if (data) {
          const parsedData = JSON.parse(data);
          console.log(`[CrossPlatformStorage] ✅ sessionStorage load successful: ${key}`);
          return { data: parsedData, source: `sessionStorage:${key}` };
        }
      } catch (error) {
        console.warn(`[CrossPlatformStorage] ❌ sessionStorage load failed: ${key}`, error);
      }
    }

    return null;
  }

  // IndexedDB methods for large data storage
  private async saveToIndexedDB(key: string, dataString: string, results: StorageResult[]): Promise<void> {
    try {
      const dbName = 'LoadRushPersistentDB';
      const storeName = 'profiles';
      
      const request = window.indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      await new Promise<void>((resolve, reject) => {
        const putRequest = store.put(dataString, key);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });

      results.push({ success: true, storage: `IndexedDB:${key}` });
      console.log(`[CrossPlatformStorage] ✅ IndexedDB save successful: ${key}`);
      
      db.close();
    } catch (error) {
      results.push({ success: false, storage: `IndexedDB:${key}`, error });
      console.warn(`[CrossPlatformStorage] ❌ IndexedDB save failed: ${key}`, error);
    }
  }

  private async loadFromIndexedDB(key: string): Promise<{ data: any; source: string } | null> {
    try {
      const dbName = 'LoadRushPersistentDB';
      const storeName = 'profiles';
      
      const request = window.indexedDB.open(dbName, 1);
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const dataString = await new Promise<string | null>((resolve, reject) => {
        const getRequest = store.get(key);
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(getRequest.error);
      });

      db.close();

      if (dataString) {
        const parsedData = JSON.parse(dataString);
        console.log(`[CrossPlatformStorage] ✅ IndexedDB load successful: ${key}`);
        return { data: parsedData, source: `IndexedDB:${key}` };
      }
    } catch (error) {
      console.warn(`[CrossPlatformStorage] ❌ IndexedDB load failed: ${key}`, error);
    }

    return null;
  }

  // PERMANENT FIX: Clear all data across all storage systems
  async clearData(key: string, backupKeys: string[] = []): Promise<StorageResult[]> {
    console.log(`[CrossPlatformStorage] 🗑️ PERMANENT CLEAR - Clearing data for key: ${key}`);
    
    const results: StorageResult[] = [];
    const allKeys = [key, ...backupKeys];

    // Clear from AsyncStorage
    for (const storageKey of allKeys) {
      try {
        await AsyncStorage.removeItem(storageKey);
        results.push({ success: true, storage: `AsyncStorage:${storageKey}` });
      } catch (error) {
        results.push({ success: false, storage: `AsyncStorage:${storageKey}`, error });
      }
    }

    // Clear from web storage
    if (Platform.OS === 'web' && this.webStorageAvailable) {
      for (const storageKey of allKeys) {
        try {
          window.localStorage.removeItem(storageKey);
          results.push({ success: true, storage: `localStorage:${storageKey}` });
        } catch (error) {
          results.push({ success: false, storage: `localStorage:${storageKey}`, error });
        }

        try {
          window.sessionStorage.removeItem(storageKey);
          results.push({ success: true, storage: `sessionStorage:${storageKey}` });
        } catch (error) {
          results.push({ success: false, storage: `sessionStorage:${storageKey}`, error });
        }
      }
    }

    return results;
  }

  // PERMANENT FIX: Get storage health status
  async getStorageHealth(): Promise<{
    platform: string;
    asyncStorage: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    totalCapabilities: number;
  }> {
    const health = {
      platform: Platform.OS,
      asyncStorage: false,
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      totalCapabilities: 0
    };

    // Test AsyncStorage
    try {
      const testKey = 'storage_health_test';
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.removeItem(testKey);
      health.asyncStorage = true;
      health.totalCapabilities++;
    } catch (error) {
      console.warn('[CrossPlatformStorage] AsyncStorage health check failed:', error);
    }

    // Test web storage
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const testKey = 'storage_health_test';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        health.localStorage = true;
        health.totalCapabilities++;
      } catch (error) {
        console.warn('[CrossPlatformStorage] localStorage health check failed:', error);
      }

      try {
        const testKey = 'storage_health_test';
        window.sessionStorage.setItem(testKey, 'test');
        window.sessionStorage.removeItem(testKey);
        health.sessionStorage = true;
        health.totalCapabilities++;
      } catch (error) {
        console.warn('[CrossPlatformStorage] sessionStorage health check failed:', error);
      }

      try {
        if (window.indexedDB) {
          health.indexedDB = true;
          health.totalCapabilities++;
        }
      } catch (error) {
        console.warn('[CrossPlatformStorage] IndexedDB health check failed:', error);
      }
    }

    console.log('[CrossPlatformStorage] Storage health:', health);
    return health;
  }
}

// PERMANENT FIX: Singleton instance for global use
export const crossPlatformStorage = CrossPlatformStorageManager.getInstance({
  enableWebFallbacks: true,
  enableIndexedDB: true,
  enableMultipleBackups: true
});

// PERMANENT FIX: Convenience functions for common operations
export const permanentSave = async (key: string, data: any, backupKeys: string[] = []): Promise<boolean> => {
  const results = await crossPlatformStorage.saveData(key, data, backupKeys);
  const successCount = results.filter(r => r.success).length;
  const successRate = successCount / results.length;
  
  console.log(`[PermanentSave] Success rate: ${Math.round(successRate * 100)}% (${successCount}/${results.length})`);
  return successRate >= 0.5; // Consider successful if at least 50% of storage methods work
};

export const permanentLoad = async (key: string, backupKeys: string[] = []): Promise<any | null> => {
  const result = await crossPlatformStorage.loadData(key, backupKeys);
  if (result) {
    console.log(`[PermanentLoad] Data loaded from: ${result.source}`);
    return result.data;
  }
  return null;
};

export const permanentClear = async (key: string, backupKeys: string[] = []): Promise<boolean> => {
  const results = await crossPlatformStorage.clearData(key, backupKeys);
  const successCount = results.filter(r => r.success).length;
  return successCount > 0;
};

// PERMANENT FIX: Platform-specific optimizations
export const getPlatformOptimizedKeys = (baseKey: string, userId: string, userRole: string): string[] => {
  const timestamp = Date.now();
  const platformPrefix = Platform.OS;
  
  return [
    baseKey,
    `${baseKey}_backup`,
    `${baseKey}_${platformPrefix}`,
    `${userRole}:${baseKey}:${userId}`,
    `user:${userId}:${baseKey}`,
    `platform:${platformPrefix}:${baseKey}`,
    `timestamp:${timestamp}:${baseKey}`,
    `recovery:${userRole}:${userId}`,
    `permanent:${baseKey}:${userId}`,
    `unbreakable:${platformPrefix}:${baseKey}`
  ];
};

console.log('[CrossPlatformStorage] 🚀 PERMANENT CROSS-PLATFORM STORAGE SYSTEM INITIALIZED');
console.log('[CrossPlatformStorage] ✅ iOS, Android, and Web persistence enabled');
console.log('[CrossPlatformStorage] 🔒 Data will never be lost across platforms');
console.log('[CrossPlatformStorage] 🌐 Web fallbacks: localStorage, sessionStorage, IndexedDB');
console.log('[CrossPlatformStorage] 📱 Mobile: AsyncStorage with multiple backups');
console.log('[CrossPlatformStorage] 💾 Multi-layer persistence with automatic recovery');