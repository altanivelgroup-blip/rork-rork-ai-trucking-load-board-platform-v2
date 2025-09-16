import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Load, Driver, Location } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { Platform } from 'react-native';
import { trpcClient } from '@/lib/trpc';

interface FuelStop {
  id: string;
  name: string;
  brand: string;
  location: Location;
  distance: number; // Distance from current location in miles
  pricePerGallon?: number;
  amenities: string[];
  isSponsored?: boolean;
}

interface FuelMonitorState {
  currentLoad: Load | null;
  fuelLevel: number; // Current fuel level (0-100%)
  isLowFuel: boolean;
  lowFuelThreshold: number; // Percentage threshold for low fuel alert
  nearbyFuelStops: FuelStop[];
  isLoadingFuelStops: boolean;
  currentLocation: Location | null;
  setStartingFuel: (loadId: string, fuelLevel: number) => Promise<void>;
  updateFuelLevel: (fuelLevel: number) => Promise<void>;
  checkLowFuelAlert: () => void;
  resetFuelMonitor: () => void;
  findNearbyFuelStops: (location?: Location) => Promise<FuelStop[]>;
  addFuelStop: (fuelStop: FuelStop) => Promise<void>;
  updateCurrentLocation: (location: Location) => void;
}

const FUEL_STORAGE_KEY = 'fuel_monitor_data';
const FUEL_STOPS_CACHE_KEY = 'fuel_stops_cache';
const LOCATION_CACHE_KEY = 'current_location_cache';
const LOW_FUEL_THRESHOLD = 25; // 25% = 1/4 tank
const FUEL_STOPS_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

export const [FuelMonitorProvider, useFuelMonitor] = createContextHook<FuelMonitorState>(() => {
  const { user } = useAuth();
  const [currentLoad, setCurrentLoad] = useState<Load | null>(null);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [isLowFuel, setIsLowFuel] = useState<boolean>(false);
  const [lowFuelThreshold] = useState<number>(LOW_FUEL_THRESHOLD);
  const [nearbyFuelStops, setNearbyFuelStops] = useState<FuelStop[]>([]);
  const [isLoadingFuelStops, setIsLoadingFuelStops] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  console.log('[useFuelMonitor] Hook initialized');

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        // Load fuel data
        const fuelCached = await AsyncStorage.getItem(FUEL_STORAGE_KEY);
        if (fuelCached) {
          const data = JSON.parse(fuelCached);
          if (data.currentLoad) {
            setCurrentLoad(data.currentLoad);
            setFuelLevel(data.fuelLevel || 100);
            console.log('[useFuelMonitor] Loaded cached fuel data:', data.fuelLevel + '%');
          }
        }
        
        // Load location data
        const locationCached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
        if (locationCached) {
          const location = JSON.parse(locationCached);
          setCurrentLocation(location);
          console.log('[useFuelMonitor] Loaded cached location');
        }
        
        // Load fuel stops cache
        const stopsCached = await AsyncStorage.getItem(FUEL_STOPS_CACHE_KEY);
        if (stopsCached) {
          const stopsData = JSON.parse(stopsCached);
          const isExpired = Date.now() - stopsData.timestamp > FUEL_STOPS_CACHE_EXPIRY;
          if (!isExpired && stopsData.stops) {
            setNearbyFuelStops(stopsData.stops);
            console.log('[useFuelMonitor] Loaded cached fuel stops:', stopsData.stops.length);
          }
        }
      } catch (error) {
        console.warn('[useFuelMonitor] Failed to load cached data:', error);
      }
    };
    loadCachedData();
  }, []);

  // Cache fuel data whenever it changes
  const cacheFuelData = useCallback(async (load: Load | null, fuel: number) => {
    try {
      const data = {
        currentLoad: load,
        fuelLevel: fuel,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(FUEL_STORAGE_KEY, JSON.stringify(data));
      console.log('[useFuelMonitor] Cached fuel data:', fuel + '%');
    } catch (error) {
      console.warn('[useFuelMonitor] Failed to cache fuel data:', error);
    }
  }, []);

  const setStartingFuel = useCallback(async (loadId: string, startingFuelLevel: number) => {
    console.log('[useFuelMonitor] Setting starting fuel for load:', loadId, 'at', startingFuelLevel + '%');
    
    try {
      // Validate fuel level
      const validFuelLevel = Math.max(0, Math.min(100, startingFuelLevel));
      
      // Create updated load with fuel data
      const updatedLoad: Load = {
        id: loadId,
        shipperId: '',
        shipperName: '',
        origin: { address: '', city: '', state: '', zipCode: '', lat: 0, lng: 0 },
        destination: { address: '', city: '', state: '', zipCode: '', lat: 0, lng: 0 },
        distance: 0,
        weight: 0,
        vehicleType: 'truck',
        rate: 0,
        ratePerMile: 0,
        pickupDate: new Date(),
        deliveryDate: new Date(),
        status: 'in-transit',
        description: '',
        fuelData: {
          startingFuel: validFuelLevel,
          currentFuel: validFuelLevel,
          lowFuelAlerted: false,
          fuelStops: [],
        },
      };
      
      setCurrentLoad(updatedLoad);
      setFuelLevel(validFuelLevel);
      setIsLowFuel(false);
      
      // Cache the data
      await cacheFuelData(updatedLoad, validFuelLevel);
      
      // Update Firestore if available
      try {
        if (user?.id) {
          const loadRef = doc(db, 'loads', loadId);
          await updateDoc(loadRef, {
            fuelData: updatedLoad.fuelData,
            updatedAt: new Date(),
          });
          console.log('[useFuelMonitor] Fuel data synced to Firestore');
        }
      } catch (firestoreError) {
        console.warn('[useFuelMonitor] Failed to sync to Firestore:', firestoreError);
      }
      
      console.log('[useFuelMonitor] Starting fuel set successfully:', validFuelLevel + '%');
    } catch (error) {
      console.error('[useFuelMonitor] Failed to set starting fuel:', error);
      throw error;
    }
  }, [user?.id, cacheFuelData]);

  const updateFuelLevel = useCallback(async (newFuelLevel: number) => {
    if (!currentLoad) {
      console.warn('[useFuelMonitor] No active load to update fuel level');
      return;
    }
    
    const validFuelLevel = Math.max(0, Math.min(100, newFuelLevel));
    console.log('[useFuelMonitor] Updating fuel level to:', validFuelLevel + '%');
    
    try {
      // Update current load with new fuel level
      const updatedLoad: Load = {
        ...currentLoad,
        fuelData: {
          ...currentLoad.fuelData!,
          currentFuel: validFuelLevel,
        },
      };
      
      setCurrentLoad(updatedLoad);
      setFuelLevel(validFuelLevel);
      
      // Cache the updated data
      await cacheFuelData(updatedLoad, validFuelLevel);
      
      // Update Firestore if available
      try {
        if (user?.id) {
          const loadRef = doc(db, 'loads', currentLoad.id);
          await updateDoc(loadRef, {
            'fuelData.currentFuel': validFuelLevel,
            updatedAt: new Date(),
          });
          console.log('[useFuelMonitor] Fuel level synced to Firestore');
        }
      } catch (firestoreError) {
        console.warn('[useFuelMonitor] Failed to sync fuel level to Firestore:', firestoreError);
      }
      
      console.log('[useFuelMonitor] Fuel level updated successfully:', validFuelLevel + '%');
    } catch (error) {
      console.error('[useFuelMonitor] Failed to update fuel level:', error);
    }
  }, [currentLoad, user?.id, cacheFuelData]);

  const checkLowFuelAlert = useCallback(() => {
    if (!currentLoad || !user) return;
    
    const driver = user as Driver;
    const tankSize = driver.tankSize || 100; // Default to 100 gallons if not set
    const quarterTank = lowFuelThreshold; // 25%
    
    if (fuelLevel <= quarterTank && !currentLoad.fuelData?.lowFuelAlerted) {
      setIsLowFuel(true);
      
      // Show platform-appropriate notification
      if (Platform.OS !== 'web') {
        // Mobile notification
        import('expo-notifications').then(({ scheduleNotificationAsync }) => {
          scheduleNotificationAsync({
            content: {
              title: 'Low Fuel Alert',
              body: `Fuel level at ${fuelLevel}% - Suggest refuel`,
              data: { loadId: currentLoad.id },
            },
            trigger: null, // Show immediately
          }).catch(error => {
            console.warn('[useFuelMonitor] Failed to show notification:', error);
          });
        }).catch(() => {
          console.log('[useFuelMonitor] Notifications not available, using console alert');
        });
      }
      
      console.log(`[useFuelMonitor] Low fuel alert - ${fuelLevel}% remaining (${(fuelLevel * tankSize / 100).toFixed(1)} gallons)`);
      console.log('[useFuelMonitor] Low fuel - Suggest refuel');
      
      // Mark as alerted to prevent spam
      if (currentLoad.fuelData) {
        const updatedLoad: Load = {
          ...currentLoad,
          fuelData: {
            ...currentLoad.fuelData,
            lowFuelAlerted: true,
          },
        };
        setCurrentLoad(updatedLoad);
        cacheFuelData(updatedLoad, fuelLevel);
        
        // Update Firestore
        try {
          if (user?.id) {
            const loadRef = doc(db, 'loads', currentLoad.id);
            updateDoc(loadRef, {
              'fuelData.lowFuelAlerted': true,
              updatedAt: new Date(),
            }).catch(error => {
              console.warn('[useFuelMonitor] Failed to update alert status in Firestore:', error);
            });
          }
        } catch (error) {
          console.warn('[useFuelMonitor] Firestore update failed:', error);
        }
      }
    } else if (fuelLevel > quarterTank) {
      setIsLowFuel(false);
    }
  }, [currentLoad, fuelLevel, lowFuelThreshold, user, cacheFuelData]);

  // Check for low fuel whenever fuel level changes
  useEffect(() => {
    checkLowFuelAlert();
  }, [checkLowFuelAlert]);

  // Update current location and cache it
  const updateCurrentLocation = useCallback(async (location: Location) => {
    setCurrentLocation(location);
    try {
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
      console.log('[useFuelMonitor] Location cached');
    } catch (error) {
      console.warn('[useFuelMonitor] Failed to cache location:', error);
    }
  }, []);

  // Find nearby fuel stops with navigation integration
  const findNearbyFuelStops = useCallback(async (location?: Location): Promise<FuelStop[]> => {
    const searchLocation = location || currentLocation;
    if (!searchLocation) {
      console.warn('[useFuelMonitor] No location available for fuel stop search');
      return [];
    }

    setIsLoadingFuelStops(true);
    console.log('[useFuelMonitor] Searching for nearby fuel stops...');

    try {
      // Mock fuel stops data with sponsored options
      const mockFuelStops: FuelStop[] = [
        {
          id: 'pilot-001',
          name: 'Pilot Travel Center',
          brand: 'Pilot',
          location: {
            address: '1234 Highway 95',
            city: 'Truck Stop City',
            state: 'TX',
            zipCode: '75001',
            lat: searchLocation.lat + 0.05,
            lng: searchLocation.lng + 0.02,
          },
          distance: 3.2,
          pricePerGallon: 3.89,
          amenities: ['Showers', 'Restaurant', 'WiFi', 'Parking'],
          isSponsored: true,
        },
        {
          id: 'loves-002',
          name: "Love's Travel Stop",
          brand: "Love's",
          location: {
            address: '5678 Interstate Dr',
            city: 'Fuel Town',
            state: 'TX',
            zipCode: '75002',
            lat: searchLocation.lat + 0.08,
            lng: searchLocation.lng - 0.03,
          },
          distance: 5.7,
          pricePerGallon: 3.92,
          amenities: ['Showers', 'Store', 'ATM'],
          isSponsored: false,
        },
        {
          id: 'ta-003',
          name: 'TravelCenters of America',
          brand: 'TA',
          location: {
            address: '9012 Truck Route',
            city: 'Rest Stop',
            state: 'TX',
            zipCode: '75003',
            lat: searchLocation.lat - 0.03,
            lng: searchLocation.lng + 0.07,
          },
          distance: 4.1,
          pricePerGallon: 3.85,
          amenities: ['Showers', 'Restaurant', 'Laundry', 'Parking'],
          isSponsored: true,
        },
      ];

      // Sort by distance, prioritize sponsored stops
      const sortedStops = mockFuelStops.sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        return a.distance - b.distance;
      });

      setNearbyFuelStops(sortedStops);
      
      // Cache the results
      try {
        const cacheData = {
          stops: sortedStops,
          timestamp: Date.now(),
          location: searchLocation,
        };
        await AsyncStorage.setItem(FUEL_STOPS_CACHE_KEY, JSON.stringify(cacheData));
        console.log('[useFuelMonitor] Fuel stops cached');
      } catch (cacheError) {
        console.warn('[useFuelMonitor] Failed to cache fuel stops:', cacheError);
      }

      console.log('[useFuelMonitor] Found', sortedStops.length, 'nearby fuel stops');
      return sortedStops;
    } catch (error) {
      console.error('[useFuelMonitor] Failed to find fuel stops:', error);
      return [];
    } finally {
      setIsLoadingFuelStops(false);
    }
  }, [currentLocation]);

  // Add a fuel stop to the current load
  const addFuelStop = useCallback(async (fuelStop: FuelStop) => {
    if (!currentLoad || !currentLoad.fuelData) {
      console.warn('[useFuelMonitor] No active load to add fuel stop');
      return;
    }

    try {
      const updatedLoad: Load = {
        ...currentLoad,
        fuelData: {
          ...currentLoad.fuelData,
          fuelStops: [...(currentLoad.fuelData.fuelStops || []), {
            id: fuelStop.id,
            name: fuelStop.name,
            location: fuelStop.location,
            timestamp: new Date(),
            fuelAdded: 0, // Will be updated when fuel is actually added
          }],
        },
      };

      setCurrentLoad(updatedLoad);
      await cacheFuelData(updatedLoad, fuelLevel);

      // Update Firestore
      try {
        if (user?.id) {
          const loadRef = doc(db, 'loads', currentLoad.id);
          await updateDoc(loadRef, {
            'fuelData.fuelStops': updatedLoad.fuelData.fuelStops,
            updatedAt: new Date(),
          });
          console.log('[useFuelMonitor] Fuel stop added and synced');
        }
      } catch (firestoreError) {
        console.warn('[useFuelMonitor] Failed to sync fuel stop to Firestore:', firestoreError);
      }

      console.log('[useFuelMonitor] Fuel stop added:', fuelStop.name);
    } catch (error) {
      console.error('[useFuelMonitor] Failed to add fuel stop:', error);
    }
  }, [currentLoad, fuelLevel, user?.id, cacheFuelData]);

  const resetFuelMonitor = useCallback(() => {
    console.log('[useFuelMonitor] Resetting fuel monitor');
    setCurrentLoad(null);
    setFuelLevel(100);
    setIsLowFuel(false);
    setNearbyFuelStops([]);
    setCurrentLocation(null);
    
    // Clear cached data
    Promise.all([
      AsyncStorage.removeItem(FUEL_STORAGE_KEY),
      AsyncStorage.removeItem(FUEL_STOPS_CACHE_KEY),
      AsyncStorage.removeItem(LOCATION_CACHE_KEY),
    ]).catch(error => {
      console.warn('[useFuelMonitor] Failed to clear cached data:', error);
    });
  }, []);

  return {
    currentLoad,
    fuelLevel,
    isLowFuel,
    lowFuelThreshold,
    nearbyFuelStops,
    isLoadingFuelStops,
    currentLocation,
    setStartingFuel,
    updateFuelLevel,
    checkLowFuelAlert,
    resetFuelMonitor,
    findNearbyFuelStops,
    addFuelStop,
    updateCurrentLocation,
  };
});

// Helper hook for easy fuel level formatting
export function useFuelDisplay() {
  const fuelMonitor = useFuelMonitor();
  const { fuelLevel = 100, isLowFuel = false } = fuelMonitor || {};
  
  const getFuelColor = useCallback(() => {
    if (fuelLevel <= 25) return '#ef4444'; // Red
    if (fuelLevel <= 50) return '#f59e0b'; // Orange
    return '#10b981'; // Green
  }, [fuelLevel]);
  
  const getFuelIcon = useCallback(() => {
    if (fuelLevel <= 25) return 'fuel-low';
    if (fuelLevel <= 50) return 'fuel-half';
    return 'fuel-full';
  }, [fuelLevel]);
  
  return {
    fuelLevel,
    isLowFuel,
    fuelColor: getFuelColor(),
    fuelIcon: getFuelIcon(),
    fuelText: `${fuelLevel}%`,
  };
}