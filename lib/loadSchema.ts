// lib/loadSchema.ts
export const LOADS_COLLECTION = "loads";              // <— use this everywhere

export const LOAD_STATUS = {
  OPEN: "OPEN",
  // other statuses later…
} as const;

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