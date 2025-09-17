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
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 5);
    
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
    // Updated archiving logic: Only consider loads expired if they are completed AND past 7-day window
    // This prevents premature archiving of loads that are still active
    const d = l.deliveryDate instanceof Date ? l.deliveryDate : new Date(l.deliveryDate as unknown as string);
    const ts = d.getTime();
    if (isNaN(ts)) return false;
    
    // Only archive if status is completed or archived AND delivery date is more than 7 days ago
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const isCompletedOrArchived = l.status === 'completed' || l.status === 'archived';
    const isPastSevenDays = ts < sevenDaysAgo;
    
    const shouldExpire = isCompletedOrArchived && isPastSevenDays;
    
    if (shouldExpire) {
      console.log(`[Loads] Load ${l.id} eligible for archiving - status: ${l.status}, delivery: ${d.toISOString()}`);
    } else {
      console.log(`[Loads] Load remains visible - ${l.id} status: ${l.status}, delivery: ${d.toISOString()}`);
    }
    
    return shouldExpire;
  }, []);

  const readPersisted = useCallback(async () => {
    const persistedRaw = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
    const persistedArr: any[] = persistedRaw ? JSON.parse(persistedRaw) : [];
    const revived = persistedArr.map(reviveLoad);
    const kept = revived.filter(l => !isExpired(l));
    if (kept.length !== revived.length) {
      try {
        await AsyncStorage.setItem(USER_POSTED_LOADS_KEY, JSON.stringify(kept));
        console.log(`[Loads] Cleaned ${revived.length - kept.length} expired load(s)`);
      } catch {}
    }
    return kept;
  }, [USER_POSTED_LOADS_KEY, reviveLoad, isExpired]);

  const refreshLoads = useCallback(async () => {
    startAudit('refreshLoads', { source: 'useLoads' });
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      try {
        startAudit('cache-check', { key: CACHE_KEY });
        const cached = await getCache<Load[]>(CACHE_KEY);
        endAudit('cache-check', { hit: cached.hit, dataLength: cached.data?.length });
        if (cached.hit && Array.isArray(cached.data)) {
          console.log('[Loads] Loading from cache...');
          setLoads(cached.data ?? []);
        }
      } catch (cacheErr) {
        console.warn('[Loads] cache check failed', cacheErr);
      }
      console.log('[Loads] Starting refresh with live data integration...');
      
      if (!online) {
        console.log('[Loads] Offline: showing cached loads');
        startAudit('offline-persisted-read');
        const persisted = await readPersisted();
        endAudit('offline-persisted-read', { count: persisted.length });
        setLoads(prev => mergeUniqueById(mockLoads, persisted));
        setSyncStatus('idle');
        endAudit('refreshLoads', { success: true, mode: 'offline' });
        return;
      }

      startAudit('firebase-auth');
      console.log('[Loads] PERMISSION FIX - Ensuring Firebase authentication before reading loads...');
      const authed = await ensureFirebaseAuth();
      endAudit('firebase-auth', { success: authed });
      const { db } = getFirebase();
      if (!authed || !db) {
        console.log('[Loads] PERMISSION FIX - Firebase auth failed, using mock + persisted data');
        console.log('[Loads] PERMISSION FIX - This prevents permission denied errors');
        startAudit('fallback-persisted-read');
        const persisted = await readPersisted();
        endAudit('fallback-persisted-read', { count: persisted.length });
        setLoads(mergeUniqueById(mockLoads, persisted));
        endAudit('refreshLoads', { success: true, mode: 'fallback' });
        return;
      }
      console.log('[Loads] PERMISSION FIX - Firebase authentication successful, proceeding with Firestore query');

      const baseConstraints: QueryConstraint[] = [
        where('status', '==', LOAD_STATUS.OPEN),
        where('isArchived', '==', false),
        limit(50),
      ];
      let snap;
      try {
        startAudit('firestore-query-ordered', { collection: LOADS_COLLECTION, limit: 50 });
        const qOrdered = query(
          collection(db, LOADS_COLLECTION),
          ...baseConstraints,
          orderBy('clientCreatedAt', 'desc'),
        );
        const orderedFetch = getDocs(qOrdered);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('QUERY_TIMEOUT_ORDERED')), 4000));
        snap = await Promise.race([orderedFetch, timeout]) as typeof snap;
        endAudit('firestore-query-ordered', { success: true, docCount: snap.docs.length });
      } catch (e: any) {
        endAudit('firestore-query-ordered', { success: false, error: e?.code || e?.message });
        if (e?.code === 'permission-denied') {
          console.warn('[Loads] PERMISSION FIX - Firestore read permission denied. This should not happen with updated rules.');
          console.warn('[Loads] PERMISSION FIX - Attempting re-authentication and retry...');
          try {
            const authedRetry = await ensureFirebaseAuth();
            if (authedRetry) {
              console.log('[Loads] PERMISSION FIX - Re-authentication successful, retrying query...');
              const qRetry = query(
                collection(db, LOADS_COLLECTION),
                ...baseConstraints,
                orderBy('clientCreatedAt', 'desc'),
              );
              snap = await getDocs(qRetry);
              console.log('[Loads] PERMISSION FIX - Retry query successful after re-auth');
              endAudit('firestore-query-ordered', { success: true, retried: true, docCount: snap.docs.length });
            } else {
              console.error('[Loads] PERMISSION FIX - Re-authentication failed, throwing original error');
              throw e;
            }
          } catch (innerPermErr) {
            console.warn('[Loads] PERMISSION FIX - Retry after auth failed; falling back to unordered query', innerPermErr);
            // Try unordered w/out orderBy as a last resort
            try {
              const qUnordered = query(
                collection(db, LOADS_COLLECTION),
                ...baseConstraints,
              );
              snap = await getDocs(qUnordered);
              console.log('[Loads] PERMISSION FIX - Unordered fallback query successful');
              endAudit('firestore-query-unordered-fallback', { success: true, docCount: snap.docs.length, reason: 'permission-denied' });
            } catch (finalErr) {
              console.error('[Loads] PERMISSION FIX - All query attempts failed, throwing original error');
              throw e;
            }
          }
        } else if (e?.code === 'failed-precondition') {
          console.warn('[Loads] Missing Firestore index for ordered query. Falling back without orderBy.');
          startAudit('firestore-query-unordered-fallback');
          const qUnordered = query(
            collection(db, LOADS_COLLECTION),
            ...baseConstraints,
          );
          snap = await getDocs(qUnordered);
          endAudit('firestore-query-unordered-fallback', { success: true, docCount: snap.docs.length });
        } else if (typeof e?.message === 'string' && e.message === 'QUERY_TIMEOUT_ORDERED') {
          console.warn('[Loads] Ordered query is slow. Retrying with smaller limit and without orderBy');
          startAudit('firestore-query-smaller-limit', { limit: 25 });
          const qSmaller = query(
            collection(db, LOADS_COLLECTION),
            where('status', '==', LOAD_STATUS.OPEN),
            where('isArchived', '==', false),
            limit(25),
          );
          snap = await getDocs(qSmaller);
          endAudit('firestore-query-smaller-limit', { success: true, docCount: snap.docs.length });
        } else {
          throw e;
        }
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
      const mergedLoads = mergeUniqueById(fromFs.length ? fromFs : mockLoads, persisted);
      endAudit('data-processing', { processedLoads: fromFs.length, persistedLoads: persisted.length, totalMerged: mergedLoads.length });
      
      setLoads(mergedLoads);
      setLastSyncTime(new Date());
      setSyncStatus('idle');
      startAudit('cache-write');
      try { await setCache<Load[]>(CACHE_KEY, mergedLoads, 5 * 60 * 1000); endAudit('cache-write', { success: true }); } catch { endAudit('cache-write', { success: false }); }
      
      console.log(`[Loads] Successfully synced ${mergedLoads.length} loads from Firestore`);
      endAudit('refreshLoads', { success: true, mode: 'firestore', totalLoads: mergedLoads.length });
    } catch (error: any) {
      console.error('PERMISSION FIX - Failed to refresh loads:', error);
      if (error?.code === 'permission-denied') {
        console.error('PERMISSION FIX - Permission denied error detected');
        console.error('PERMISSION FIX - This indicates Firebase rules or authentication issues');
        console.error('PERMISSION FIX - Check that Firebase authentication is working and rules allow read access');
      }
      setSyncStatus('error');
      try {
        startAudit('error-fallback-read');
        const persisted = await readPersisted();
        setLoads(mergeUniqueById(mockLoads, persisted));
        console.log('PERMISSION FIX - Using fallback data due to Firestore error');
        endAudit('error-fallback-read', { success: true, count: persisted.length });
      } catch {
        setLoads([...mockLoads]);
        console.log('PERMISSION FIX - Using mock data as final fallback');
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
      setLoads(prev => mergeUniqueById([load, ...prev], []));
      try {
        const existingLoads = await AsyncStorage.getItem(USER_POSTED_LOADS_KEY);
        const parsedRaw: any[] = existingLoads ? JSON.parse(existingLoads) : [];
        const parsed = parsedRaw.map(reviveLoad).filter(l => !isExpired(l));
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
  }, [mergeUniqueById, reviveLoad, isExpired]);

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
      // For completed loads, we only remove from local history
      // Don't delete from Firebase as it affects shipper analytics
      
      // Remove from local state
      setLoads(prevLoads => prevLoads.filter(load => load.id !== loadId));
      
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
      
      console.log('[Loads] Completed load removed from history:', loadId);
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

  useEffect(() => {
    let mounted = true;
    
    // Start Firestore listener in background (non-blocking)
    const start = async () => {
      try {
        if (!online) return;
        
        // Try Firebase auth with short timeout
        const authed = await Promise.race([
          ensureFirebaseAuth(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
        ]);
        
        const { db } = getFirebase();
        if (!mounted || !authed || !db) return;
        
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        
        const baseConstraints: QueryConstraint[] = [
          where('status', '==', LOAD_STATUS.OPEN),
          where('isArchived', '==', false),
          limit(50),
        ];
        
        const qOrdered = query(
          collection(db, LOADS_COLLECTION),
          ...baseConstraints,
          orderBy('clientCreatedAt', 'desc'),
        );
        
        const qUnordered = query(
          collection(db, LOADS_COLLECTION),
          ...baseConstraints,
        );
        
        unsubscribeRef.current = onSnapshot(qOrdered, async (snap) => {
          try {
            const docs = snap.docs.map((doc) => {
              const d: any = doc.data();
              if (d?.isArchived === true) return null;
              const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
              const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
              
              // Handle both structured and friendly fallback fields for origin/destination
              const originCity = d?.origin?.city || d?.originCity || 'Unknown';
              const originState = d?.origin?.state || d?.originState || '';
              const destCity = d?.destination?.city || d?.destCity || 'Unknown';
              const destState = d?.destination?.state || d?.destState || '';
              
              const mapped: Load = {
                id: String(doc.id),
                shipperId: String(d?.createdBy ?? 'unknown'),
                shipperName: '',
                origin: { address: '', city: originCity, state: originState, zipCode: '', lat: 0, lng: 0 },
                destination: { address: '', city: destCity, state: destState, zipCode: '', lat: 0, lng: 0 },
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
              return mapped;
            }).filter((x): x is Load => x !== null);
            const persisted = await readPersisted();
            const mergedLoads = mergeUniqueById(docs.length ? docs : mockLoads, persisted);
            
            setLoads(mergedLoads);
            setLastSyncTime(new Date());
            setSyncStatus('idle');
            try { await setCache<Load[]>(CACHE_KEY, mergedLoads, 5 * 60 * 1000); } catch {}
            
            console.log(`[Loads] Real-time update: ${mergedLoads.length} loads`);
          } catch (e) {
            console.warn('[Loads] Snapshot mapping failed', e);
          }
        }, async (err) => {
          try {
            const code = (err as any)?.code;
            if (code === 'permission-denied') {
              console.warn('[Loads] Listener permission denied. Attempting auth then one-time fetch.');
              try {
                const authedRetry = await ensureFirebaseAuth();
                if (authedRetry) {
                  const fallbackSnap = await getDocs(qUnordered);
                  const docs = fallbackSnap.docs.map((doc) => {
                    const d: any = doc.data();
                    if (d?.isArchived === true) return null;
                    const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
                    const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
                    const originCity = d?.origin?.city || d?.originCity || 'Unknown';
                    const originState = d?.origin?.state || d?.originState || '';
                    const destCity = d?.destination?.city || d?.destCity || 'Unknown';
                    const destState = d?.destination?.state || d?.destState || '';
                    const mapped: Load = {
                      id: String(doc.id),
                      shipperId: String(d?.createdBy ?? 'unknown'),
                      shipperName: '',
                      origin: { address: '', city: originCity, state: originState, zipCode: '', lat: 0, lng: 0 },
                      destination: { address: '', city: destCity, state: destState, zipCode: '', lat: 0, lng: 0 },
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
                    return mapped;
                  }).filter((x): x is Load => x !== null);
                  const persisted = await readPersisted();
                  const merged = mergeUniqueById(docs.length ? docs : mockLoads, persisted);
                  setLoads(merged);
                  try { await setCache<Load[]>(CACHE_KEY, merged, 5 * 60 * 1000); } catch {}
                  return;
                }
              } catch (authErr) {
                console.warn('[Loads] Auth retry for listener failed', authErr);
              }
            }

            if (code === 'failed-precondition') {
              console.warn('[Loads] Missing Firestore index for listener. Switching to non-ordered one-time fetch.');
              const fallbackSnap = await getDocs(qUnordered);
              const docs = fallbackSnap.docs.map((doc) => {
                const d: any = doc.data();
                if (d?.isArchived === true) return null;
                const pickup = d?.pickupDate?.toDate ? d.pickupDate.toDate() : new Date(d?.pickupDate ?? Date.now());
                const delivery = d?.deliveryDate?.toDate ? d.deliveryDate.toDate() : new Date(d?.deliveryDate ?? Date.now());
                
                // Handle both structured and friendly fallback fields for origin/destination
                const originCity = d?.origin?.city || d?.originCity || 'Unknown';
                const originState = d?.origin?.state || d?.originState || '';
                const destCity = d?.destination?.city || d?.destCity || 'Unknown';
                const destState = d?.destination?.state || d?.destState || '';
                
                const mapped: Load = {
                  id: String(doc.id),
                  shipperId: String(d?.createdBy ?? 'unknown'),
                  shipperName: '',
                  origin: { address: '', city: originCity, state: originState, zipCode: '', lat: 0, lng: 0 },
                  destination: { address: '', city: destCity, state: destState, zipCode: '', lat: 0, lng: 0 },
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
                return mapped;
              }).filter((x): x is Load => x !== null);
              const persisted = await readPersisted();
              const merged = mergeUniqueById(docs.length ? docs : mockLoads, persisted);
              setLoads(merged);
              try { await setCache<Load[]>(CACHE_KEY, merged, 5 * 60 * 1000); } catch {}
            } else {
              console.warn('[Loads] Firestore listener error', err);
            }
          } catch (inner) {
            console.warn('[Loads] Listener fallback failed', inner);
          }
        });
      } catch (e) {
        console.warn('[Loads] Firestore listener failed', e);
      }
    };
    
    // Start in background without blocking
    setTimeout(start, 100);
    
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [online, mergeUniqueById, readPersisted]);

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