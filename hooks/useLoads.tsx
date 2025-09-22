import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Load, VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { LOADS_COLLECTION, LOAD_STATUS } from '@/lib/loadSchema';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where, QueryConstraint } from 'firebase/firestore';
import { getCache, setCache } from '@/utils/simpleCache';
import { startAudit, endAudit, auditAsync } from '@/utils/performanceAudit';

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
  refreshMyPostedLoads: () => Promise<void>;
  addLoad: (load: Load) => Promise<void>;
  addLoadsBulk: (incoming: Load[]) => Promise<void>;
  deleteLoad: (loadId: string) => Promise<void>;
  deleteCompletedLoad: (loadId: string) => Promise<void>;
  lastSyncTime: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  updateLoadStatus: (loadId: string, status: LoadStatus) => Promise<void>;
}

export interface LoadsWithToast {
  acceptLoadWithToast: (loadId: string) => Promise<void>;
  refreshLoadsWithToast: () => Promise<void>;
  refreshMyPostedLoadsWithToast: () => Promise<void>;
  addLoadWithToast: (load: Load) => Promise<void>;
  addLoadsBulkWithToast: (incoming: Load[]) => Promise<void>;
  deleteLoadWithToast: (loadId: string) => Promise<void>;
  deleteCompletedLoadWithToast: (loadId: string) => Promise<void>;
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

const [LoadsProviderInternal, useLoadsInternal] = createContextHook<LoadsState>(() => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [filters, setFilters] = useState<LoadFilters>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const { online } = useOnlineStatus();
  const { user } = useAuth();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const USER_POSTED_LOADS_KEY = 'userPostedLoads';
  const CACHE_KEY = 'cache:loads:open:v1';
  const BOARD_VISIBILITY_DAYS: number | null = null;

  const mergeUniqueById = useCallback((primary: Load[], extras: Load[]): Load[] => {
    console.log('[PERF_AUDIT] Merge unique loads - start', { primaryCount: primary.length, extrasCount: extras.length });
    const startTime = performance.now();
    
    const map = new Map<string, Load>();
    for (const l of extras) map.set(l.id, l);
    for (const l of primary) if (!map.has(l.id)) map.set(l.id, l);
    const result = Array.from(map.values());
    
    const endTime = performance.now();
    console.log('[PERF_AUDIT] Merge unique loads - complete', { 
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      resultCount: result.length
    });
    
    return result;
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
    console.log('[PERF_AUDIT] Filtering loads - start', { loadsCount: loads.length, filtersCount: Object.keys(filters).length });
    console.log('[LOADS_DEBUG] Current filters:', filters);
    const startTime = performance.now();
    
    const result = loads.filter(load => {
      // Log each filter check for debugging
      if (filters.vehicleType && load.vehicleType !== filters.vehicleType) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by vehicleType: ${load.vehicleType} !== ${filters.vehicleType}`);
        return false;
      }
      if (filters.minRate && load.rate < filters.minRate) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by minRate: ${load.rate} < ${filters.minRate}`);
        return false;
      }
      if (filters.maxDistance && load.distance > filters.maxDistance) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by maxDistance: ${load.distance} > ${filters.maxDistance}`);
        return false;
      }
      if (filters.origin && !load.origin.city.toLowerCase().includes((filters.origin ?? '').toLowerCase())) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by origin: ${load.origin.city} doesn't include ${filters.origin}`);
        return false;
      }
      if (filters.destination && !load.destination.city.toLowerCase().includes((filters.destination ?? '').toLowerCase())) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by destination: ${load.destination.city} doesn't include ${filters.destination}`);
        return false;
      }
      if (filters.showBackhaul !== undefined && load.isBackhaul !== filters.showBackhaul) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by backhaul: ${load.isBackhaul} !== ${filters.showBackhaul}`);
        return false;
      }
      if (filters.backhaulCenter) {
        const radius = filters.backhaulRadiusMiles ?? 50;
        const miles = haversineMiles(
          { lat: load.origin.lat, lng: load.origin.lng },
          { lat: filters.backhaulCenter.lat, lng: filters.backhaulCenter.lng }
        );
        if (miles > radius) {
          console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by backhaul radius: ${miles} > ${radius}`);
          return false;
        }
      }
      
      // LOADS_RESTORE_FIX: Show all loads regardless of status for debugging
      // Only filter by status if explicitly set
      const statusCheck = load.status === 'available' || load.status === 'pending' || load.status === 'posted';
      if (!statusCheck) {
        console.log(`[LOADS_DEBUG] Load ${load.id} filtered out by status: ${load.status}`);
        return false;
      }
      
      console.log(`[LOADS_DEBUG] Load ${load.id} passed all filters`);
      return true;
    });
    
    const endTime = performance.now();
    console.log('[PERF_AUDIT] Filtering loads - complete', { 
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      inputCount: loads.length,
      outputCount: result.length,
      filtersApplied: Object.keys(filters).length
    });
    
    console.log(`[LOADS_RESTORE_FIX] 📊 Filtering result: ${loads.length} total → ${result.length} filtered`);
    
    return result;
  }, [loads, filters, haversineMiles]);

  const aiRecommendedLoads = useMemo(() => {
    console.log('[PERF_AUDIT] AI recommended loads - start', { loadsCount: loads.length });
    const startTime = performance.now();
    
    const result = loads
      .filter(load => load.aiScore && load.aiScore > 85 && load.status === 'available')
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
      // UNLIMITED LOADS: Removed .slice(0, 5) to show all AI recommended loads
    
    const endTime = performance.now();
    console.log('[PERF_AUDIT] AI recommended loads - complete', { 
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      resultCount: result.length
    });
    
    return result;
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
      console.log('[Loads] Load accepted - Navigating to pickup');
    } catch (error) {
      console.error('Failed to accept load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [online]);

  const updateLoadStatus = useCallback(async (loadId: string, status: LoadStatus) => {
    setIsLoading(true);
    try {
      if (!online) {
        console.log('[Loads] Offline: status update will sync later');
      }
      setLoads(prevLoads => 
        prevLoads.map(load => 
          load.id === loadId 
            ? { ...load, status }
            : load
        )
      );
      console.log(`[Loads] Load ${loadId} status updated to ${status}`);
    } catch (error) {
      console.error('Failed to update load status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [online]);

  const reviveLoad = useCallback((raw: any): Load => {
    const pickupDate = new Date(raw.pickupDate);
    const deliveryDate = new Date(raw.deliveryDate);
    return {
      id: String(raw.id),
      shipperId: String(raw.shipperId),
      shipperName: String(raw.shipperName ?? ''),
      origin: {
        address: String(raw.origin?.address ?? ''),
        city: String(raw.origin?.city ?? ''),
        state: String(raw.origin?.state ?? ''),
        zipCode: String(raw.origin?.zipCode ?? ''),
        lat: Number(raw.origin?.lat ?? 0),
        lng: Number(raw.origin?.lng ?? 0),
      },
      destination: {
        address: String(raw.destination?.address ?? ''),
        city: String(raw.destination?.city ?? ''),
        state: String(raw.destination?.state ?? ''),
        zipCode: String(raw.destination?.zipCode ?? ''),
        lat: Number(raw.destination?.lat ?? 0),
        lng: Number(raw.destination?.lng ?? 0),
      },
      distance: Number(raw.distance ?? 0),
      weight: Number(raw.weight ?? 0),
      vehicleType: raw.vehicleType as any,
      rate: Number(raw.rate ?? 0),
      ratePerMile: Number(raw.ratePerMile ?? 0),
      pickupDate: isNaN(pickupDate.getTime()) ? new Date() : pickupDate,
      deliveryDate: isNaN(deliveryDate.getTime()) ? new Date() : deliveryDate,
      status: (raw.status as any) ?? 'available',
      description: String(raw.description ?? ''),
      special_requirements: Array.isArray(raw.special_requirements) ? raw.special_requirements.map(String) : undefined,
      assignedDriverId: raw.assignedDriverId ? String(raw.assignedDriverId) : undefined,
      isBackhaul: Boolean(raw.isBackhaul),
      aiScore: typeof raw.aiScore === 'number' ? raw.aiScore : undefined,
      bulkImportId: raw.bulkImportId ? String(raw.bulkImportId) : undefined,
    };
  }, []);

  const isExpired = useCallback((l: Load) => {
    const d = l.deliveryDate instanceof Date ? l.deliveryDate : new Date(l.deliveryDate as unknown as string);
    const ts = d.getTime();
    if (isNaN(ts)) return false;

    if (BOARD_VISIBILITY_DAYS === null) {
      console.log(`[Loads] VISIBILITY - Unlimited mode: keeping load ${l.id} on board`);
      return false;
    }

    const cutoffMs = Date.now() - (BOARD_VISIBILITY_DAYS * 24 * 60 * 60 * 1000);
    const expired = ts < cutoffMs;

    if (expired) {
      console.log(`[Loads] VISIBILITY - Load ${l.id} hidden from board (delivery ${d.toISOString()} is > ${BOARD_VISIBILITY_DAYS} days old)`);
    } else {
      console.log(`[Loads] VISIBILITY - Load ${l.id} visible (delivery within ${BOARD_VISIBILITY_DAYS} days)`);
    }

    return expired;
  }, []);

  const readPersisted = useCallback(async () => {
    const persistedRaw = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
    const persistedArr: any[] = persistedRaw ? JSON.parse(persistedRaw) : [];
    const revived = persistedArr.map(reviveLoad);
    
    // ENFORCE LOAD RULES: Return all history loads (no auto-cleanup)
    // History keeps everything until manual profile delete
    console.log(`[Loads] ENFORCE RULES - Loaded ${revived.length} loads from history (no auto-cleanup)`);
    return revived;
  }, [USER_POSTED_LOADS_KEY, reviveLoad]);

  const refreshLoads = useCallback(async () => {
    console.log('[LOADS_RESTORE] 🚀 Starting simple load restoration...');
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // Get persisted loads from local storage
      const persisted = await readPersisted();
      console.log(`[LOADS_RESTORE] 📂 Found ${persisted.length} persisted loads`);
      
      // Always merge with mock loads to ensure we have data
      const allLoads = mergeUniqueById(mockLoads, persisted);
      console.log(`[LOADS_RESTORE] 📊 Total loads: ${mockLoads.length} mock + ${persisted.length} persisted = ${allLoads.length}`);
      
      // Set the loads immediately
      setLoads(allLoads);
      setLastSyncTime(new Date());
      setSyncStatus('idle');
      
      console.log(`[LOADS_RESTORE] ✅ Successfully restored ${allLoads.length} loads`);
      
    } catch (error: any) {
      console.warn('[LOADS_RESTORE] Error during refresh, using mock data:', error);
      setLoads([...mockLoads]);
      setSyncStatus('idle');
    } finally {
      setIsLoading(false);
    }
  }, [mergeUniqueById, readPersisted]);

  const refreshMyPostedLoads = useCallback(async () => {
    console.log('[MY_POSTED_LOADS] 🚀 Starting my posted loads query...');
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      const authed = await ensureFirebaseAuth();
      const { db } = getFirebase();
      
      if (!authed || !db || !user?.id) {
        console.warn('[MY_POSTED_LOADS] Auth failed or no user, falling back to persisted data');
        const persisted = await readPersisted();
        const myLoads = persisted.filter(load => 
          load.shipperId === user?.id || (load as any).createdBy === user?.id
        );
        setLoads(myLoads);
        setLastSyncTime(new Date());
        setSyncStatus('idle');
        return;
      }
      
      // Query loads created by current user, newest first
      const myLoadsQuery = query(
        collection(db, LOADS_COLLECTION),
        where("createdBy", "==", user.id),
        orderBy("createdAt", "desc")
      );
      
      const snap = await getDocs(myLoadsQuery);
      console.log(`[MY_POSTED_LOADS] 📊 Found ${snap.docs.length} loads created by user`);
      
      const docs = snap.docs.map((doc) => {
        const d: any = doc.data();
        
        // Skip archived loads
        if (d?.isArchived === true) return null;
        
        const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
        const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
        
        // Handle multiple field formats for cross-platform compatibility - tolerant to old docs
        const originText = typeof d?.origin === "object"
          ? d.origin?.city
          : (d?.originCity || '');
        const originState = typeof d?.origin === "object"
          ? d.origin?.state
          : (d?.originState || '');
        const destText = typeof d?.destination === "object"
          ? d.destination?.city
          : (d?.destCity || '');
        const destState = typeof d?.destination === "object"
          ? d.destination?.state
          : (d?.destState || '');
        
        const rateVal = d?.rate ?? d?.rateAmount ?? d?.rateTotalUSD ?? 0;
        
        const mapped: Load = {
          id: String(doc.id),
          shipperId: String(d?.createdBy ?? 'unknown'),
          shipperName: '',
          origin: { address: '', city: originText, state: originState, zipCode: '', lat: 0, lng: 0 },
          destination: { address: '', city: destText, state: destState, zipCode: '', lat: 0, lng: 0 },
          distance: Number(d?.distance ?? d?.distanceMi ?? 0),
          weight: Number(d?.weight ?? d?.weightLbs ?? 0),
          vehicleType: (d?.vehicleType ?? d?.equipmentType as any) ?? 'cargo-van',
          rate: Number(rateVal),
          ratePerMile: 0,
          pickupDate: pickup,
          deliveryDate: delivery,
          status: d?.status || 'available',
          description: String(d?.title ?? d?.description ?? ''),
          special_requirements: undefined,
          isBackhaul: false,
          bulkImportId: d?.bulkImportId ? String(d.bulkImportId) : undefined,
        };
        return mapped;
      }).filter((x): x is Load => x !== null);
      
      // Merge with persisted loads to ensure we have complete history
      const persisted = await readPersisted();
      const myPersistedLoads = persisted.filter(load => 
        load.shipperId === user.id || (load as any).createdBy === user.id
      );
      
      const mergedLoads = mergeUniqueById(docs, myPersistedLoads);
      
      console.log(`[MY_POSTED_LOADS] ✅ Successfully loaded ${mergedLoads.length} my posted loads`);
      setLoads(mergedLoads);
      setLastSyncTime(new Date());
      setSyncStatus('idle');
      
    } catch (error: any) {
      console.warn('[MY_POSTED_LOADS] Error during query, using persisted data:', error);
      try {
        const persisted = await readPersisted();
        const myLoads = persisted.filter(load => 
          load.shipperId === user?.id || (load as any).createdBy === user?.id
        );
        setLoads(myLoads);
      } catch {
        setLoads([]);
      }
      setSyncStatus('idle');
    } finally {
      setIsLoading(false);
    }
  }, [mergeUniqueById, readPersisted, user]);

  const addLoad = useCallback(async (load: Load) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // ENFORCE LOAD RULES: Post to both history and live board
      console.log('[Loads] ENFORCE RULES - Posting load to both history and live board');
      
      // Add to live board (unlimited visibility - no date filter)
      setLoads(prev => mergeUniqueById([load, ...prev], []));
      
      // ENFORCE LOAD RULES: Save to history (persistent until manual profile delete)
      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const parsedRaw: any[] = existingLoads ? JSON.parse(existingLoads) : [];
        const parsed = parsedRaw.map(reviveLoad);
        
        // ENFORCE LOAD RULES: Keep all loads in history, only filter for board display
        const updated = mergeUniqueById([], [load, ...parsed]);
        await AsyncStorage.setItem(USER_POSTED_LOADS_KEY, JSON.stringify(updated));
        console.log('[Loads] ENFORCE RULES - Load saved to history (permanent until profile delete)');
        console.log('[Loads] ENFORCE RULES - Load posted to live board (unlimited visibility)');
      } catch (storageError) {
        console.warn('[Loads] Failed to save to AsyncStorage, but load added to memory:', storageError);
      }
    } catch (error) {
      console.error('Failed to add load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mergeUniqueById, reviveLoad]);

  const addLoadsBulk = useCallback(async (incoming: Load[]) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoads(prev => mergeUniqueById([...incoming, ...prev], []));
      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const parsedRaw: any[] = existingLoads ? JSON.parse(existingLoads) : [];
        const parsed = parsedRaw.map(reviveLoad);
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
  }, [mergeUniqueById, reviveLoad, isExpired]);

  const deleteLoad = useCallback(async (loadId: string) => {
    setIsLoading(true);
    try {
      if (!online) {
        console.log('[Loads] Offline: delete will sync later');
      }
      
      // Try Firebase delete first
      try {
        const authed = await ensureFirebaseAuth();
        const { db } = getFirebase();
        if (authed && db) {
          const { deleteDoc, doc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'loads', loadId));
          console.log('[Loads] Load deleted from Firebase:', loadId);
        }
      } catch (firebaseError) {
        console.warn('[Loads] Firebase delete failed, continuing with local delete:', firebaseError);
      }
      
      // Remove from local state
      setLoads(prevLoads => prevLoads.filter(load => load.id !== loadId));
      
      // Remove from AsyncStorage
      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        if (existingLoads) {
          const parsedRaw: any[] = JSON.parse(existingLoads);
          const updated = parsedRaw.filter(load => String(load.id) !== loadId);
          await AsyncStorage.setItem(USER_POSTED_LOADS_KEY, JSON.stringify(updated));
          console.log('[Loads] Load removed from AsyncStorage:', loadId);
        }
      } catch (storageError) {
        console.warn('[Loads] Failed to remove from AsyncStorage:', storageError);
      }
      
      console.log('[Loads] Load deleted successfully:', loadId);
    } catch (error) {
      console.error('Failed to delete load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [online]);

  const deleteCompletedLoad = useCallback(async (loadId: string) => {
    setIsLoading(true);
    try {
      // ENFORCE LOAD RULES: Manual profile delete - remove from history permanently
      console.log('[Loads] ENFORCE RULES - Manual profile delete for load:', loadId);
      
      // Remove from local state (board)
      setLoads(prevLoads => prevLoads.filter(load => load.id !== loadId));
      
      // ENFORCE LOAD RULES: Remove from history (manual profile delete)
      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        if (existingLoads) {
          const parsedRaw: any[] = JSON.parse(existingLoads);
          const updated = parsedRaw.filter(load => String(load.id) !== loadId);
          await AsyncStorage.setItem(USER_POSTED_LOADS_KEY, JSON.stringify(updated));
          console.log('[Loads] ENFORCE RULES - Load permanently deleted from history');
        }
      } catch (storageError) {
        console.warn('[Loads] Failed to remove from history:', storageError);
      }
      
      // Remove from accepted loads history
      try {
        const acceptedLoads = await AsyncStorage.getItem('acceptedLoads');
        if (acceptedLoads) {
          const accepted = JSON.parse(acceptedLoads);
          const updated = accepted.filter((id: string) => id !== loadId);
          await AsyncStorage.setItem('acceptedLoads', JSON.stringify(updated));
        }
      } catch (storageError) {
        console.warn('[Loads] Failed to remove from accepted loads history:', storageError);
      }
      
      console.log('[Loads] ENFORCE RULES - Load permanently removed from profile history:', loadId);
    } catch (error) {
      console.error('Failed to delete completed load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // LOADS_DISAPPEAR_FIX: Robust real-time listener with auto-reconnection
  useEffect(() => {
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    
    console.log('[LOADS_DISAPPEAR_FIX] Setting up robust real-time listener with auto-reconnection...');
    
    const startCrossPlatformListener = async () => {
      try {
        if (!mounted) {
          console.log('[LOADS_DISAPPEAR_FIX] Component unmounted, skipping listener setup');
          return;
        }
        
        if (!online) {
          console.log('[LOADS_DISAPPEAR_FIX] Offline - will retry when online');
          // TIMEOUT DISABLED: Drivers need unlimited time to browse loads
          // Retry when back online
          // reconnectTimer = setTimeout(startCrossPlatformListener, 5000);
          return;
        }
        
        // TIMEOUT DISABLED: Allow unlimited time for auth to complete
        // Quick auth check with timeout
        const authed = await ensureFirebaseAuth();
        
        const { db } = getFirebase();
        if (!mounted || !authed || !db) {
          console.log('[LOADS_DISAPPEAR_FIX] Auth failed or component unmounted - will retry');
          if (mounted) {
            // TIMEOUT DISABLED: Drivers need unlimited time to browse loads
            // reconnectTimer = setTimeout(startCrossPlatformListener, 10000);
          }
          return;
        }
        
        // Clean up existing listener
        if (unsubscribeRef.current) {
          console.log('[LOADS_DISAPPEAR_FIX] Cleaning up existing listener');
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        
        console.log('[LOADS_DISAPPEAR_FIX] Starting robust real-time listener...');
        
        // Updated query to read active loads, newest first
        const activeLoadsQuery = query(
          collection(db, LOADS_COLLECTION),
          where("status", "==", "active"),
          orderBy("createdAt", "desc")
        );
        
        unsubscribeRef.current = onSnapshot(activeLoadsQuery, async (snap) => {
          try {
            if (!mounted) {
              console.log('[LOADS_DISAPPEAR_FIX] Component unmounted during snapshot processing');
              return;
            }
            
            console.log(`[LOADS_DISAPPEAR_FIX] Real-time update received - ${snap.docs.length} documents`);
            
            const docs = snap.docs.map((doc) => {
              const d: any = doc.data();
              
              // Skip archived loads
              if (d?.isArchived === true) return null;
              
              const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
              const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
              
              // Handle multiple field formats for cross-platform compatibility - tolerant to old docs
              const originText = typeof d?.origin === "object"
                ? d.origin?.city
                : (d?.originCity || '');
              const originState = typeof d?.origin === "object"
                ? d.origin?.state
                : (d?.originState || '');
              const destText = typeof d?.destination === "object"
                ? d.destination?.city
                : (d?.destCity || '');
              const destState = typeof d?.destination === "object"
                ? d.destination?.state
                : (d?.destState || '');
              
              const rateVal = d?.rate ?? d?.rateAmount ?? d?.rateTotalUSD ?? 0;
              
              const mapped: Load = {
                id: String(doc.id),
                shipperId: String(d?.createdBy ?? 'unknown'),
                shipperName: '',
                origin: { address: '', city: originText, state: originState, zipCode: '', lat: 0, lng: 0 },
                destination: { address: '', city: destText, state: destState, zipCode: '', lat: 0, lng: 0 },
                distance: Number(d?.distance ?? d?.distanceMi ?? 0),
                weight: Number(d?.weight ?? d?.weightLbs ?? 0),
                vehicleType: (d?.vehicleType ?? d?.equipmentType as any) ?? 'cargo-van',
                rate: Number(rateVal),
                ratePerMile: 0,
                pickupDate: pickup,
                deliveryDate: delivery,
                status: 'available',
                description: String(d?.title ?? d?.description ?? ''),
                special_requirements: undefined,
                isBackhaul: false,
                bulkImportId: d?.bulkImportId ? String(d.bulkImportId) : undefined,
              };
              return mapped;
            }).filter((x): x is Load => x !== null);
            
            const persisted = await readPersisted();
            const mergedLoads = mergeUniqueById(docs, persisted);
            
            // LOADS_RESTORE_FIX: Show ALL loads - no expiration filtering
            const boardLoads = mergedLoads;
            
            // LOADS_RESTORE_FIX: Always show all available loads
            console.log(`[LOADS_RESTORE_FIX] 📊 Real-time update: ${boardLoads.length} loads now visible`);
            setLoads(boardLoads);
            
            setLastSyncTime(new Date());
            setSyncStatus('idle');
            
            // LOADS_RESTORE_FIX: Cache all loads for persistence
            try { 
              await setCache<Load[]>(CACHE_KEY, boardLoads, 30 * 60 * 1000); // 30 minutes cache
              console.log(`[LOADS_RESTORE_FIX] 💾 Cached ${boardLoads.length} loads for persistence`);
            } catch (cacheErr) {
              console.warn('[LOADS_RESTORE_FIX] Cache update failed:', cacheErr);
            }
            
            console.log(`[LOADS_RESTORE_FIX] ✅ Real-time sync complete - ${boardLoads.length} loads visible`);
            console.log(`[LOADS_RESTORE_FIX] ♾️ All loads restored and visible!`);
            
          } catch (e) {
            console.warn('[LOADS_DISAPPEAR_FIX] Snapshot processing failed:', e);
            // Fallback to ensure loads don't disappear
            if (mounted) {
              const persisted = await readPersisted();
              const fallbackLoads = mergeUniqueById(mockLoads, persisted);
              setLoads(fallbackLoads.filter(l => !isExpired(l)));
            }
          }
        }, async (err) => {
          console.error('[LOADS_DISAPPEAR_FIX] Real-time listener error:', (err as any)?.code || (err as any)?.message);
          
          // LOADS_RESTORE_FIX: Aggressive fallback to restore loads
          if (mounted) {
            try {
              const persisted = await readPersisted();
              const fallbackLoads = persisted; // Use only real persisted data
              setLoads(fallbackLoads); // Show all without expiration filtering
              console.log(`[LOADS_RESTORE_FIX] Applied fallback - restored ${fallbackLoads.length} loads`);
            } catch (fallbackErr) {
              console.warn('[LOADS_RESTORE_FIX] Fallback failed:', fallbackErr);
              setLoads([]); // Empty state instead of mock data
            }
          }
          
          // Auto-reconnect after error
          if (mounted) {
            console.log('[LOADS_DISAPPEAR_FIX] Auto-reconnect disabled - drivers need unlimited time');
            // TIMEOUT DISABLED: Drivers need unlimited time to browse loads
            // reconnectTimer = setTimeout(startCrossPlatformListener, 15000);
          }
        });
        
        // LOADS_DISAPPEAR_FIX: Set up heartbeat to detect connection issues
        heartbeatTimer = setInterval(() => {
          if (mounted && unsubscribeRef.current) {
            console.log('[LOADS_DISAPPEAR_FIX] Heartbeat - listener still active');
          } else if (mounted) {
            console.warn('[LOADS_DISAPPEAR_FIX] Heartbeat detected disconnected listener, reconnecting...');
            startCrossPlatformListener();
          }
        }, 60000); // Check every minute
        
        console.log('[LOADS_DISAPPEAR_FIX] ✅ Robust real-time listener established with heartbeat monitoring');
        
      } catch (e) {
        console.warn('[LOADS_DISAPPEAR_FIX] Failed to start real-time listener:', e);
        // LOADS_RESTORE_FIX: Ensure loads are always restored
        if (mounted) {
          try {
            const persisted = await readPersisted();
            const fallbackLoads = persisted; // Use only real data
            setLoads(fallbackLoads); // Show all without filtering
            console.log(`[LOADS_RESTORE_FIX] Listener setup fallback - restored ${fallbackLoads.length} loads`);
          } catch {
            setLoads([]); // Empty state instead of mock
          }
        }
      }
    };
    
    // Start listener after a short delay to avoid blocking initial render
    const timeoutId = setTimeout(startCrossPlatformListener, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (unsubscribeRef.current) {
        console.log('[LOADS_DISAPPEAR_FIX] Cleaning up listener on unmount');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [online, mergeUniqueById, readPersisted, isExpired]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        console.log('[LOADS_RESTORE] 🚀 Initial bootstrap - loading mock and persisted data...');
        const persisted = await readPersisted();
        if (!mounted) return;
        
        // Always start with mock loads and merge with persisted
        const allLoads = mergeUniqueById(mockLoads, persisted);
        console.log(`[LOADS_RESTORE] 📊 Bootstrap complete: ${mockLoads.length} mock + ${persisted.length} persisted = ${allLoads.length} total`);
        setLoads(allLoads);
      } catch (e) {
        console.warn('[LOADS_RESTORE] Bootstrap failed, using mock data only:', e);
        if (mounted) {
          setLoads([...mockLoads]);
        }
      }
    };
    bootstrap();
    return () => { mounted = false; };
  }, [mergeUniqueById, readPersisted]);

  useEffect(() => {
    if (isLoading) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        if (isLoading) console.log('[Loads] Optimizing query - Please wait');
      }, 1500);
    } else if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    return () => { if (slowTimerRef.current) { clearTimeout(slowTimerRef.current); slowTimerRef.current = null; } };
  }, [isLoading]);

  // Always return the same structure - no conditional hooks
  const value = useMemo(() => {
    const result: LoadsState = {
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
      refreshMyPostedLoads,
      addLoad,
      addLoadsBulk,
      deleteLoad,
      deleteCompletedLoad,
      lastSyncTime,
      syncStatus,
      updateLoadStatus,
    };
    return result;
  }, [loads, filters, isLoading, filteredLoads, aiRecommendedLoads, currentLoad, favorites, isFavorited, toggleFavorite, setFiltersCallback, acceptLoad, refreshLoads, refreshMyPostedLoads, addLoad, addLoadsBulk, deleteLoad, deleteCompletedLoad, lastSyncTime, syncStatus, updateLoadStatus]);

  return value;
});

export const LoadsProvider = LoadsProviderInternal;

export function useLoads(): LoadsState {
  // Always call the hook first to maintain hook order
  const context = useLoadsInternal();
  
  // Then handle the error cases
  if (!context) {
    console.warn('[useLoads] Context is null, returning default state');
    return getDefaultLoadsState();
  }
  
  return context;
}

function getDefaultLoadsState(): LoadsState {
  return {
    loads: [],
    filters: {},
    isLoading: false,
    filteredLoads: [],
    aiRecommendedLoads: [],
    currentLoad: undefined,
    favorites: {},
    isFavorited: () => false,
    toggleFavorite: async () => {},
    setFilters: () => {},
    acceptLoad: async () => {},
    refreshLoads: async () => {},
    refreshMyPostedLoads: async () => {},
    addLoad: async () => {},
    addLoadsBulk: async () => {},
    deleteLoad: async () => {},
    deleteCompletedLoad: async () => {},
    lastSyncTime: null,
    syncStatus: 'idle',
    updateLoadStatus: async () => {},
  };
}

export function useLoadsWithToast(): LoadsWithToast {
  // Always call hooks in the same order
  const { acceptLoad, refreshLoads, refreshMyPostedLoads, addLoad, addLoadsBulk, deleteLoad, deleteCompletedLoad } = useLoads();
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

  const refreshMyPostedLoadsWithToast = useCallback(async () => {
    try {
      if (!online) {
        show('Offline: showing cached loads', 'warning', 2200);
      }
      await refreshMyPostedLoads();
      show('My posted loads updated', 'success', 1500);
    } catch (error) {
      show('Failed to refresh my loads', 'error', 2500);
      throw error;
    }
  }, [refreshMyPostedLoads, show, online]);

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

  const deleteLoadWithToast = useCallback(async (loadId: string) => {
    try {
      await deleteLoad(loadId);
      show('Load deleted', 'success', 1800);
    } catch (error) {
      show('Failed to delete load', 'error', 2400);
      throw error;
    }
  }, [deleteLoad, show]);

  const deleteCompletedLoadWithToast = useCallback(async (loadId: string) => {
    try {
      await deleteCompletedLoad(loadId);
      show('Load removed from history', 'success', 1800);
    } catch (error) {
      show('Failed to remove load', 'error', 2400);
      throw error;
    }
  }, [deleteCompletedLoad, show]);

  return {
    acceptLoadWithToast,
    refreshLoadsWithToast,
    refreshMyPostedLoadsWithToast,
    addLoadWithToast,
    addLoadsBulkWithToast,
    deleteLoadWithToast,
    deleteCompletedLoadWithToast,
  };
}