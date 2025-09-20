// TODO: Replace default ppg with EIA regional fuel price API; keep defaults as fallback.

export type FuelAnalyticsInput = {
  distanceMiles?: number | null;
  rateTotalUSD?: number | null;
  rate?: number | null;          // optional fallback
  rpm?: number | null;           // rate per mile optional
};

export type DriverFuelProfile = {
  mpgRated?: number | string | null;
  fuelType?: "diesel" | "gasoline" | "gas" | string | null;
};

export type LoadAnalyticsResult = {
  miles: number;
  mpg: number;
  fuel: "diesel" | "gasoline";
  ppg: number;
  gallonsNeeded: number;
  fuelCost: number;
  gross: number;
  netRevenue: number;
};

export function calculateLoadAnalytics(
  load: FuelAnalyticsInput,
  driver: DriverFuelProfile,
  opts?: { dieselPrice?: number; gasPrice?: number }
): LoadAnalyticsResult | null {
  // 1) Resolve miles
  const miles = Number(load.distanceMiles) || 0;
  
  // 2) Resolve driver mpg
  const mpg = Number(driver.mpgRated) || 0;
  
  // 3) Resolve fuel type
  const fuel = (driver.fuelType === "gas" ? "gasoline" : (driver.fuelType || "diesel")) as "diesel" | "gasoline";
  
  // 4) If miles<=0 or mpg<=0, return null
  if (miles <= 0 || mpg <= 0) {
    return null;
  }
  
  // 5) Resolve rate
  let gross = 0;
  if (load.rateTotalUSD) {
    gross = Number(load.rateTotalUSD);
  } else if (load.rpm && miles) {
    gross = Number(load.rpm) * miles;
  } else if (load.rate) {
    gross = Number(load.rate);
  }
  
  // 6) Use default prices with override
  const diesel = opts?.dieselPrice ?? 4.10;
  const gas = opts?.gasPrice ?? 3.65;
  const ppg = fuel === "gasoline" ? gas : diesel;
  
  // 7) Compute
  const gallonsNeeded = miles / mpg;
  const fuelCost = gallonsNeeded * ppg;
  const netRevenue = gross - fuelCost;
  
  // 8) Return
  return {
    miles,
    mpg,
    fuel,
    ppg,
    gallonsNeeded,
    fuelCost,
    gross,
    netRevenue
  };
}

export function formatCurrency(n: number): string {
  return `$${(n || 0).toFixed(2)}`;
}