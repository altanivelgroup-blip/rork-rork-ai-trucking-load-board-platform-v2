import { useState, useEffect, useCallback } from 'react';
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

  const calculateAnalytics = useCallback(async () => {
    if (!enabled || !ANALYTICS_AUTO_CALCULATE || !user || user.role !== 'driver' || !load) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useLiveAnalytics] 🔥 Calculating analytics for load:', load.id);

      // Get or calculate distance
      let miles = load.distance || 0;
      if (!miles) {
        const computedMiles = await computeDistanceMiles(load);
        miles = computedMiles || 0;
      }

      if (miles <= 0) {
        console.warn('[useLiveAnalytics] No distance available for analytics');
        setAnalytics(null);
        return;
      }

      // Get fuel estimate
      const fuelEstimate = await fetchFuelEstimate({
        load: {
          distance: miles,
          vehicleType: load.vehicleType || (user as Driver)?.fuelProfile?.vehicleType || 'truck',
          weight: load.weight || 0,
          origin: load.origin,
          destination: load.destination,
        },
        driver: user as Driver,
      });

      // Calculate financials
      const rate = load.rate || 0;
      const fuelCost = fuelEstimate.cost;
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
      setError(err instanceof Error ? err.message : 'Analytics calculation failed');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [load, user, enabled]);

  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: calculateAnalytics
  };
}