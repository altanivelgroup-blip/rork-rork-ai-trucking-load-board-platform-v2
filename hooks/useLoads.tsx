import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Load, VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
// Firebase imports temporarily disabled for bundling fix
// import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
// import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { LOADS_COLLECTION, LOAD_STATUS } from '@/lib/loadSchema';

interface GeoPoint { lat: number; lng: number }

interface LoadFilters {
  vehicleType?: VehicleType;
  minRate?: number;
  maxDistance?: number;
  origin?: string;
  destination?: string;
  showBackhaul?: boolean;
  backhaulCenter?: GeoPoint;
  backhaulRadiusMiles?: number;
}

interface LoadsState {
  loads: Load[];
  filters: LoadFilters;
  isLoading: boolean;
  filteredLoads: Load[];
  aiRecommendedLoads: Load[];
  currentLoad?: Load;
  favorites: Record<string, boolean>;
  isFavorited: (loadId: string) => boolean;
  toggleFavorite: (loadId: string) => Promise<void>;
  setFilters: (filters: LoadFilters) => void;
  acceptLoad: (loadId: string) => Promise<void>;
  refreshLoads: () => Promise<void>;
  addLoad: (load: Load) => Promise<void>;
  addLoadsBulk: (incoming: Load[]) => Promise<void>;
}

export interface LoadsWithToast {
  acceptLoadWithToast: (loadId: string) => Promise<void>;
  refreshLoadsWithToast: () => Promise<void>;
  addLoadWithToast: (load: Load) => Promise<void>;
  addLoadsBulkWithToast: (incoming: Load[]) => Promise<void>;
}

function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export const [LoadsProvider, useLoads] = createContextHook<LoadsState>(() => {
  // Always call hooks in the same order - no conditional hooks
  const [loads, setLoads] = useState<Load[]>(mockLoads);
  const [filters, setFilters] = useState<LoadFilters>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  // Firebase state temporarily disabled
  // const [, setFirebaseLoads] = useState<any[]>([]);
  // const [useFirebase, setUseFirebase] = useState<boolean>(false);
  
  // Always call these hooks in the same order
  const { online } = useOnlineStatus();
  const { user } = useAuth();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const USER_POSTED_LOADS_KEY = 'userPostedLoads';

  const mergeUniqueById = useCallback((primary: Load[], extras: Load[]): Load[] => {
    const map = new Map<string, Load>();
    // extras first so new posts appear on top
    for (const l of extras) map.set(l.id, l);
    for (const l of primary) if (!map.has(l.id)) map.set(l.id, l);
    return Array.from(map.values());
  }, []);

  // Always define memoized values in the same order
  const FAVORITES_KEY = useMemo(() => {
    return user ? `favorites:${user.id}` : 'favorites:guest';
  }, [user]);

  const currentLoad = useMemo(() => {
    const inTransit = loads.find(l => l.status === 'in-transit');
    return inTransit;
  }, [loads]);

  const filteredLoads = useMemo(() => {
    return loads.filter(load => {
      if (filters.vehicleType && load.vehicleType !== filters.vehicleType) return false;
      if (filters.minRate && load.rate < filters.minRate) return false;
      if (filters.maxDistance && load.distance > filters.maxDistance) return false;
      if (filters.origin && !load.origin.city.toLowerCase().includes((filters.origin ?? '').toLowerCase())) return false;
      if (filters.destination && !load.destination.city.toLowerCase().includes((filters.destination ?? '').toLowerCase())) return false;
      if (filters.showBackhaul !== undefined && load.isBackhaul !== filters.showBackhaul) return false;
      if (filters.backhaulCenter) {
        const radius = filters.backhaulRadiusMiles ?? 50;
        const miles = haversineMiles(
          { lat: load.origin.lat, lng: load.origin.lng },
          { lat: filters.backhaulCenter.lat, lng: filters.backhaulCenter.lng }
        );
        if (miles > radius) return false;
      }
      return load.status === 'available';
    });
  }, [loads, filters]);

  const aiRecommendedLoads = useMemo(() => {
    return loads
      .filter(load => load.aiScore && load.aiScore > 85 && load.status === 'available')
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 5);
  }, [loads]);

  const acceptLoad = useCallback(async (loadId: string) => {
    setIsLoading(true);
    try {
      if (!online) {
        console.log('[Loads] Offline: action will sync later');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoads(prevLoads => 
        prevLoads.map(load => 
          load.id === loadId 
            ? { ...load, status: 'in-transit' as const, assignedDriverId: '1' }
            : load
        )
      );
      const acceptedLoads = await AsyncStorage.getItem('acceptedLoads');
      const accepted = acceptedLoads ? JSON.parse(acceptedLoads) : [];
      accepted.push(loadId);
      await AsyncStorage.setItem('acceptedLoads', JSON.stringify(accepted));
      console.log('[Loads] Load accepted');
    } catch (error) {
      console.error('Failed to accept load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [online]);

  const refreshLoads = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!online) {
        console.log('[Loads] Offline: showing cached loads');
        const persistedRaw = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const persisted: Load[] = persistedRaw ? JSON.parse(persistedRaw) : [];
        setLoads(prev => mergeUniqueById(mockLoads, persisted));
        return;
      }
      
      // Temporarily disable Firebase integration to fix bundling
      console.log('[Loads] Using mock data (Firebase temporarily disabled)');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const persistedRaw = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
      const persisted: Load[] = persistedRaw ? JSON.parse(persistedRaw) : [];
      setLoads(mergeUniqueById(mockLoads, persisted));
    } catch (error) {
      console.error('Failed to refresh loads:', error);
      // Fallback to mock data + persisted
      try {
        const persistedRaw = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const persisted: Load[] = persistedRaw ? JSON.parse(persistedRaw) : [];
        setLoads(mergeUniqueById(mockLoads, persisted));
      } catch (inner) {
        setLoads([...mockLoads]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [online, mergeUniqueById]);

  const addLoad = useCallback(async (load: Load) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Update in-memory state (keep unique)
      setLoads(prev => mergeUniqueById([load, ...prev], []));
      
      // Persist to AsyncStorage
      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const parsed: Load[] = existingLoads ? JSON.parse(existingLoads) : [];
        const updated = mergeUniqueById([], [load, ...parsed]);
        await AsyncStorage.setItem(USER_POSTED_LOADS_KEY, JSON.stringify(updated));
        console.log('[Loads] Load posted and saved to AsyncStorage');
      } catch (storageError) {
        console.warn('[Loads] Failed to save to AsyncStorage, but load added to memory:', storageError);
      }
      
    } catch (error) {
      console.error('Failed to add load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mergeUniqueById]);

  const addLoadsBulk = useCallback(async (incoming: Load[]) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoads(prev => mergeUniqueById([...incoming, ...prev], []));

      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const parsed: Load[] = existingLoads ? JSON.parse(existingLoads) : [];
        const updated = mergeUniqueById([], [...incoming, ...parsed]);
        await AsyncStorage.setItem(USER_POSTED_LOADS_KEY, JSON.stringify(updated));
        console.log('[Loads] Imported loads saved to AsyncStorage');
      } catch (storageError) {
        console.warn('[Loads] Failed to persist imported loads:', storageError);
      }

      console.log('[Loads] Imported loads');
    } catch (error) {
      console.error('Failed to add loads bulk:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mergeUniqueById]);

  const setFiltersCallback = useCallback((newFilters: LoadFilters) => {
    setFilters(newFilters);
  }, []);

  const isFavorited = useCallback((loadId: string) => {
    return !!favorites[loadId];
  }, [favorites]);

  const toggleFavorite = useCallback(async (loadId: string) => {
    try {
      setFavorites(prev => {
        const next = { ...prev, [loadId]: !prev[loadId] };
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(err => console.warn('[Loads] favorite persist error', err));
        return next;
      });
    } catch (e) {
      console.error('[Loads] toggleFavorite error', e);
      throw e;
    }
  }, [FAVORITES_KEY]);

  useEffect(() => {
    let mounted = true;
    const loadFavs = async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        const parsed = raw ? JSON.parse(raw) as Record<string, boolean> : {};
        if (mounted) setFavorites(parsed);
      } catch (e) {
        console.warn('[Loads] failed to load favorites', e);
        if (mounted) setFavorites({});
      }
    };
    loadFavs();
    return () => { mounted = false; };
  }, [FAVORITES_KEY]);

  // Firebase integration temporarily disabled to fix bundling
  useEffect(() => {
    console.log('[Loads] Firebase integration disabled for bundling fix');
    // Clean up any existing listeners
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const persistedRaw = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const persisted: Load[] = persistedRaw ? JSON.parse(persistedRaw) : [];
        if (!mounted) return;
        if (persisted.length) {
          console.log(`[Loads] Restoring ${persisted.length} posted load(s) from storage`);
          setLoads(prev => mergeUniqueById(prev, persisted));
        }
      } catch (e) {
        console.warn('[Loads] Failed to restore posted loads', e);
      }
    };
    bootstrap();
    return () => { mounted = false; };
  }, [mergeUniqueById]);

  useEffect(() => {
    if (isLoading) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        if (isLoading) console.log('[Loads] Network seems slow…');
      }, 1500);
    } else if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    return () => { if (slowTimerRef.current) { clearTimeout(slowTimerRef.current); slowTimerRef.current = null; } };
  }, [isLoading]);

  // Always return the same structure - no conditional hooks
  const value = useMemo(() => ({
    loads,
    filters,
    isLoading,
    filteredLoads,
    aiRecommendedLoads,
    currentLoad,
    favorites,
    isFavorited,
    toggleFavorite,
    setFilters: setFiltersCallback,
    acceptLoad,
    refreshLoads,
    addLoad,
    addLoadsBulk,
  }), [loads, filters, isLoading, filteredLoads, aiRecommendedLoads, currentLoad, favorites, isFavorited, toggleFavorite, setFiltersCallback, acceptLoad, refreshLoads, addLoad, addLoadsBulk]);

  return value;
});

export function useLoadsWithToast(): LoadsWithToast {
  // Always call hooks in the same order
  const { acceptLoad, refreshLoads, addLoad, addLoadsBulk } = useLoads();
  const { show } = useToast();
  const { online } = useOnlineStatus();

  const acceptLoadWithToast = useCallback(async (loadId: string) => {
    try {
      if (!online) {
        show('Offline: action will sync later', 'warning', 2500);
      }
      await acceptLoad(loadId);
      show('Load accepted', 'success', 1800);
    } catch (error) {
      show('Failed to accept load. Tap to retry.', 'error', 2800);
      throw error;
    }
  }, [acceptLoad, show, online]);

  const refreshLoadsWithToast = useCallback(async () => {
    try {
      if (!online) {
        show('Offline: showing cached loads', 'warning', 2200);
      }
      await refreshLoads();
    } catch (error) {
      show('Failed to refresh. Pull to retry.', 'error', 2500);
      throw error;
    }
  }, [refreshLoads, show, online]);

  const addLoadWithToast = useCallback(async (load: Load) => {
    try {
      await addLoad(load);
      show('Load posted', 'success', 1800);
    } catch (error) {
      show('Failed to post load. Try again.', 'error', 2400);
      throw error;
    }
  }, [addLoad, show]);

  const addLoadsBulkWithToast = useCallback(async (incoming: Load[]) => {
    try {
      await addLoadsBulk(incoming);
      show('Imported loads', 'success', 1600);
    } catch (error) {
      show('Bulk import failed', 'error', 2200);
      throw error;
    }
  }, [addLoadsBulk, show]);

  return {
    acceptLoadWithToast,
    refreshLoadsWithToast,
    addLoadWithToast,
    addLoadsBulkWithToast,
  };
}