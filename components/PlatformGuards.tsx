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
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
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
