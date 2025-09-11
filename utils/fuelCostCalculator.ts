import { Load, Driver, VehicleType } from '@/types';
import { estimateFuelForLoad, getDefaultsFor } from '@/utils/fuel';
import { getStateAvgPrice, normalizeStateCode } from '@/utils/fuelStateAvg';
import { DEFAULT_DIESEL_PRICE, DEFAULT_GAS_PRICE } from '@/utils/env';

export interface LoadCostBreakdown {
  grossEarnings: number;
  fuelCost: number;
  platformFee: number;
  netEarnings: number;
  fuelGallons: number;
  mpg: number;
  pricePerGallon: number;
  netPerMile: number;
  profitMargin: number; // percentage
}

export interface MonthlyNetSummary {
  totalGrossEarnings: number;
  totalFuelCosts: number;
  totalPlatformFees: number;
  totalNetEarnings: number;
  totalMiles: number;
  avgNetPerMile: number;
  profitMargin: number;
  loadsCompleted: number;
}

const PLATFORM_FEE_RATE = 0.03; // 3%

/**
 * Calculate comprehensive cost breakdown for a load including fuel costs
 */
export function calculateLoadCostBreakdown(
  load: Load,
  driver?: Driver | null
): LoadCostBreakdown {
  const grossEarnings = load.rate || 0;
  const platformFee = Math.round(grossEarnings * PLATFORM_FEE_RATE * 100) / 100;
  
  // Calculate fuel cost using existing fuel estimation logic
  const fuelEstimate = estimateFuelForLoad(load, driver);
  const fuelCost = Math.round(fuelEstimate.cost * 100) / 100;
  
  const netEarnings = grossEarnings - platformFee - fuelCost;
  const netPerMile = load.distance > 0 ? netEarnings / load.distance : 0;
  const profitMargin = grossEarnings > 0 ? (netEarnings / grossEarnings) * 100 : 0;
  
  return {
    grossEarnings,
    fuelCost,
    platformFee,
    netEarnings: Math.round(netEarnings * 100) / 100,
    fuelGallons: Math.round(fuelEstimate.gallons * 100) / 100,
    mpg: fuelEstimate.mpg,
    pricePerGallon: fuelEstimate.pricePerGallon,
    netPerMile: Math.round(netPerMile * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

/**
 * Calculate fuel cost for a load using driver profile or defaults
 */
export function calculateFuelCost(
  distance: number,
  vehicleType: VehicleType,
  driver?: Driver | null,
  stateCode?: string
): { cost: number; gallons: number; mpg: number; pricePerGallon: number } {
  // Get MPG from driver profile or defaults
  const defaults = getDefaultsFor(vehicleType);
  const mpg = driver?.fuelProfile?.averageMpg || driver?.mpgRated || defaults.mpg;
  
  // Get fuel price from driver profile, state average, or defaults
  let pricePerGallon = driver?.fuelProfile?.fuelPricePerGallon;
  
  if (!pricePerGallon && stateCode) {
    pricePerGallon = getStateAvgPrice(stateCode);
  }
  
  if (!pricePerGallon) {
    const fuelType = driver?.fuelType || driver?.fuelProfile?.fuelType || 'diesel';
    pricePerGallon = fuelType === 'gasoline' || fuelType === 'gas' 
      ? DEFAULT_GAS_PRICE 
      : DEFAULT_DIESEL_PRICE;
  }
  
  const gallons = distance / mpg;
  const cost = gallons * pricePerGallon;
  
  return {
    cost: Math.round(cost * 100) / 100,
    gallons: Math.round(gallons * 100) / 100,
    mpg,
    pricePerGallon,
  };
}

/**
 * Calculate net earnings after all costs
 */
export function calculateNetEarnings(
  grossAmount: number,
  fuelCost: number,
  platformFeeRate: number = PLATFORM_FEE_RATE
): number {
  const platformFee = grossAmount * platformFeeRate;
  return Math.round((grossAmount - platformFee - fuelCost) * 100) / 100;
}

/**
 * Format currency with proper handling for negative values
 */
export function formatNetCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Create a detailed earnings breakdown string
 */
export function formatEarningsBreakdown(
  grossEarnings: number,
  fuelCost: number,
  platformFee: number,
  netEarnings: number
): string {
  return `${formatNetCurrency(grossEarnings)} - ${formatNetCurrency(fuelCost)} fuel - ${formatNetCurrency(platformFee)} fees = ${formatNetCurrency(netEarnings)} net`;
}

/**
 * Calculate monthly summary with net earnings
 */
export function calculateMonthlyNetSummary(
  loads: Array<{
    grossEarnings: number;
    fuelCost: number;
    platformFee: number;
    miles: number;
  }>
): MonthlyNetSummary {
  const totals = loads.reduce(
    (acc, load) => ({
      grossEarnings: acc.grossEarnings + load.grossEarnings,
      fuelCosts: acc.fuelCosts + load.fuelCost,
      platformFees: acc.platformFees + load.platformFee,
      miles: acc.miles + load.miles,
    }),
    { grossEarnings: 0, fuelCosts: 0, platformFees: 0, miles: 0 }
  );
  
  const totalNetEarnings = totals.grossEarnings - totals.fuelCosts - totals.platformFees;
  const avgNetPerMile = totals.miles > 0 ? totalNetEarnings / totals.miles : 0;
  const profitMargin = totals.grossEarnings > 0 ? (totalNetEarnings / totals.grossEarnings) * 100 : 0;
  
  return {
    totalGrossEarnings: Math.round(totals.grossEarnings * 100) / 100,
    totalFuelCosts: Math.round(totals.fuelCosts * 100) / 100,
    totalPlatformFees: Math.round(totals.platformFees * 100) / 100,
    totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
    totalMiles: totals.miles,
    avgNetPerMile: Math.round(avgNetPerMile * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    loadsCompleted: loads.length,
  };
}