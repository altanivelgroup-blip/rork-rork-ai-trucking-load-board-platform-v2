import { VehicleType, Driver, Load } from '@/types';

export type FuelEstimate = {
  gallons: number;
  cost: number;
  mpg: number;
  pricePerGallon: number;
};

const DEFAULT_MPG: Record<VehicleType, number> = {
  'truck': 7.0,
  'box-truck': 9.0,
  'cargo-van': 14.0,
  'trailer': 7.0,
  'car-hauler': 8.5,
  'flatbed': 6.8,
  'enclosed-trailer': 7.5,
  'reefer': 6.5,
};

const DEFAULT_PRICE_PER_GALLON: Record<VehicleType, number> = {
  'truck': 4.25,
  'box-truck': 4.10,
  'cargo-van': 3.85,
  'trailer': 4.25,
  'car-hauler': 4.20,
  'flatbed': 4.30,
  'enclosed-trailer': 4.25,
  'reefer': 4.35,
};

export function getDefaultsFor(vehicleType: VehicleType): { mpg: number; price: number } {
  const mpg = DEFAULT_MPG[vehicleType] ?? 8;
  const price = DEFAULT_PRICE_PER_GALLON[vehicleType] ?? 4.1;
  return { mpg, price };
}

export function estimateFuelForLoad(load: Load, driver?: Driver | null, opts?: { overrideMpg?: number; overridePricePerGallon?: number }): FuelEstimate {
  const vt = load.vehicleType;
  const defaults = getDefaultsFor(vt);
  const mpg = opts?.overrideMpg ?? driver?.fuelProfile?.averageMpg ?? defaults.mpg;
  const pricePerGallon = opts?.overridePricePerGallon ?? driver?.fuelProfile?.fuelPricePerGallon ?? defaults.price;
  const safeMpg = mpg || 1;
  const gallons = load.distance / safeMpg;
  const cost = gallons * pricePerGallon;
  return { gallons, cost, mpg: safeMpg, pricePerGallon };
}

export function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString()}`;
  }
}
