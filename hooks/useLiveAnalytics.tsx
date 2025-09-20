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

  // Platform-specific availability check
  const isAnalyticsAvailable = React.useMemo(() => {
    if (!enabled || !ANALYTICS_AUTO_CALCULATE) return false;
    if (!user || user.role !== 'driver') return false;
    if (!load) return false;
    
    // Check if we have minimum required data
    const hasOrigin = load.origin || load.pickupZip || load.originZip;
    const hasDestination = load.destination || load.destZip || load.deliveryZip;
    const hasRate = load.rate || load.rateAmount || load.total;
    
    return !!(hasOrigin && hasDestination && hasRate);
  }, [enabled, user, load]);

  const calculateAnalytics = useCallback(async () => {
    if (!isAnalyticsAvailable) {
      console.log('[useLiveAnalytics] Analytics not available:', {
        enabled,
        ANALYTICS_AUTO_CALCULATE,
        hasUser: !!user,
        userRole: user?.role,
        hasLoad: !!load,
        platform: Platform.OS
      });
      setAnalytics(null);
      setError('Analytics unavailable - missing required data');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useLiveAnalytics] 🔥 Calculating analytics for load:', load.id);

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
      console.log('[useLiveAnalytics] ✅ Analytics calculated:', {
        fuelCost: `$${fuelCost.toFixed(2)}`,
        netAfterFuel: `$${netAfterFuel.toFixed(2)}`,
        profitPerMile: `$${profitPerMile.toFixed(2)}/mi`,
        eta,
        mpg: fuelEstimate.mpg.toFixed(1),
        gallons: fuelEstimate.gallons.toFixed(1)
      });

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