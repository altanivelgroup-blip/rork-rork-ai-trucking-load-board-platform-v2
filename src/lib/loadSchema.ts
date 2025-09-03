// src/lib/loadSchema.ts
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
};