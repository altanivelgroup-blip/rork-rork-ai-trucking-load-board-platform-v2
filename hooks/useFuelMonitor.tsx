import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Load, Driver } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { Platform } from 'react-native';

interface FuelMonitorState {
  currentLoad: Load | null;
  fuelLevel: number; // Current fuel level (0-100%)
  isLowFuel: boolean;
  lowFuelThreshold: number; // Percentage threshold for low fuel alert
  setStartingFuel: (loadId: string, fuelLevel: number) => Promise<void>;
  updateFuelLevel: (fuelLevel: number) => Promise<void>;
  checkLowFuelAlert: () => void;
  resetFuelMonitor: () => void;
}

const FUEL_STORAGE_KEY = 'fuel_monitor_data';
const LOW_FUEL_THRESHOLD = 25; // 25% = 1/4 tank

export const [FuelMonitorProvider, useFuelMonitor] = createContextHook<FuelMonitorState>(() => {
  const { user } = useAuth();
  const [currentLoad, setCurrentLoad] = useState<Load | null>(null);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [isLowFuel, setIsLowFuel] = useState<boolean>(false);
  const [lowFuelThreshold] = useState<number>(LOW_FUEL_THRESHOLD);

  console.log('[useFuelMonitor] Hook initialized');

  // Load cached fuel data on mount
  useEffect(() => {
    const loadFuelData = async () => {
      try {
        const cached = await AsyncStorage.getItem(FUEL_STORAGE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          if (data.currentLoad) {
            setCurrentLoad(data.currentLoad);
            setFuelLevel(data.fuelLevel || 100);
            console.log('[useFuelMonitor] Loaded cached fuel data:', data.fuelLevel + '%');
          }
        }
      } catch (error) {
        console.warn('[useFuelMonitor] Failed to load cached fuel data:', error);
      }
    };
    loadFuelData();
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

  const resetFuelMonitor = useCallback(() => {
    console.log('[useFuelMonitor] Resetting fuel monitor');
    setCurrentLoad(null);
    setFuelLevel(100);
    setIsLowFuel(false);
    
    // Clear cached data
    AsyncStorage.removeItem(FUEL_STORAGE_KEY).catch(error => {
      console.warn('[useFuelMonitor] Failed to clear cached fuel data:', error);
    });
  }, []);

  return {
    currentLoad,
    fuelLevel,
    isLowFuel,
    lowFuelThreshold,
    setStartingFuel,
    updateFuelLevel,
    checkLowFuelAlert,
    resetFuelMonitor,
  };
});

// Helper hook for easy fuel level formatting
export function useFuelDisplay() {
  const { fuelLevel, isLowFuel } = useFuelMonitor();
  
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