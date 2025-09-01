import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type ToggleKey =
  | 'pushNotifications'
  | 'emailNotifications'
  | 'smsNotifications'
  | 'darkMode'
  | 'soundEffects'
  | 'locationServices'
  | 'autoSync'
  | 'offlineMode';

export type SortOrder = 'Best' | 'Newest' | 'Highest $' | 'Lightest';

interface SettingsState {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  darkMode: boolean;
  soundEffects: boolean;
  locationServices: boolean;
  autoSync: boolean;
  offlineMode: boolean;
  sortOrder: SortOrder;
  isHydrating: boolean;
  setToggle: (key: ToggleKey, value: boolean) => Promise<void>;
  setSortOrder: (value: SortOrder) => Promise<void>;
  clearCache: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const STORAGE_KEY = 'app_settings_v1';

export const [SettingsProvider, useSettings] = createContextHook<SettingsState>(() => {
  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [smsNotifications, setSmsNotifications] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [locationServices, setLocationServices] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [sortOrder, setSort] = useState<SortOrder>('Best');
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        console.log('[Settings] Hydrating from storage');
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<SettingsState> & { sortOrder?: SortOrder };
          setPushNotifications(!!data.pushNotifications);
          setEmailNotifications(!!data.emailNotifications);
          setSmsNotifications(!!data.smsNotifications);
          setDarkMode(!!data.darkMode);
          setSoundEffects(!!data.soundEffects);
          setLocationServices(!!data.locationServices);
          setAutoSync(!!data.autoSync);
          setOfflineMode(!!data.offlineMode);
          if (data.sortOrder === 'Best' || data.sortOrder === 'Newest' || data.sortOrder === 'Highest $' || data.sortOrder === 'Lightest') {
            setSort(data.sortOrder);
          }
        }
      } catch (e) {
        console.error('[Settings] hydrate error', e);
      } finally {
        setIsHydrating(false);
      }
    })();
  }, []);

  const persist = useCallback(async () => {
    try {
      const payload = {
        pushNotifications,
        emailNotifications,
        smsNotifications,
        darkMode,
        soundEffects,
        locationServices,
        autoSync,
        offlineMode,
        sortOrder,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      console.log('[Settings] Saved');
    } catch (e) {
      console.error('[Settings] save error', e);
    }
  }, [pushNotifications, emailNotifications, smsNotifications, darkMode, soundEffects, locationServices, autoSync, offlineMode, sortOrder]);

  useEffect(() => {
    if (!isHydrating) {
      void persist();
    }
  }, [persist, isHydrating]);

  const setToggle = useCallback(async (key: ToggleKey, value: boolean) => {
    try {
      console.log('[Settings] setToggle', key, value);
      switch (key) {
        case 'pushNotifications':
          setPushNotifications(value);
          break;
        case 'emailNotifications':
          setEmailNotifications(value);
          break;
        case 'smsNotifications':
          setSmsNotifications(value);
          break;
        case 'darkMode':
          setDarkMode(value);
          break;
        case 'soundEffects':
          setSoundEffects(value);
          break;
        case 'locationServices':
          setLocationServices(value);
          break;
        case 'autoSync':
          setAutoSync(value);
          break;
        case 'offlineMode':
          setOfflineMode(value);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('[Settings] setToggle error', e);
    }
  }, []);

  const setSortOrder = useCallback(async (value: SortOrder) => {
    try {
      console.log('[Settings] setSortOrder', value);
      setSort(value);
    } catch (e) {
      console.error('[Settings] setSortOrder error', e);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      console.log('[Settings] clear cache');
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k !== STORAGE_KEY);
      if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
    } catch (e) {
      console.error('[Settings] clearCache error', e);
      throw e;
    }
  }, []);

  const resetAll = useCallback(async () => {
    try {
      console.log('[Settings] reset all');
      setPushNotifications(true);
      setEmailNotifications(true);
      setSmsNotifications(false);
      setDarkMode(false);
      setSoundEffects(true);
      setLocationServices(true);
      setAutoSync(true);
      setOfflineMode(false);
      setSort('Best');
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[Settings] reset error', e);
      throw e;
    }
  }, []);

  const value = useMemo<SettingsState>(() => ({
    pushNotifications,
    emailNotifications,
    smsNotifications,
    darkMode,
    soundEffects,
    locationServices,
    autoSync,
    offlineMode,
    sortOrder,
    isHydrating,
    setToggle,
    setSortOrder,
    clearCache,
    resetAll,
  }), [pushNotifications, emailNotifications, smsNotifications, darkMode, soundEffects, locationServices, autoSync, offlineMode, sortOrder, isHydrating, setToggle, setSortOrder, clearCache, resetAll]);

  return value;
});