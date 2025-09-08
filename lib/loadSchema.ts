// lib/loadSchema.ts
export const LOADS_COLLECTION = "loads";              // <— use this everywhere

export const LOAD_STATUS = {
  OPEN: "OPEN",
  // other statuses later…
} as const;

export type Place = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

export type LoadDoc = {
  title: string;
  origin: string;
  destination: string;
  vehicleType: string;
  rate: number;
  status: keyof typeof LOAD_STATUS | "OPEN";
  createdBy: string;
  pickupDate: any;     // Firestore Timestamp
  deliveryDate: any;   // Firestore Timestamp
  createdAt: any;      // serverTimestamp
  clientCreatedAt: number; // Date.now()
  attachments: { url: string; path?: string | null }[];
  // New photo fields for PhotoUploader
  photos?: string[];   // Array of HTTPS URLs
  primaryPhoto?: string; // HTTPS URL of cover photo
  updatedAt?: any;     // serverTimestamp
  // Archival fields
  isArchived?: boolean;
  archivedAt?: any;    // serverTimestamp
  expiresAtMs?: number; // deliveryDateLocal -> UTC + 36h (server truth)
  // Timezone-safe delivery fields
  deliveryDateLocal?: string; // "YYYY-MM-DDTHH:mm"
  deliveryTZ?: string;        // IANA tz e.g. "America/Phoenix"
  // Structured geolocation (non-breaking addition)
  originPlace?: Place;
  destinationPlace?: Place;
  // Normalized business metrics
  revenueUsd?: number;
  distanceMi?: number;
  weightLbs?: number;
};

// Vehicle document type
export const VEHICLES_COLLECTION = "vehicles";

export type VehicleDoc = {
  title: string;
  type: string;
  year?: number;
  make?: string;
  model?: string;
  status: string;
  createdBy: string;
  createdAt: any;      // serverTimestamp
  clientCreatedAt: number; // Date.now()
  // Photo fields for PhotoUploader
  photos?: string[];   // Array of HTTPS URLs
  primaryPhoto?: string; // HTTPS URL of cover photo
  updatedAt?: any;     // serverTimestamp
};

// Drivers collection
enum FuelTypeEnum {
  diesel = 'diesel',
  gas = 'gas'
}

export const DRIVERS_COLLECTION = 'drivers';

export type DriverDoc = {
  displayName: string;
  email: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  fuelType: keyof typeof FuelTypeEnum; // 'diesel' | 'gas'
  mpgRated: number;                     // driver-stated baseline MPG
  vin: string;
  plate: string;
  tankGallons: number | null;
  gvwrLbs: number | null;
  createdAt: any; // serverTimestamp
};