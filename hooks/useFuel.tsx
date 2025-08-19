import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Load, VehicleType } from '@/types';
import { getDefaultsFor } from '@/utils/fuel';
import { getStateAvgPrice, normalizeStateCode } from '@/utils/fuelStateAvg';

export type FuelSource = 'auto' | 'live' | 'state';
export type RegionMode = 'auto' | 'zip' | 'state';

export interface FuelContextState {
  source: FuelSource;
  setSource: (s: FuelSource) => void;
  regionMode: RegionMode;
  setRegionMode: (m: RegionMode) => void;
  zip: string | undefined;
  setZip: (z?: string) => void;
  stateCode: string | undefined;
  setStateCode: (s?: string) => void;
  lastUpdated?: string;
  isResolving: boolean;
  resolvePriceFor: (load?: Load) => { price: number | undefined; label: string };
}

export const [FuelProvider, useFuel] = createContextHook<FuelContextState>(() => {
  const [source, setSource] = useState<FuelSource>('auto');
  const [regionMode, setRegionMode] = useState<RegionMode>('auto');
  const [zip, setZip] = useState<string | undefined>(undefined);
  const [stateCode, setStateCode] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  useEffect(() => {
    if (regionMode !== 'auto') return;
    (async () => {
      try {
        setIsResolving(true);
        if (Platform.OS === 'web') {
          if (!('geolocation' in navigator)) return;
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const rg = await Location.reverseGeocodeAsync({ latitude, longitude });
              const best = rg?.[0];
              if (best?.postalCode) setZip(best.postalCode);
              if (best?.region) setStateCode(normalizeStateCode(best.region));
              setLastUpdated(new Date().toISOString());
            } catch (e) {
              console.warn('[Fuel] reverse geocode failed (web)', e);
            } finally {
              setIsResolving(false);
            }
          }, () => setIsResolving(false));
          return;
        }
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') { setIsResolving(false); return; }
        const loc = await Location.getCurrentPositionAsync({});
        const rg = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        const best = rg?.[0];
        if (best?.postalCode) setZip(best.postalCode);
        if (best?.region) setStateCode(normalizeStateCode(best.region));
        setLastUpdated(new Date().toISOString());
      } catch (e) {
        console.warn('[Fuel] auto region error', e);
      } finally {
        setIsResolving(false);
      }
    })();
  }, [regionMode]);

  const tryFetchLiveZipPrice = useCallback(async (_zip?: string): Promise<number | undefined> => {
    try {
      return undefined;
    } catch (e) {
      console.warn('[Fuel] live price fetch failed', e);
      return undefined;
    }
  }, []);

  const resolvePriceFor = useCallback((load?: Load) => {
    const vt: VehicleType = (load?.vehicleType ?? 'truck') as VehicleType;
    const defaults = getDefaultsFor(vt);

    const chosenSource: FuelSource = source === 'auto' ? 'live' : source;

    if (chosenSource === 'live') {
      const regionZip = zip ?? load?.origin?.zipCode ?? load?.destination?.zipCode;
      if (regionZip) {
        void tryFetchLiveZipPrice(regionZip);
        const stateFromZip = stateCode ?? load?.origin?.state ?? load?.destination?.state;
        const stateAvg = stateFromZip ? getStateAvgPrice(stateFromZip) : undefined;
        if (stateAvg) return { price: stateAvg, label: `Live ZIP ${regionZip} → EIA-${normalizeStateCode(stateFromZip)}` };
      }
      if (stateCode) {
        const p = getStateAvgPrice(stateCode);
        if (p) return { price: p, label: `EIA-${normalizeStateCode(stateCode)}` };
      }
      return { price: defaults.price, label: 'Default' };
    }

    if (chosenSource === 'state') {
      const st = stateCode ?? load?.origin?.state ?? load?.destination?.state;
      if (st) {
        const p = getStateAvgPrice(st);
        if (p) return { price: p, label: `EIA-${normalizeStateCode(st)}` };
      }
      return { price: defaults.price, label: 'Default' };
    }

    return { price: defaults.price, label: 'Default' };
  }, [source, zip, stateCode, tryFetchLiveZipPrice]);

  return useMemo(() => ({
    source,
    setSource,
    regionMode,
    setRegionMode,
    zip,
    setZip,
    stateCode,
    setStateCode,
    lastUpdated,
    isResolving,
    resolvePriceFor,
  }), [source, regionMode, zip, stateCode, lastUpdated, isResolving, resolvePriceFor]);
});
