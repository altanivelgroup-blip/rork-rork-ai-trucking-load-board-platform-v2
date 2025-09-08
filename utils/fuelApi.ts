import { Load, Driver, VehicleType } from '@/types';
import { FuelEstimate, getDefaultsFor } from '@/utils/fuel';
import { getStateAvgPrice, normalizeStateCode } from '@/utils/fuelStateAvg';

export type FuelApiRequest = {
  load: Pick<Load, 'distance' | 'vehicleType' | 'weight' | 'origin' | 'destination'>;
  driver?: Pick<Driver, 'id' | 'fuelProfile'> | null;
};

export type FuelApiResponse = FuelEstimate & {
  method: 'remote' | 'local';
  regionLabel?: string;
};

export interface FuelApiOptions {
  apiUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

const WEIGHT_ADJUSTMENT_BREAKPOINTS = [
  { max: 5000, factor: 1.0 },
  { max: 10000, factor: 0.97 },
  { max: 20000, factor: 0.94 },
  { max: 30000, factor: 0.90 },
  { max: 40000, factor: 0.86 },
  { max: Number.POSITIVE_INFINITY, factor: 0.82 },
] as const;

const VEHICLE_AERO_FACTOR: Record<VehicleType, number> = {
  'truck': 1.0,
  'box-truck': 0.96,
  'cargo-van': 1.05,
  'trailer': 0.95,
  'car-hauler': 0.98,
  'flatbed': 0.97,
  'enclosed-trailer': 0.94,
  'reefer': 0.90,
};

function applyBehavioralAdjustment(baseMpg: number, driver?: FuelApiRequest['driver']): number {
  const userMpg = driver?.fuelProfile?.averageMpg;
  if (typeof userMpg === 'number' && userMpg > 0) return userMpg;
  return baseMpg;
}

function adjustedMpgFor(load: FuelApiRequest['load'], driver?: FuelApiRequest['driver']): number {
  const defaults = getDefaultsFor(load.vehicleType);
  const aero = VEHICLE_AERO_FACTOR[load.vehicleType] ?? 1.0;
  const weight = Number(load.weight ?? 0);
  const weightFactor = WEIGHT_ADJUSTMENT_BREAKPOINTS.find(b => weight <= b.max)?.factor ?? 1.0;
  const preliminary = defaults.mpg * aero * weightFactor;
  const withBehavior = applyBehavioralAdjustment(preliminary, driver);
  const floor = 3.0;
  const ceil = 25.0;
  const bounded = Math.min(ceil, Math.max(floor, withBehavior));
  return bounded;
}

function blendedStatePrice(originState?: string, destState?: string): { price?: number; label?: string } {
  const os = originState ? normalizeStateCode(originState) : undefined;
  const ds = destState ? normalizeStateCode(destState) : undefined;
  const po = os ? getStateAvgPrice(os) : undefined;
  const pd = ds ? getStateAvgPrice(ds) : undefined;
  if (typeof po === 'number' && typeof pd === 'number') {
    return { price: (po + pd) / 2, label: `EIA ${os}-${ds}` };
  }
  if (typeof po === 'number') return { price: po, label: `EIA ${os}` };
  if (typeof pd === 'number') return { price: pd, label: `EIA ${ds}` };
  return { price: undefined, label: undefined };
}

export async function fetchFuelEstimate(req: FuelApiRequest, opts?: FuelApiOptions): Promise<FuelApiResponse> {
  const load = req.load;
  const driver = req.driver ?? null;

  if (opts?.apiUrl) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), (opts.timeoutMs ?? 5000));
      const res = await fetch(opts.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      clearTimeout(to);
      if (res.ok) {
        const data: unknown = await res.json();
        const anyData: any = data as any;
        const gallons: number | undefined = anyData?.gallons;
        const cost: number | undefined = anyData?.cost;
        const mpg: number | undefined = anyData?.mpg;
        const pricePerGallon: number | undefined = anyData?.pricePerGallon;
        if (
          typeof gallons === 'number' &&
          typeof cost === 'number' &&
          typeof mpg === 'number' &&
          typeof pricePerGallon === 'number'
        ) {
          return { gallons, cost, mpg, pricePerGallon, method: 'remote', regionLabel: anyData?.regionLabel };
        }
        console.warn('[fuelApi] Remote responded without required fields. Falling back to local.', anyData);
      } else {
        console.warn('[fuelApi] Remote error', res.status, await res.text());
      }
    } catch (e) {
      console.warn('[fuelApi] Remote call failed. Using local.', e);
    }
  }

  const defaults = getDefaultsFor(load.vehicleType);
  const mpg = adjustedMpgFor(load, driver);

  const region = blendedStatePrice(load.origin?.state, load.destination?.state);
  const pricePerGallon = (typeof driver?.fuelProfile?.fuelPricePerGallon === 'number' && driver?.fuelProfile?.fuelPricePerGallon > 0)
    ? driver!.fuelProfile!.fuelPricePerGallon
    : (region.price ?? defaults.price);

  const safeMpg = mpg || 1;
  const distance = Number(load.distance ?? 0);
  const gallons = distance / safeMpg;
  const cost = gallons * pricePerGallon;

  return { gallons, cost, mpg: safeMpg, pricePerGallon, method: 'local', regionLabel: region.label };
}
