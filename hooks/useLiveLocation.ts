import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import type * as ExpoLocation from 'expo-location';

export type GeoCoords = { latitude: number; longitude: number };

type NativeLocationSubscription = { remove: () => void };

export function useLiveLocation() {
  const watchIdRef = useRef<number | null>(null);
  const subscriptionRef = useRef<NativeLocationSubscription | null>(null);

  const requestPermissionAsync = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        if (!('geolocation' in navigator)) {
          console.warn('Geolocation not supported on web');
          return false;
        }
        return true;
      }
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.error('Location permission error', e);
      return false;
    }
  }, []);

  const getForegroundPermissionStatusAsync = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        return 'geolocation' in navigator;
      }
      const Location = await import('expo-location');
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.error('Get foreground permission status error', e);
      return false;
    }
  }, []);

  const startWatching = useCallback(
    async (
      onUpdate: (coords: GeoCoords) => void,
      options?: { accuracy?: ExpoLocation.LocationAccuracy; distanceIntervalMeters?: number }
    ) => {
      const hasPerm = await requestPermissionAsync();
      if (!hasPerm) return () => {};

      if (Platform.OS === 'web') {
        try {
          const id = navigator.geolocation.watchPosition(
            (pos) => {
              onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            },
            (err) => {
              console.error('Web geolocation error', err);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
          );
          watchIdRef.current = id;
          return () => {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          };
        } catch (e) {
          console.error('Failed to start web geolocation', e);
          return () => {};
        }
      }

      try {
        const Location = await import('expo-location');
        const sub = await Location.watchPositionAsync(
          {
            accuracy: options?.accuracy ?? Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: options?.distanceIntervalMeters ?? 50,
          },
          (loc) => {
            const c = loc.coords;
            onUpdate({ latitude: c.latitude, longitude: c.longitude });
          }
        );
        subscriptionRef.current = sub as unknown as NativeLocationSubscription;
        return () => {
          try {
            subscriptionRef.current?.remove();
          } catch (e) {
            console.warn('Error removing native location subscription', e);
          }
          subscriptionRef.current = null;
        };
      } catch (e) {
        console.error('Failed to start native location', e);
        return () => {};
      }
    },
    [requestPermissionAsync]
  );

  const stopWatching = useCallback(() => {
    if (Platform.OS === 'web') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    try {
      subscriptionRef.current?.remove();
    } catch (e) {
      console.warn('Error stopping native subscription', e);
    }
    subscriptionRef.current = null;
  }, []);

  const requestBackgroundPermissionAsync = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        return false;
      }
      const Location = await import('expo-location');
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.error('Background location permission error', e);
      return false;
    }
  }, []);

  return { startWatching, stopWatching, requestPermissionAsync, requestBackgroundPermissionAsync, getForegroundPermissionStatusAsync };
}
