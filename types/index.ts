export type UserRole = 'driver' | 'shipper' | 'admin';

export type VehicleType = 
  | 'truck'
  | 'box-truck'
  | 'cargo-van'
  | 'trailer'
  | 'car-hauler'
  | 'flatbed'
  | 'enclosed-trailer'
  | 'reefer';

export type LoadStatus = 'OPEN' | 'available' | 'in-transit' | 'delivered' | 'cancelled';

export type DocumentType = 
  | 'cdl'
  | 'insurance'
  | 'registration'
  | 'medical-card'
  | 'hazmat'
  | 'twic';

export interface User {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  phone: string;
  company?: string;
  membershipTier: 'basic' | 'pro' | 'enterprise';
  createdAt: Date;
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
  lastLoginAt?: Date;
}

export interface Shipper extends User {
  role: 'shipper';
  companyName: string;
  mcNumber?: string;
  dotNumber?: string;
  insuranceCarrier?: string;
  insurancePolicy?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  totalLoadsPosted: number;
  activeLoads: number;
  completedLoads: number;
  totalRevenue: number;
  avgRating: number;
}

export interface FuelProfile {
  vehicleType: VehicleType;
  averageMpg: number;
  fuelPricePerGallon: number;
  fuelType: 'diesel' | 'gasoline';
  tankCapacity?: number;
}

export type FuelKind = 'diesel' | 'gas';

export interface PrimaryVehicle {
  type: 'truck' | 'trailer';
  subtype: string;
}

export interface Driver extends User {
  role: 'driver';
  cdlNumber: string;
  vehicleTypes: VehicleType[];
  rating: number;
  completedLoads: number;
  documents: Document[];
  wallet: Wallet;
  currentLocation?: Location;
  isAvailable: boolean;
  mcNumber?: string;
  dotNumber?: string;
  insuranceCarrier?: string;
  insurancePolicy?: string;
  vehicleInfo?: string;
  trailerInfo?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  fuelProfile?: FuelProfile;
  primaryVehicle?: PrimaryVehicle;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number | null;
  fuelType?: FuelKind;
  mpgRated?: number | null;
  vin?: string;
  plate?: string;
  tankGallons?: number | null;
  gvwrLbs?: number | null;
  // Company & Insurance fields
  companyName?: string;
  policyNumber?: string;
  // Trailer Information
  trailerMake?: string;
  trailerModel?: string;
  trailerYear?: number | null;
  trailerVin?: string;
  trailerPlate?: string;
  trailerInsuranceCarrier?: string;
  trailerPolicyNumber?: string;
  trailerGvwrLbs?: number | null;
  trailerType?: VehicleType;
  vehicleSubtype?: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  name: string;
  expiryDate?: Date;
  verified: boolean;
  uploadedAt: Date;
  url?: string;
}

export interface Wallet {
  balance: number;
  pendingEarnings: number;
  totalEarnings: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'earning' | 'withdrawal' | 'fee';
  description: string;
  date: Date;
  loadId?: string;
}

export interface Load {
  id: string;
  shipperId: string;
  shipperName: string;
  origin: Location;
  destination: Location;
  distance: number;
  weight: number;
  vehicleType: VehicleType;
  rate: number;
  ratePerMile: number;
  pickupDate: Date;
  deliveryDate: Date;
  status: LoadStatus;
  description: string;
  special_requirements?: string[];
  assignedDriverId?: string;
  isBackhaul?: boolean;
  aiScore?: number; // AI matching score
  bulkImportId?: string; // Bulk import session ID
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
}

export interface PreTripInspection {
  id: string;
  driverId: string;
  vehicleId: string;
  date: Date;
  items: InspectionItem[];
  signature?: string;
  notes?: string;
}

export interface InspectionItem {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleType: VehicleType;
  vehicleId: string;
  serviceType: string;
  date: Date;
  mileage: number;
  cost: number;
  notes: string;
  nextServiceDue?: Date;
}

export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  relatedLoadId?: string;
}

export type ScheduleType = 'pickup' | 'delivery' | 'maintenance' | 'meeting' | 'reminder';

export interface ScheduleItem {
  id: string;
  title: string;
  type: ScheduleType;
  start: Date;
  end: Date;
  location?: string;
  notes?: string;
  relatedLoadId?: string;
}

export interface BulkImportSession {
  id: string;
  userId: string;
  createdAt: Date;
  templateType: 'simple' | 'standard' | 'complete';
  fileName: string;
  totals: {
    valid: number;
    skipped: number;
    written: number;
  };
  notes?: string;
}