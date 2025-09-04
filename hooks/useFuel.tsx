import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Load, VehicleType } from '@/types';
import { getDefaultsFor } from '@/utils/fuel';
import { getStateAvgPrice, normalizeStateCode } from '@/utils/fuelStateAvg';
import { useToast } from '@/components/Toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

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
  refetchRegion: () => void;
}

const defaultFuelState: FuelContextState = {
  source: 'auto',
  setSource: () => console.warn('[Fuel] setSource called outside provider'),
  regionMode: 'auto',
  setRegionMode: () => console.warn('[Fuel] setRegionMode called outside provider'),
  zip: undefined,
  setZip: () => console.warn('[Fuel] setZip called outside provider'),
  stateCode: undefined,
  setStateCode: () => console.warn('[Fuel] setStateCode called outside provider'),
  lastUpdated: undefined,
  isResolving: false,
  resolvePriceFor: () => ({ price: undefined, label: 'Default' }),
  refetchRegion: () => console.warn('[Fuel] refetchRegion called outside provider'),
};

export const [FuelProvider, useFuel] = createContextHook<FuelContextState>(() => {
  const [source, setSource] = useState<FuelSource>('auto');
  const [regionMode, setRegionMode] = useState<RegionMode>('auto');
  const [zip, setZip] = useState<string | undefined>(undefined);
  const [stateCode, setStateCode] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const { show } = useToast();
  const { online } = useOnlineStatus();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchRegion = useCallback(() => {
    setRegionMode(m => m);
  }, []);

  useEffect(() => {
    if (regionMode !== 'auto') return;
    (async () => {
      try {
        setIsResolving(true);
        if (!online) {
          show('Offline: using defaults for fuel prices', 'warning', 2500);
        }
        if (Platform.OS === 'web') {
          try {
            const hasNavigator: boolean = typeof navigator !== 'undefined' && !!navigator;
            const hasGeo: boolean = hasNavigator && 'geolocation' in navigator;
            if (!hasGeo) { setIsResolving(false); return; }

            const getPosition = (): Promise<any> => new Promise((resolve, reject) => {
              try {
                const onSuccess = (pos: any) => resolve(pos);
                const onError = (err: any) => reject(err);
                navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false });
              } catch (err) {
                reject(err);
              }
            });

            let latitude: number | undefined;
            let longitude: number | undefined;
            try {
              const pos = await getPosition();
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
            } catch (err) {
              console.warn('[Fuel] web geolocation blocked/failed, falling back to IP geolocate', err);
              show('Location blocked. Falling back to IP region.', 'warning', 2600);
            }

            let zipCandidate: string | undefined;
            let stateCandidate: string | undefined;

            if (typeof latitude === 'number' && typeof longitude === 'number') {
              try {
                const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
                const res = await fetch(url, { method: 'GET' });
                const data: unknown = await res.json();
                const anyData: any = data as any;
                const postcode: string | undefined = anyData?.postcode ?? anyData?.localityInfo?.administrative?.find((a: any) => a?.order === 5)?.name;
                const principalSubdivisionCode: string | undefined = anyData?.principalSubdivisionCode;
                if (typeof principalSubdivisionCode === 'string' && principalSubdivisionCode.includes('-')) {
                  stateCandidate = principalSubdivisionCode.split('-')[1];
                } else if (Array.isArray(anyData?.localityInfo?.administrative)) {
                  const admin = anyData.localityInfo.administrative.find((a: any) => typeof a?.isoCode === 'string' && a.isoCode.length === 2);
                  stateCandidate = admin?.isoCode;
                }
                if (postcode) zipCandidate = String(postcode);
              } catch (e) {
                console.warn('[Fuel] reverse geocode fetch failed (web lat/lon)', e);
                show('Slow network: reverse geocode failed', 'warning', 2400);
              }
            }

            if (!zipCandidate || !stateCandidate) {
              try {
                const res = await fetch('https://ipapi.co/json/', { method: 'GET' });
                const ip: unknown = await res.json();
                const ipd: any = ip as any;
                const postal: string | undefined = ipd?.postal;
                const regionCode: string | undefined = ipd?.region_code;
                if (!zipCandidate && postal) zipCandidate = String(postal);
                if (!stateCandidate && regionCode) stateCandidate = String(regionCode);
              } catch (e) {
                console.warn('[Fuel] IP geolocation fallback failed', e);
                show('IP lookup failed. Using defaults.', 'warning', 2400);
              }
            }

            if (zipCandidate) setZip(zipCandidate);
            if (stateCandidate) setStateCode(normalizeStateCode(stateCandidate));
            if (zipCandidate || stateCandidate) setLastUpdated(new Date().toISOString());
          } catch (e) {
            console.warn('[Fuel] web auto region fatal', e);
          } finally {
            setIsResolving(false);
          }
          return;
        }
        const Location = await import('expo-location');
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') { setIsResolving(false); show('Location denied. Using defaults.', 'warning', 2400); return; }
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
  }, [regionMode, online, show]);

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

  useEffect(() => {
    if (isResolving) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        if (isResolving) show('Fuel region resolving… network may be slow', 'info', 2200);
      }, 1500);
    } else if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    return () => { if (slowTimerRef.current) { clearTimeout(slowTimerRef.current); slowTimerRef.current = null; } };
  }, [isResolving, show]);

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
    refetchRegion,
  }), [source, regionMode, zip, stateCode, lastUpdated, isResolving, resolvePriceFor, refetchRegion]);
}, defaultFuelState);
