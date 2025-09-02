import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';
import { AUTO_ARRIVE_ENABLED } from '@/constants/flags';

interface AutoArriveState {
  arrivedPickups: Record<string, boolean>;
  isSheetOpen: boolean;
  sheetLoadId?: string;
  openSheet: (loadId: string) => void;
  closeSheet: () => void;
}

const ARRIVED_KEY_PREFIX = 'arrivedPickups:';

function haversineMiles(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 3958.8;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export const [AutoArriveProvider, useAutoArrive] = createContextHook<AutoArriveState>(() => {
  const { user } = useAuth();
  const { currentLoad } = useLoads();
  const { startWatching, stopWatching } = useLiveLocation();

  const [arrivedPickups, setArrivedPickups] = useState<Record<string, boolean>>({});
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [sheetLoadId, setSheetLoadId] = useState<string | undefined>(undefined);
  const lastNotifiedRef = useRef<string | null>(null);

  const storageKey = useMemo(() => {
    const uid = user?.id ?? 'guest';
    return `${ARRIVED_KEY_PREFIX}${uid}`;
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
        if (mounted) setArrivedPickups(parsed);
      } catch (e) {
        console.warn('[AutoArrive] hydrate error', e);
        if (mounted) setArrivedPickups({});
      }
    };
    void hydrate();
    return () => { mounted = false; };
  }, [storageKey]);

  const persist = useCallback((next: Record<string, boolean>) => {
    AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch((e) => console.warn('[AutoArrive] persist error', e));
  }, [storageKey]);

  const triggerHaptic = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('[AutoArrive] Haptics not available on web');
      return;
    }
    try {
      const Haptics = await import('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('[AutoArrive] haptics error', e);
    }
  }, []);

  const openSheet = useCallback((loadId: string) => {
    setSheetLoadId(loadId);
    setIsSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  useEffect(() => {
    if (!AUTO_ARRIVE_ENABLED) {
      console.log('[AutoArrive] Disabled via flag');
      return;
    }

    if (!currentLoad) {
      console.log('[AutoArrive] No current load to watch');
      return;
    }

    const pickup = currentLoad.origin;
    const pickupPoint = { latitude: pickup.lat, longitude: pickup.lng } as const;

    const onUpdate = (coords: GeoCoords) => {
      try {
        const miles = haversineMiles(coords, pickupPoint);
        if (miles <= 0.2) {
          if (!arrivedPickups[currentLoad.id]) {
            console.log('[AutoArrive] Entered pickup geofence for load', currentLoad.id, miles);
            setArrivedPickups((prev) => {
              const next = { ...prev, [currentLoad.id]: true };
              persist(next);
              return next;
            });
            void triggerHaptic();
            if (lastNotifiedRef.current !== currentLoad.id) {
              lastNotifiedRef.current = currentLoad.id;
              openSheet(currentLoad.id);
            }
          }
        }
      } catch (e) {
        console.error('[AutoArrive] onUpdate error', e);
      }
    };

    let stop: (() => void) | null = null;
    const start = async () => {
      try {
        stop = await startWatching(onUpdate, { distanceIntervalMeters: 25 });
      } catch (e) {
        console.error('[AutoArrive] startWatching error', e);
      }
    };
    void start();

    return () => {
      try {
        if (stop) stop();
        else stopWatching();
      } catch (e) {
        console.warn('[AutoArrive] stop error', e);
      }
    };
  }, [currentLoad?.id, currentLoad?.origin?.lat, currentLoad?.origin?.lng, arrivedPickups, startWatching, stopWatching, openSheet, triggerHaptic]);

  return useMemo(() => ({
    arrivedPickups,
    isSheetOpen,
    sheetLoadId,
    openSheet,
    closeSheet,
  }), [arrivedPickups, isSheetOpen, sheetLoadId, openSheet, closeSheet]);
});
