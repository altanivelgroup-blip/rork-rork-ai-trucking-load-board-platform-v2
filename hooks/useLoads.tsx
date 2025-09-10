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
  const [loads, setLoads] = useState<Load[]>(mockLoads);
  const [filters, setFilters] = useState<LoadFilters>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const { online } = useOnlineStatus();
  const { user } = useAuth();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const USER_POSTED_LOADS_KEY = 'userPostedLoads';

  const mergeUniqueById = useCallback((primary: Load[], extras: Load[]): Load[] => {
    const map = new Map<string, Load>();
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
    const expiresAt = ts + 36 * 60 * 60 * 1000;
    return Date.now() > expiresAt;
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
    setIsLoading(true);
    try {
      if (!online) {
        console.log('[Loads] Offline: showing cached loads');
        const persisted = await readPersisted();
        setLoads(prev => mergeUniqueById(mockLoads, persisted));
        return;
      }

      const authed = await ensureFirebaseAuth();
      const { db } = getFirebase();
      if (!authed || !db) {
        console.log('[Loads] Firebase not available, using mock + persisted');
        const persisted = await readPersisted();
        setLoads(mergeUniqueById(mockLoads, persisted));
        return;
      }

      const baseConstraints: QueryConstraint[] = [
        where('status', '==', LOAD_STATUS.OPEN),
        where('isArchived', '==', false),
        limit(50),
      ];
      let snap;
      try {
        const qOrdered = query(
          collection(db, LOADS_COLLECTION),
          ...baseConstraints,
          orderBy('clientCreatedAt', 'desc'),
        );
        snap = await getDocs(qOrdered);
      } catch (e: any) {
        if (e?.code === 'failed-precondition') {
          console.warn('[Loads] Missing Firestore index for ordered query. Falling back without orderBy.');
          const qUnordered = query(
            collection(db, LOADS_COLLECTION),
            ...baseConstraints,
          );
          snap = await getDocs(qUnordered);
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

      const fromFs = snap.docs.map(toLoad).filter((x): x is Load => x !== null);
      const persisted = await readPersisted();
      setLoads(mergeUniqueById(fromFs.length ? fromFs : mockLoads, persisted));
    } catch (error) {
      console.error('Failed to refresh loads:', error);
      try {
        const persisted = await readPersisted();
        setLoads(mergeUniqueById(mockLoads, persisted));
      } catch {
        setLoads([...mockLoads]);
      }
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
            setLoads(mergeUniqueById(docs.length ? docs : mockLoads, persisted));
          } catch (e) {
            console.warn('[Loads] Snapshot mapping failed', e);
          }
        }, async (err) => {
          try {
            if ((err as any)?.code === 'failed-precondition') {
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
              setLoads(mergeUniqueById(docs.length ? docs : mockLoads, persisted));
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