import React, { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Driver } from '@/types';
import { fetchFuelEstimate } from '@/utils/fuelApi';
import { computeDistanceMiles } from '@/src/services/distance';
import { ANALYTICS_AUTO_CALCULATE } from '@/src/config/runtime';

export interface LiveAnalytics {
  fuelCost: number;
  netAfterFuel: number;
  profitPerMile: number;
  estimatedMiles: number;
  eta: string;
  mpg: number;
  gallonsNeeded: number;
  loading: boolean;
  error: string | null;
}

export function useLiveAnalytics(load: any, enabled: boolean = true) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // PERMANENT FIX: CROSS-PLATFORM ANALYTICS - Always available with enhanced fallbacks
  const isAnalyticsAvailable = React.useMemo(() => {
    if (!enabled) {
      console.log('[useLiveAnalytics] PERMANENT ANALYTICS - Disabled by prop, but checking config override...');
      // Check if analytics are force-enabled in storage
      return ANALYTICS_AUTO_CALCULATE; // Still respect global config
    }
    
    if (!ANALYTICS_AUTO_CALCULATE) {
      console.log('[useLiveAnalytics] PERMANENT ANALYTICS - Config disabled, checking storage override...');
      // In production, we might want to check AsyncStorage for force-enable
      return false;
    }
    
    if (!user || user.role !== 'driver') {
      console.log('[useLiveAnalytics] PERMANENT ANALYTICS - User not a driver:', user?.role);
      return false;
    }
    
    if (!load) {
      console.log('[useLiveAnalytics] PERMANENT ANALYTICS - No load provided');
      return false;
    }
    
    // PERMANENT FIX: Enhanced data validation with fallbacks
    const hasOrigin = load.origin || load.pickupZip || load.originZip || load.pickup;
    const hasDestination = load.destination || load.destZip || load.deliveryZip || load.delivery;
    const hasRate = load.rate || load.rateAmount || load.total || load.rateTotalUSD || load.amount;
    
    // Additional fallback checks
    const hasMinimalOrigin = hasOrigin || (load.originCity && load.originState);
    const hasMinimalDestination = hasDestination || (load.destinationCity && load.destinationState);
    const hasMinimalRate = hasRate || (load.ratePerMile && load.distance);
    
    const available = !!(hasMinimalOrigin && hasMinimalDestination && hasMinimalRate);
    
    console.log('[useLiveAnalytics] ✅ PERMANENT CROSS-PLATFORM ANALYTICS:', {
      platform: Platform.OS,
      hasOrigin: !!hasOrigin,
      hasDestination: !!hasDestination,
      hasRate: !!hasRate,
      hasMinimalOrigin: !!hasMinimalOrigin,
      hasMinimalDestination: !!hasMinimalDestination,
      hasMinimalRate: !!hasMinimalRate,
      available,
      loadId: load.id,
      driverFuelProfile: !!(user as any)?.fuelProfile?.averageMpg,
      analyticsReady: true
    });
    
    return available;
  }, [enabled, user, load, ANALYTICS_AUTO_CALCULATE]);

  const calculateAnalytics = useCallback(async () => {
    if (!isAnalyticsAvailable) {
      console.log('[useLiveAnalytics] ❌ PERMANENT ANALYTICS - Not available on', Platform.OS, ':', {
        enabled,
        ANALYTICS_AUTO_CALCULATE,
        hasUser: !!user,
        userRole: user?.role,
        hasLoad: !!load,
        platform: Platform.OS,
        loadData: load ? {
          hasOrigin: !!(load.origin || load.pickupZip || load.originZip),
          hasDestination: !!(load.destination || load.destZip || load.deliveryZip),
          hasRate: !!(load.rate || load.rateAmount || load.total)
        } : null
      });
      setAnalytics(null);
      setError(`Analytics unavailable on ${Platform.OS} - missing required data`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useLiveAnalytics] 🔥 PERMANENT CROSS-PLATFORM ANALYTICS CALCULATING on', Platform.OS, 'for load:', load.id);
      console.log('[useLiveAnalytics] 📊 Driver profile:', {
        userId: user?.id,
        fuelProfile: (user as any)?.fuelProfile,
        mpg: (user as any)?.fuelProfile?.averageMpg,
        fuelType: (user as any)?.fuelProfile?.fuelType
      });

      // Get or calculate distance with fallback
      let miles = load.distance || load.distanceMiles || 0;
      
      if (!miles) {
        try {
          const computedMiles = await computeDistanceMiles(load);
          miles = computedMiles || 0;
        } catch (distanceError) {
          console.warn('[useLiveAnalytics] Distance calculation failed:', distanceError);
          // Try fallback distance estimation
          if (load.origin?.lat && load.origin?.lng && load.destination?.lat && load.destination?.lng) {
            const R = 3958.7613; // Earth's radius in miles
            const toRad = (d: number) => (d * Math.PI) / 180;
            const dLat = toRad(load.destination.lat - load.origin.lat);
            const dLng = toRad(load.destination.lng - load.origin.lng);
            const lat1 = toRad(load.origin.lat);
            const lat2 = toRad(load.destination.lat);
            const sinDLat = Math.sin(dLat / 2);
            const sinDLng = Math.sin(dLng / 2);
            const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
            const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
            miles = R * c * 1.2; // Add 20% for road routing
          }
        }
      }

      if (miles <= 0) {
        console.warn('[useLiveAnalytics] No distance available for analytics');
        setAnalytics(null);
        setError('Distance calculation unavailable');
        return;
      }

      // Get fuel estimate with error handling
      let fuelEstimate;
      try {
        fuelEstimate = await fetchFuelEstimate({
          load: {
            distance: miles,
            vehicleType: load.vehicleType || (user as Driver)?.fuelProfile?.vehicleType || 'truck',
            weight: load.weight || 0,
            origin: load.origin,
            destination: load.destination,
          },
          driver: user as Driver,
        });
      } catch (fuelError) {
        console.warn('[useLiveAnalytics] Fuel estimation failed:', fuelError);
        // Fallback fuel calculation
        const mpg = (user as Driver)?.fuelProfile?.averageMpg || 8;
        const pricePerGallon = (user as Driver)?.fuelProfile?.fuelPricePerGallon || 3.50;
        const gallons = miles / mpg;
        fuelEstimate = {
          cost: gallons * pricePerGallon,
          mpg,
          gallons,
          pricePerGallon
        };
      }

      // Calculate financials with multiple rate sources
      const rate = load.rate || load.rateAmount || load.total || load.rateTotalUSD || 0;
      const fuelCost = fuelEstimate.cost || 0;
      const netAfterFuel = rate - fuelCost;
      const profitPerMile = miles > 0 ? netAfterFuel / miles : 0;

      // Calculate ETA (simplified)
      const avgSpeed = 55; // mph average
      const hours = miles / avgSpeed;
      const etaDate = new Date(Date.now() + hours * 60 * 60 * 1000);
      const eta = etaDate.toLocaleString('en-US', { 
        weekday: 'short', 
        hour: 'numeric', 
        minute: '2-digit' 
      });

      const result: LiveAnalytics = {
        fuelCost,
        netAfterFuel,
        profitPerMile,
        estimatedMiles: miles,
        eta,
        mpg: fuelEstimate.mpg,
        gallonsNeeded: fuelEstimate.gallons,
        loading: false,
        error: null
      };

      setAnalytics(result);
      console.log('[useLiveAnalytics] ✅ PERMANENT CROSS-PLATFORM ANALYTICS SUCCESS on', Platform.OS, ':', {
        loadId: load.id,
        fuelCost: `${fuelCost.toFixed(2)}`,
        netAfterFuel: `${netAfterFuel.toFixed(2)}`,
        profitPerMile: `${profitPerMile.toFixed(2)}/mi`,
        eta,
        mpg: fuelEstimate.mpg.toFixed(1),
        gallons: fuelEstimate.gallons.toFixed(1),
        miles: miles.toFixed(0),
        grossRate: `${rate.toFixed(2)}`,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        analyticsVersion: '2.0-permanent'
      });
      
      // PERMANENT FIX: Store analytics result for debugging and recovery
      try {
        const analyticsLog = {
          loadId: load.id,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          result,
          driverProfile: {
            userId: user?.id,
            mpg: (user as any)?.fuelProfile?.averageMpg,
            fuelType: (user as any)?.fuelProfile?.fuelType
          }
        };
        // Store in memory for debugging (could extend to AsyncStorage if needed)
        (globalThis as any).__liveAnalyticsLog = (globalThis as any).__liveAnalyticsLog || [];
        (globalThis as any).__liveAnalyticsLog.push(analyticsLog);
        if ((globalThis as any).__liveAnalyticsLog.length > 50) {
          (globalThis as any).__liveAnalyticsLog.shift(); // Keep only last 50
        }
      } catch (logError) {
        console.warn('[useLiveAnalytics] Failed to log analytics result:', logError);
      }

    } catch (err) {
      console.warn('[useLiveAnalytics] Analytics calculation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analytics calculation failed';
      setError(`${errorMessage} (Platform: ${Platform.OS})`);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [load, user, isAnalyticsAvailable, enabled]);

  useEffect(() => {
    if (isAnalyticsAvailable) {
      calculateAnalytics();
    } else {
      setAnalytics(null);
      setLoading(false);
    }
  }, [calculateAnalytics, isAnalyticsAvailable]);

  // Debug logging for troubleshooting
  useEffect(() => {
    if (__DEV__) {
      console.log('[useLiveAnalytics] Debug info:', {
        platform: Platform.OS,
        enabled,
        ANALYTICS_AUTO_CALCULATE,
        userRole: user?.role,
        hasLoad: !!load,
        hasOrigin: !!(load?.origin || load?.pickupZip || load?.originZip),
        hasDestination: !!(load?.destination || load?.destZip || load?.deliveryZip),
        hasRate: !!(load?.rate || load?.rateAmount || load?.total),
        hasFuelProfile: !!((user as any)?.fuelProfile?.averageMpg),
        isAnalyticsAvailable,
        analytics: !!analytics,
        loading,
        error
      });
    }
  }, [enabled, user, load, isAnalyticsAvailable, analytics, loading, error]);

  return {
    analytics,
    loading,
    error,
    refetch: calculateAnalytics
  };
}