import { memo } from 'react';
import { Platform, Linking, Alert } from 'react-native';

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

const Guards = () => null;
export const PlatformGuards = memo(Guards);
export default PlatformGuards;
