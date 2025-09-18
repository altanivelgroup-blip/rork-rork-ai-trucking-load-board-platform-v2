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
  const [loads, setLoads] = useState<Load[]>(mockLoads);
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
    const startTime = performance.now();
    
    const result = loads.filter(load => {
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
    
    const endTime = performance.now();
    console.log('[PERF_AUDIT] Filtering loads - complete', { 
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      inputCount: loads.length,
      outputCount: result.length
    });
    
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
    // ENFORCE LOAD RULES: Enhanced archiving logic with 7-day auto-delete for board visibility
    // History: Keep until manual profile delete
    // Board: Auto-delete 7 days after delivery date (regardless of status)
    const d = l.deliveryDate instanceof Date ? l.deliveryDate : new Date(l.deliveryDate as unknown as string);
    const ts = d.getTime();
    if (isNaN(ts)) return false;
    
    // ENFORCE LOAD RULES: Auto-delete from board after 7 days post-delivery
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const isPastSevenDays = ts < sevenDaysAgo;
    
    // ENFORCE LOAD RULES: All loads auto-expire from board after 7 days
    // This ensures fresh load visibility and prevents stale listings
    const shouldExpire = isPastSevenDays;
    
    if (shouldExpire) {
      console.log(`[Loads] ENFORCE RULES - Load ${l.id} auto-deleting from board - delivery: ${d.toISOString()} (7+ days ago)`);
    } else {
      console.log(`[Loads] ENFORCE RULES - Load ${l.id} remains on board - delivery: ${d.toISOString()} (within 7 days)`);
    }
    
    return shouldExpire;
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
    console.log('[CROSS-PLATFORM] Starting universal load sync across all platforms...');
    startAudit('refreshLoads', { source: 'useLoads' });
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      // Load from cache first for immediate UI response
      try {
        startAudit('cache-check', { key: CACHE_KEY });
        const cached = await getCache<Load[]>(CACHE_KEY);
        endAudit('cache-check', { hit: cached.hit, dataLength: cached.data?.length });
        if (cached.hit && Array.isArray(cached.data)) {
          console.log('[CROSS-PLATFORM] Loading from cache for immediate display...');
          setLoads(cached.data ?? []);
        }
      } catch (cacheErr) {
        console.warn('[CROSS-PLATFORM] Cache check failed', cacheErr);
      }
      
      if (!online) {
        console.log('[CROSS-PLATFORM] Offline: showing cached loads');
        startAudit('offline-persisted-read');
        const persisted = await readPersisted();
        endAudit('offline-persisted-read', { count: persisted.length });
        setLoads(prev => mergeUniqueById(mockLoads, persisted));
        setSyncStatus('idle');
        endAudit('refreshLoads', { success: true, mode: 'offline' });
        return;
      }

      // CROSS-PLATFORM FIX: Simplified Firebase query for maximum compatibility
      console.log('[CROSS-PLATFORM] Ensuring Firebase authentication...');
      startAudit('firebase-auth');
      const authed = await ensureFirebaseAuth();
      endAudit('firebase-auth', { success: authed });
      const { db } = getFirebase();
      
      if (!authed || !db) {
        console.log('[CROSS-PLATFORM] Auth unavailable - using cached + local data fallback');
        startAudit('fallback-persisted-read');
        const persisted = await readPersisted();
        endAudit('fallback-persisted-read', { count: persisted.length });
        setLoads(mergeUniqueById(mockLoads, persisted));
        endAudit('refreshLoads', { success: true, mode: 'fallback' });
        return;
      }
      
      console.log('[CROSS-PLATFORM] Firebase authenticated, using simplified query for cross-platform compatibility');

      let snap;
      try {
        // CROSS-PLATFORM FIX: Use the simplest possible query to avoid index/permission issues
        console.log('[CROSS-PLATFORM] UNLIMITED LOADS - Using simplified query without limits or complex constraints...');
        startAudit('firestore-query-simple', { collection: LOADS_COLLECTION });
        
        const simpleQuery = query(
          collection(db, LOADS_COLLECTION)
          // UNLIMITED LOADS: Completely removed limit() to show ALL available loads across platforms
          // This ensures shippers can see all their posted loads and drivers can see all available loads
        );
        
        const simpleFetch = getDocs(simpleQuery);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('QUERY_TIMEOUT')), 8000));
        snap = await Promise.race([simpleFetch, timeout]) as typeof snap;
        
        console.log(`[CROSS-PLATFORM] Simple query successful - found ${snap.docs.length} documents`);
        endAudit('firestore-query-simple', { success: true, docCount: snap.docs.length });
        
      } catch (e: any) {
        console.error('[CROSS-PLATFORM] Simple query failed:', e?.code || e?.message);
        endAudit('firestore-query-simple', { success: false, error: e?.code || e?.message });
        
        // Final fallback to local data
        console.warn('[CROSS-PLATFORM] All Firebase queries failed. Using local data.');
        const persisted = await readPersisted();
        setLoads(mergeUniqueById(mockLoads, persisted));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
        endAudit('refreshLoads', { success: true, mode: 'final-fallback' });
        return;
      }

      const toLoad = (doc: any): Load | null => {
        const d = doc.data?.() ?? doc.data();
        if (d?.isArchived === true) return null;
        const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
        const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
        
        // Handle both structured and friendly fallback fields for origin/destination
        const originCity = d?.origin?.city || d?.originCity || 'Unknown';
        const originState = d?.origin?.state || d?.originState || '';
        const destCity = d?.destination?.city || d?.destCity || 'Unknown';
        const destState = d?.destination?.state || d?.destState || '';
        
        return {
          id: String(doc.id),
          shipperId: String(d?.createdBy ?? 'unknown'),
          shipperName: '',
          origin: {
            address: '',
            city: originCity,
            state: originState,
            zipCode: '',
            lat: 0,
            lng: 0,
          },
          destination: {
            address: '',
            city: destCity,
            state: destState,
            zipCode: '',
            lat: 0,
            lng: 0,
          },
          distance: Number(d?.distance ?? 0),
          weight: Number(d?.weight ?? d?.weightLbs ?? 0),
          vehicleType: (d?.vehicleType ?? d?.equipmentType as any) ?? 'van',
          rate: Number(d?.rate ?? d?.rateTotalUSD ?? 0),
          ratePerMile: 0,
          pickupDate: pickup,
          deliveryDate: delivery,
          status: 'available',
          description: String(d?.title ?? d?.description ?? ''),
          special_requirements: undefined,
          isBackhaul: false,
          bulkImportId: d?.bulkImportId ? String(d.bulkImportId) : undefined,
        };
      };

      startAudit('data-processing', { firestoreDocs: snap.docs.length });
      const fromFs = snap.docs.map(toLoad).filter((x): x is Load => x !== null);
      const persisted = await readPersisted();
      const allLoads = mergeUniqueById(fromFs.length ? fromFs : mockLoads, persisted);
      
      // ENFORCE LOAD RULES: Filter board display by 7-day rule, keep history intact
      const boardLoads = allLoads.filter(l => !isExpired(l));
      const expiredCount = allLoads.length - boardLoads.length;
      
      if (expiredCount > 0) {
        console.log(`[Loads] ENFORCE RULES - Filtered ${expiredCount} expired loads from board (kept in history)`);
      }
      
      endAudit('data-processing', { 
        processedLoads: fromFs.length, 
        persistedLoads: persisted.length, 
        totalMerged: allLoads.length,
        boardVisible: boardLoads.length,
        expiredFiltered: expiredCount
      });
      
      setLoads(boardLoads);
      setLastSyncTime(new Date());
      setSyncStatus('idle');
      startAudit('cache-write');
      try { await setCache<Load[]>(CACHE_KEY, boardLoads, 5 * 60 * 1000); endAudit('cache-write', { success: true }); } catch { endAudit('cache-write', { success: false }); }
      
      console.log(`[Loads] Synced ${boardLoads.length} loads from Firestore`);
      endAudit('refreshLoads', { success: true, mode: 'firestore', totalLoads: boardLoads.length });
    } catch (error: any) {
      console.warn('[Loads] Refresh failed; using cached/local data', error?.code || error?.message);
      setSyncStatus('idle');
      try {
        startAudit('error-fallback-read');
        const persisted = await readPersisted();
        setLoads(mergeUniqueById(mockLoads, persisted));
        console.log('[Loads] Using fallback data due to Firestore error');
        endAudit('error-fallback-read', { success: true, count: persisted.length });
      } catch {
        setLoads([...mockLoads]);
        console.log('[Loads] Using mock data as final fallback');
        endAudit('error-fallback-read', { success: false });
      }
      endAudit('refreshLoads', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  }, [online, mergeUniqueById, readPersisted]);

  const addLoad = useCallback(async (load: Load) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // ENFORCE LOAD RULES: Post to both history and live board
      console.log('[Loads] ENFORCE RULES - Posting load to both history and live board');
      
      // Add to live board (filtered by 7-day rule)
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
        console.log('[Loads] ENFORCE RULES - Load posted to live board (7-day visibility)');
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
        const parsed = parsedRaw.map(reviveLoad).filter(l => !isExpired(l));
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

  // CROSS-PLATFORM FIX: Simplified real-time listener for universal compatibility
  useEffect(() => {
    let mounted = true;
    
    console.log('[CROSS-PLATFORM] Setting up universal real-time listener...');
    
    const startCrossPlatformListener = async () => {
      try {
        if (!online) {
          console.log('[CROSS-PLATFORM] Offline - skipping real-time listener');
          return;
        }
        
        // Quick auth check with timeout
        const authed = await Promise.race([
          ensureFirebaseAuth(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))
        ]);
        
        const { db } = getFirebase();
        if (!mounted || !authed || !db) {
          console.log('[CROSS-PLATFORM] Auth failed or component unmounted - skipping listener');
          return;
        }
        
        // Clean up existing listener
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        
        console.log('[CROSS-PLATFORM] Starting simplified real-time listener...');
        
        // CROSS-PLATFORM FIX: Use the simplest possible query for maximum compatibility
        const simpleQuery = query(
          collection(db, LOADS_COLLECTION)
          // UNLIMITED LOADS: Removed limit to show all available loads across platforms
        );
        
        unsubscribeRef.current = onSnapshot(simpleQuery, async (snap) => {
          try {
            console.log(`[CROSS-PLATFORM] Real-time update received - ${snap.docs.length} documents`);
            
            const docs = snap.docs.map((doc) => {
              const d: any = doc.data();
              
              // Skip archived loads
              if (d?.isArchived === true) return null;
              
              const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
              const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
              
              // Handle multiple field formats for cross-platform compatibility
              const originCity = d?.origin?.city || d?.originCity || d?.title?.split(' to ')[0] || 'Unknown';
              const originState = d?.origin?.state || d?.originState || '';
              const destCity = d?.destination?.city || d?.destCity || d?.title?.split(' to ')[1] || 'Unknown';
              const destState = d?.destination?.state || d?.destState || '';
              
              const mapped: Load = {
                id: String(doc.id),
                shipperId: String(d?.createdBy ?? 'unknown'),
                shipperName: '',
                origin: { address: '', city: originCity, state: originState, zipCode: '', lat: 0, lng: 0 },
                destination: { address: '', city: destCity, state: destState, zipCode: '', lat: 0, lng: 0 },
                distance: Number(d?.distance ?? d?.distanceMi ?? 0),
                weight: Number(d?.weight ?? d?.weightLbs ?? 0),
                vehicleType: (d?.vehicleType ?? d?.equipmentType as any) ?? 'cargo-van',
                rate: Number(d?.rate ?? d?.rateTotalUSD ?? d?.revenueUsd ?? 0),
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
            const mergedLoads = mergeUniqueById(docs.length ? docs : mockLoads, persisted);
            
            // Filter out expired loads for board display
            const boardLoads = mergedLoads.filter(l => !isExpired(l));
            
            setLoads(boardLoads);
            setLastSyncTime(new Date());
            setSyncStatus('idle');
            
            // Update cache
            try { 
              await setCache<Load[]>(CACHE_KEY, boardLoads, 5 * 60 * 1000); 
            } catch (cacheErr) {
              console.warn('[CROSS-PLATFORM] Cache update failed:', cacheErr);
            }
            
            console.log(`[CROSS-PLATFORM] ✅ Real-time sync complete - ${boardLoads.length} loads visible across all platforms`);
            
          } catch (e) {
            console.warn('[CROSS-PLATFORM] Snapshot processing failed:', e);
          }
        }, async (err) => {
          console.error('[CROSS-PLATFORM] Real-time listener error:', (err as any)?.code || (err as any)?.message);
          
          // Fallback to one-time fetch on listener error
          try {
            console.log('[CROSS-PLATFORM] Attempting fallback one-time fetch...');
            const fallbackSnap = await getDocs(simpleQuery);
            
            const docs = fallbackSnap.docs.map((doc) => {
              const d: any = doc.data();
              if (d?.isArchived === true) return null;
              
              const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
              const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
              
              const originCity = d?.origin?.city || d?.originCity || d?.title?.split(' to ')[0] || 'Unknown';
              const originState = d?.origin?.state || d?.originState || '';
              const destCity = d?.destination?.city || d?.destCity || d?.title?.split(' to ')[1] || 'Unknown';
              const destState = d?.destination?.state || d?.destState || '';
              
              const mapped: Load = {
                id: String(doc.id),
                shipperId: String(d?.createdBy ?? 'unknown'),
                shipperName: '',
                origin: { address: '', city: originCity, state: originState, zipCode: '', lat: 0, lng: 0 },
                destination: { address: '', city: destCity, state: destState, zipCode: '', lat: 0, lng: 0 },
                distance: Number(d?.distance ?? d?.distanceMi ?? 0),
                weight: Number(d?.weight ?? d?.weightLbs ?? 0),
                vehicleType: (d?.vehicleType ?? d?.equipmentType as any) ?? 'cargo-van',
                rate: Number(d?.rate ?? d?.rateTotalUSD ?? d?.revenueUsd ?? 0),
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
            const merged = mergeUniqueById(docs.length ? docs : mockLoads, persisted);
            const boardLoads = merged.filter(l => !isExpired(l));
            
            setLoads(boardLoads);
            try { await setCache<Load[]>(CACHE_KEY, boardLoads, 5 * 60 * 1000); } catch {}
            
            console.log('[CROSS-PLATFORM] Fallback fetch successful');
            
          } catch (fallbackErr) {
            console.warn('[CROSS-PLATFORM] Fallback fetch failed, using local data:', fallbackErr);
            const persisted = await readPersisted();
            const merged = mergeUniqueById(mockLoads, persisted);
            setLoads(merged.filter(l => !isExpired(l)));
          }
        });
        
        console.log('[CROSS-PLATFORM] ✅ Real-time listener established successfully');
        
      } catch (e) {
        console.warn('[CROSS-PLATFORM] Failed to start real-time listener:', e);
      }
    };
    
    // Start listener after a short delay to avoid blocking initial render
    const timeoutId = setTimeout(startCrossPlatformListener, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [online, mergeUniqueById, readPersisted, isExpired]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const persisted = await readPersisted();
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
      addLoad,
      addLoadsBulk,
      deleteLoad,
      deleteCompletedLoad,
      lastSyncTime,
      syncStatus,
      updateLoadStatus,
    };
    return result;
  }, [loads, filters, isLoading, filteredLoads, aiRecommendedLoads, currentLoad, favorites, isFavorited, toggleFavorite, setFiltersCallback, acceptLoad, refreshLoads, addLoad, addLoadsBulk, deleteLoad, deleteCompletedLoad, lastSyncTime, syncStatus, updateLoadStatus]);

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
  const { acceptLoad, refreshLoads, addLoad, addLoadsBulk, deleteLoad, deleteCompletedLoad } = useLoads();
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
    addLoadWithToast,
    addLoadsBulkWithToast,
    deleteLoadWithToast,
    deleteCompletedLoadWithToast,
  };
}