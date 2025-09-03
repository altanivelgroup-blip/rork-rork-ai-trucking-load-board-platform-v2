export interface LoadItem {
  id: string;
  title: string;
  origin: string;
  destination: string;
  weightLbs?: number;
  equipment?: string;
  pickupDate: string;   // ISO
  payUSD?: number;
  postedAt: string;     // ISO
  source: string;       // e.g., "Mock"
}

export interface LoadsProvider {
  name: string;
  fetchLoads(params?: { lane?: { origin?: string; destination?: string }, page?: number }): Promise<LoadItem[]>;
}