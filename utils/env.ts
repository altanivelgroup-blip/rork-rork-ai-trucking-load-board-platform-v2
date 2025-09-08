import { Platform } from 'react-native';

function pick(v?: string | null): string | undefined {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s || s === 'undefined' || s === 'null') return undefined;
  return s;
}

export const API_BASE_URL: string | undefined = pick(process.env.EXPO_PUBLIC_RORK_API_BASE_URL as any);
export const MAPBOX_TOKEN: string | undefined = pick(process.env.EXPO_PUBLIC_MAPBOX_TOKEN as any);
export const ORS_API_KEY: string | undefined = pick(process.env.EXPO_PUBLIC_ORS_API_KEY as any);
export const EIA_API_KEY: string | undefined = pick(process.env.EXPO_PUBLIC_EIA_API_KEY as any);
export const OPENWEATHER_API_KEY: string | undefined = pick(process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY as any);

export const hasApiBaseUrl: boolean = typeof API_BASE_URL === 'string' && !!API_BASE_URL;
export const hasMapbox: boolean = typeof MAPBOX_TOKEN === 'string' && !!MAPBOX_TOKEN;
export const hasORS: boolean = typeof ORS_API_KEY === 'string' && !!ORS_API_KEY;
export const hasEIA: boolean = typeof EIA_API_KEY === 'string' && !!EIA_API_KEY;
export const hasOpenWeather: boolean = typeof OPENWEATHER_API_KEY === 'string' && !!OPENWEATHER_API_KEY;

export function requireApiBaseUrl(): string {
  if (hasApiBaseUrl) return API_BASE_URL as string;
  const m = '[env] Missing EXPO_PUBLIC_RORK_API_BASE_URL';
  console.error(m, { Platform: Platform.OS });
  throw new Error(m);
}
