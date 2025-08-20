import { memo, useEffect, useRef } from 'react';
import { Platform, Linking, Alert, AppState, AppStateStatus } from 'react-native';

export function safeOpenURL(url: string): void {
  try {
    console.log('[PlatformGuards] safeOpenURL', url);
    if (!url || typeof url !== 'string') return;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }
    Linking.openURL(url).catch((e) => {
      console.log('[PlatformGuards] Linking.openURL error', e);
      Alert.alert('Unable to open link', 'Please try again later.');
    });
  } catch (e) {
    console.log('[PlatformGuards] safeOpenURL catch', e);
  }
}

export function safeVibrate(): void {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        (navigator as unknown as { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(30);
      }
      return;
    }
    const Haptics = require('expo-haptics');
    Haptics.selectionAsync?.();
  } catch (e) {
    console.log('[PlatformGuards] safeVibrate error', e);
  }
}

function Guards() {
  const appState = useRef<AppStateStatus | null>(null);
  const wakeLockRef = useRef<any | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let interval: number | undefined;
    const ping = async () => {
      try {
        console.log('[PlatformGuards] keep-alive ping');
        await fetch('/', { method: 'HEAD', cache: 'no-store' });
      } catch (e) {
        console.log('[PlatformGuards] keep-alive error', e);
      }
    };
    const start = () => {
      if (interval) return;
      interval = window.setInterval(ping, 30000);
      ping();
    };
    const stop = () => {
      if (interval) {
        window.clearInterval(interval);
        interval = undefined;
      }
    };

    const requestWakeLock = async () => {
      try {
        const anyNavigator = navigator as unknown as { wakeLock?: { request: (type: 'screen') => Promise<any> } };
        if (!anyNavigator?.wakeLock) {
          console.log('[PlatformGuards] Wake Lock API not available');
          return;
        }
        if (wakeLockRef.current) return;
        console.log('[PlatformGuards] requesting screen wake lock');
        wakeLockRef.current = await anyNavigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener?.('release', () => {
          console.log('[PlatformGuards] wake lock released');
          wakeLockRef.current = null;
        });
      } catch (e) {
        console.log('[PlatformGuards] wake lock request error', e);
      }
    };

    const releaseWakeLock = async () => {
      try {
        if (wakeLockRef.current?.release) {
          await wakeLockRef.current.release();
        }
      } catch (e) {
        console.log('[PlatformGuards] wake lock release error', e);
      } finally {
        wakeLockRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
        void requestWakeLock();
      } else {
        stop();
        void releaseWakeLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    window.addEventListener('beforeunload', releaseWakeLock);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', releaseWakeLock);
      stop();
      void releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const activateNativeKeepAwake = async () => {
      if (Platform.OS === 'web') return;
      try {
        const mod = await import('expo-keep-awake');
        const api: Partial<{ activateKeepAwakeAsync: () => Promise<void>; deactivateKeepAwake: () => void } & { useKeepAwake: () => void }> = mod as any;
        if (api.activateKeepAwakeAsync) {
          console.log('[PlatformGuards] activating native keep awake');
          await api.activateKeepAwakeAsync();
        } else if ('useKeepAwake' in api && typeof (api as any).useKeepAwake === 'function') {
          console.log('[PlatformGuards] using hook-based keep awake');
          (api as any).useKeepAwake();
        } else {
          console.log('[PlatformGuards] expo-keep-awake API not found');
        }
      } catch (e) {
        console.log('[PlatformGuards] native keep-awake unavailable', e);
      }
    };

    void activateNativeKeepAwake();

    return () => {
      if (!isMounted) return;
      isMounted = false;
      (async () => {
        try {
          if (Platform.OS === 'web') return;
          const mod = await import('expo-keep-awake');
          const api: Partial<{ deactivateKeepAwake: () => void; deactivateKeepAwakeAsync?: () => Promise<void> }> = mod as any;
          if (api.deactivateKeepAwake) {
            console.log('[PlatformGuards] deactivating native keep awake');
            api.deactivateKeepAwake();
          } else if (api.deactivateKeepAwakeAsync) {
            console.log('[PlatformGuards] deactivating native keep awake (async)');
            await api.deactivateKeepAwakeAsync?.();
          }
        } catch (e) {
          console.log('[PlatformGuards] native keep-awake deactivate error', e);
        }
      })();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      appState.current = next;
      console.log('[PlatformGuards] app state', next);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
export const PlatformGuards = memo(Guards);
export default PlatformGuards;
