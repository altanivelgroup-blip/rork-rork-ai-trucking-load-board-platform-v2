import { Platform } from 'react-native';
import { VehicleType } from '@/types';

export type ZipLatLng = { lat: number; lng: number };

const cache: Record<string, ZipLatLng> = {};

const STATE_SPEED_LIMITS: Record<string, { truck: number; car: number }> = {
  AL: { truck: 65, car: 70 }, AK: { truck: 55, car: 65 }, AZ: { truck: 65, car: 75 },
  AR: { truck: 65, car: 70 }, CA: { truck: 55, car: 65 }, CO: { truck: 65, car: 75 },
  CT: { truck: 65, car: 65 }, DE: { truck: 65, car: 65 }, FL: { truck: 65, car: 70 },
  GA: { truck: 65, car: 70 }, HI: { truck: 55, car: 60 }, ID: { truck: 70, car: 80 },
  IL: { truck: 65, car: 70 }, IN: { truck: 65, car: 70 }, IA: { truck: 65, car: 70 },
  KS: { truck: 70, car: 75 }, KY: { truck: 65, car: 70 }, LA: { truck: 65, car: 70 },
  ME: { truck: 65, car: 70 }, MD: { truck: 65, car: 70 }, MA: { truck: 65, car: 65 },
  MI: { truck: 65, car: 70 }, MN: { truck: 65, car: 70 }, MS: { truck: 65, car: 70 },
  MO: { truck: 65, car: 70 }, MT: { truck: 70, car: 80 }, NE: { truck: 70, car: 75 },
  NV: { truck: 70, car: 80 }, NH: { truck: 65, car: 65 }, NJ: { truck: 65, car: 65 },
  NM: { truck: 70, car: 75 }, NY: { truck: 65, car: 65 }, NC: { truck: 65, car: 70 },
  ND: { truck: 70, car: 80 }, OH: { truck: 65, car: 70 }, OK: { truck: 70, car: 75 },
  OR: { truck: 60, car: 65 }, PA: { truck: 65, car: 70 }, RI: { truck: 65, car: 65 },
  SC: { truck: 65, car: 70 }, SD: { truck: 70, car: 80 }, TN: { truck: 65, car: 70 },
  TX: { truck: 70, car: 75 }, UT: { truck: 70, car: 80 }, VT: { truck: 65, car: 65 },
  VA: { truck: 65, car: 70 }, WA: { truck: 60, car: 70 }, WV: { truck: 65, car: 70 },
  WI: { truck: 65, car: 70 }, WY: { truck: 70, car: 80 }, DC: { truck: 45, car: 45 },
};

function stateCode(s?: string): string | undefined {
  if (!s) return undefined;
  const v = String(s).trim().toUpperCase();
  if (v.length === 2) return v;
  // Simple mapping for common names
  const map: Record<string, string> = { TEXAS: 'TX', CALIFORNIA: 'CA', FLORIDA: 'FL', NEWYORK: 'NY', NEW_YORK: 'NY' };
  return map[v.replace(/\s+/g, '')] ?? undefined;
}

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

export function defaultAvgSpeedForVehicle(v?: VehicleType | string): number {
  const map: Record<string, number> = {
    'truck': 57,
    'box-truck': 55,
    'cargo-van': 60,
    'trailer': 55,
    'car-hauler': 56,
    'flatbed': 55,
    'enclosed-trailer': 55,
    'reefer': 54,
  };
  const key = String(v ?? 'truck');
  const speed = map[key] ?? 55;
  return Math.max(30, Math.min(70, speed));
}

export function estimateAvgSpeedForRoute(originState?: string, destState?: string, v?: VehicleType | string): number {
  const vt = String(v ?? 'truck');
  const o = stateCode(originState);
  const d = stateCode(destState);
  const defaultSpeed = defaultAvgSpeedForVehicle(vt);
  const rowO = o ? STATE_SPEED_LIMITS[o] : undefined;
  const rowD = d ? STATE_SPEED_LIMITS[d] : undefined;
  const truckish = vt !== 'cargo-van';
  const laneSpeed =
    rowO && rowD
      ? ((truckish ? rowO.truck : rowO.car) + (truckish ? rowD.truck : rowD.car)) / 2
      : rowO
        ? (truckish ? rowO.truck : rowO.car)
        : rowD
          ? (truckish ? rowD.truck : rowD.car)
          : defaultSpeed;
  const blended = (laneSpeed * 0.75) + (defaultSpeed * 0.25);
  return Math.max(30, Math.min(75, blended));
}

export function estimateDurationHours(miles: number, avgSpeedMph?: number): number {
  const speed = Math.max(1, avgSpeedMph ?? 55);
  const hours = miles / speed;
  return Math.max(0, hours);
}

export function formatDurationHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function estimateArrivalTimestamp(departAtMs: number, durationHours: number): number {
  const ms = Math.max(0, Math.round(durationHours * 3600 * 1000));
  return departAtMs + ms;
}
