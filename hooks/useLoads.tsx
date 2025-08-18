import createContextHook from '@nkzw/create-context-hook';
import { useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Load, VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

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
  const [isLoading, setIsLoading] = useState(false);

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

  const acceptLoad = async (loadId: string) => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error('Failed to accept load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLoads = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoads([...mockLoads]);
    } catch (error) {
      console.error('Failed to refresh loads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addLoad = async (load: Load) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setLoads(prev => [load, ...prev]);
    } catch (error) {
      console.error('Failed to add load:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addLoadsBulk = async (incoming: Load[]) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoads(prev => [...incoming, ...prev]);
    } catch (error) {
      console.error('Failed to add loads bulk:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
});