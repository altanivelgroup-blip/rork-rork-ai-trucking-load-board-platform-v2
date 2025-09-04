import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Load, VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

import useOnlineStatus from '@/hooks/useOnlineStatus';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
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
  const [loads, setLoads] = useState<Load[]>(mockLoads);
  const [filters, setFilters] = useState<LoadFilters>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [, setFirebaseLoads] = useState<any[]>([]);
  const [useFirebase, setUseFirebase] = useState<boolean>(false);
  
  // Always call hooks in the same order
  const { online } = useOnlineStatus();
  const { user } = useAuth();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

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
        setLoads([...mockLoads]);
        return;
      }
      
      // Try to set up Firebase listener if available
      const firebaseAvailable = await ensureFirebaseAuth();
      if (firebaseAvailable && user?.id) {
        console.log('[Loads] Setting up Firebase listener');
        setUseFirebase(true);
        // Firebase listener will update loads automatically
      } else {
        console.log('[Loads] Firebase unavailable, using mock data');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoads([...mockLoads]);
      }
    } catch (error) {
      console.error('Failed to refresh loads:', error);
      // Fallback to mock data
      setLoads([...mockLoads]);
    } finally {
      setIsLoading(false);
    }
  }, [online, user?.id]);

  const addLoad = useCallback(async (load: Load) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Update in-memory state
      setLoads(prev => [load, ...prev]);
      
      // Persist to AsyncStorage
      try {
        const existingLoads = await AsyncStorage.getItem('userPostedLoads');
        const parsed = existingLoads ? JSON.parse(existingLoads) : [];
        const updated = [load, ...parsed];
        await AsyncStorage.setItem('userPostedLoads', JSON.stringify(updated));
        console.log('[Loads] Load posted and saved to AsyncStorage');
      } catch (storageError) {
        console.warn('[Loads] Failed to save to AsyncStorage, but load added to memory:', storageError);
        // Don't throw here - the load is still added to memory state
      }
      
    } catch (error) {
      console.error('Failed to add load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addLoadsBulk = useCallback(async (incoming: Load[]) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoads(prev => [...incoming, ...prev]);
      console.log('[Loads] Imported loads');
    } catch (error) {
      console.error('Failed to add loads bulk:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setFiltersCallback = useCallback((newFilters: LoadFilters) => {
    setFilters(newFilters);
  }, []);



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

  // Set up Firebase real-time listener
  useEffect(() => {
    if (!useFirebase || !user?.id || !online) {
      return;
    }

    const setupFirebaseListener = async () => {
      try {
        const firebaseAvailable = await ensureFirebaseAuth();
        if (!firebaseAvailable) {
          console.log('[Loads] Firebase auth failed, staying with mock data');
          return;
        }

        const { db, auth } = getFirebase();
        if (!auth.currentUser) {
          console.log('[Loads] No authenticated user, staying with mock data');
          return;
        }

        console.log('[Loads] Setting up Firebase listener for user:', auth.currentUser.uid);
        
        const q = query(
          collection(db, LOADS_COLLECTION),
          where("status", "==", LOAD_STATUS.OPEN),
          where("createdBy", "==", auth.currentUser.uid),
          orderBy("clientCreatedAt", "desc"),
          limit(25)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
          console.log('[Loads] Firebase snapshot received, docs:', snap.docs.length);
          const firebaseRows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setFirebaseLoads(firebaseRows);
          
          // Convert Firebase docs to Load format
          const convertedLoads: Load[] = firebaseRows.map((doc: any) => ({
            id: doc.id,
            shipperId: doc.createdBy || 'unknown',
            shipperName: 'Firebase User',
            origin: {
              address: '',
              city: doc.origin || 'Unknown',
              state: '',
              zipCode: '',
              lat: 0,
              lng: 0,
            },
            destination: {
              address: '',
              city: doc.destination || 'Unknown', 
              state: '',
              zipCode: '',
              lat: 0,
              lng: 0,
            },
            distance: 0,
            weight: 0,
            vehicleType: doc.vehicleType || 'truck',
            rate: doc.rate || 0,
            ratePerMile: 0,
            pickupDate: doc.pickupDate?.toDate?.() || new Date(),
            deliveryDate: doc.deliveryDate?.toDate?.() || new Date(),
            status: 'available' as const,
            description: doc.title || 'Firebase Load',
            isBackhaul: false,
          }));
          
          // Combine Firebase loads with mock loads
          setLoads([...convertedLoads, ...mockLoads]);
          console.log('[Loads] Updated loads with Firebase data:', convertedLoads.length, 'Firebase +', mockLoads.length, 'mock');
        }, (error) => {
          console.error('[Loads] Firebase listener error:', error);
          // Fallback to mock data on error
          setLoads([...mockLoads]);
        });

        unsubscribeRef.current = unsubscribe;
        console.log('[Loads] Firebase listener set up successfully');
        
      } catch (error) {
        console.error('[Loads] Failed to set up Firebase listener:', error);
        // Fallback to mock data
        setLoads([...mockLoads]);
      }
    };

    setupFirebaseListener();

    return () => {
      if (unsubscribeRef.current) {
        console.log('[Loads] Cleaning up Firebase listener');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [useFirebase, user?.id, online]);

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

  // Always return the same structure with useMemo for optimization
  return useMemo(() => ({
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
});

export function useLoadsWithToast(): LoadsWithToast {
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