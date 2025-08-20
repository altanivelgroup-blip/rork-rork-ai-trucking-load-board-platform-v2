import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
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
          if (!('geolocation' in navigator)) { setIsResolving(false); return; }
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
              const res = await fetch(url);
              const data: any = await res.json();
              const postcode: string | undefined = data?.postcode ?? data?.localityInfo?.administrative?.find((a: any) => a?.order === 5)?.name;
              const principalSubdivisionCode: string | undefined = data?.principalSubdivisionCode;
              let state: string | undefined = undefined;
              if (typeof principalSubdivisionCode === 'string' && principalSubdivisionCode.includes('-')) {
                state = principalSubdivisionCode.split('-')[1];
              } else if (Array.isArray(data?.localityInfo?.administrative)) {
                const admin = data.localityInfo.administrative.find((a: any) => typeof a?.isoCode === 'string' && a.isoCode.length === 2);
                state = admin?.isoCode;
              }
              if (postcode) setZip(String(postcode));
              if (state) setStateCode(normalizeStateCode(state));
              setLastUpdated(new Date().toISOString());
            } catch (e) {
              console.warn('[Fuel] reverse geocode failed (web)', e);
            } finally {
              setIsResolving(false);
            }
          }, (err) => {
            console.warn('[Fuel] web geolocation error', err);
            setIsResolving(false);
          });
          return;
        }
        const Location = await import('expo-location');
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
        if (stateAvg) {
          const code = normalizeStateCode(stateFromZip ?? '');
          return { price: stateAvg, label: `Live ZIP ${regionZip} → EIA-${code}` };
        }
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
