import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Load, VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

import useOnlineStatus from '@/hooks/useOnlineStatus';
import { useToast } from '@/components/Toast';

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

const defaultLoadsState: LoadsState = {
  loads: [],
  filters: {},
  isLoading: false,
  filteredLoads: [],
  aiRecommendedLoads: [],
  currentLoad: undefined,
  setFilters: () => console.warn('[Loads] setFilters called outside provider'),
  acceptLoad: async () => {
    console.warn('[Loads] acceptLoad called outside provider');
  },
  refreshLoads: async () => {
    console.warn('[Loads] refreshLoads called outside provider');
  },
  addLoad: async () => {
    console.warn('[Loads] addLoad called outside provider');
  },
  addLoadsBulk: async () => {
    console.warn('[Loads] addLoadsBulk called outside provider');
  },
};

export const [LoadsProvider, useLoads] = createContextHook<LoadsState>(() => {
  const [loads, setLoads] = useState<Load[]>(mockLoads);
  const [filters, setFilters] = useState<LoadFilters>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { online } = useOnlineStatus();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoads([...mockLoads]);
    } catch (error) {
      console.error('Failed to refresh loads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [online]);

  const addLoad = useCallback(async (load: Load) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setLoads(prev => [load, ...prev]);
      console.log('[Loads] Load posted');
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

  return useMemo(() => ({
    loads,
    filters,
    isLoading,
    filteredLoads,
    aiRecommendedLoads,
    currentLoad,
    setFilters,
    acceptLoad,
    refreshLoads,
    addLoad,
    addLoadsBulk,
  }), [loads, filters, isLoading, filteredLoads, aiRecommendedLoads, currentLoad, setFilters, acceptLoad, refreshLoads, addLoad, addLoadsBulk]);
}, defaultLoadsState);

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

  return useMemo(() => ({
    acceptLoadWithToast,
    refreshLoadsWithToast,
    addLoadWithToast,
    addLoadsBulkWithToast,
  }), [acceptLoadWithToast, refreshLoadsWithToast, addLoadWithToast, addLoadsBulkWithToast]);
}