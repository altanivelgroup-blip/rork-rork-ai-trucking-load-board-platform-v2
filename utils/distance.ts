import { Platform } from 'react-native';

export type ZipLatLng = { lat: number; lng: number };

const cache: Record<string, ZipLatLng> = {};

export async function getLatLngForZip(zip: string): Promise<ZipLatLng> {
  const z = String(zip).trim();
  if (!/^[0-9]{5}$/.test(z)) throw new Error('Invalid ZIP code');
  if (cache[z]) return cache[z];
  try {
    const url = `https://api.zippopotam.us/us/${encodeURIComponent(z)}`;
    console.log('[distance] fetch', url);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('ZIP lookup failed');
    const data = (await res.json()) as { places?: Array<{ latitude?: string; longitude?: string }>; };
    const place = Array.isArray(data.places) && data.places[0] ? data.places[0] : undefined;
    const lat = place?.latitude ? Number(place.latitude) : NaN;
    const lng = place?.longitude ? Number(place.longitude) : NaN;
    if (!isFinite(lat) || !isFinite(lng)) throw new Error('ZIP geocode missing');
    const val = { lat, lng };
    cache[z] = val;
    return val;
  } catch (e) {
    console.error('[distance] getLatLngForZip error', e);
    throw e as Error;
  }
}

export function haversineMiles(a: ZipLatLng, b: ZipLatLng): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const d = R * c;
  return Math.max(0, d);
}

export async function estimateMileageFromZips(originZip?: string, destZip?: string): Promise<number | null> {
  try {
    if (!originZip || !destZip) return null;
    const [a, b] = await Promise.all([getLatLngForZip(originZip), getLatLngForZip(destZip)]);
    const straight = haversineMiles(a, b);
    const factor = 1.15;
    const est = straight * factor;
    const miles = Math.round(est);
    console.log('[distance] straight', straight, 'est', miles, 'platform', Platform.OS);
    return miles;
  } catch (e) {
    console.error('[distance] estimateMileageFromZips error', e);
    return null;
  }
}
