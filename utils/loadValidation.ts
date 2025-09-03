import { VehicleType } from '@/types';

export interface LoadValidationData {
  title: string;
  description: string;
  vehicleType: VehicleType | null;
  originCity: string;
  destinationCity: string;
  pickupDate: Date | null;
  deliveryDate: Date | null;
  weight: string | number;
  rate: string | number;
  rateType: 'flat' | 'per_mile';
  miles?: string | number;
  photoUrls: string[];
  shipperId: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const VALID_VEHICLE_TYPES: VehicleType[] = [
  'truck',
  'box-truck', 
  'cargo-van',
  'trailer',
  'car-hauler',
  'flatbed',
  'enclosed-trailer',
  'reefer'
];

export function validateLoad(load: LoadValidationData): ValidationResult {
  const errors: string[] = [];

  // Title validation
  if (!load.title || typeof load.title !== 'string') {
    errors.push('Title is required');
  } else if (load.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  } else if (load.title.trim().length > 140) {
    errors.push('Title must be 140 characters or less');
  }

  // Description validation
  if (!load.description || typeof load.description !== 'string') {
    errors.push('Description is required');
  } else if (load.description.trim().length < 3) {
    errors.push('Description must be at least 3 characters');
  } else if (load.description.trim().length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  // Vehicle type validation
  if (!load.vehicleType) {
    errors.push('Vehicle type is required');
  } else if (!VALID_VEHICLE_TYPES.includes(load.vehicleType)) {
    errors.push('Invalid vehicle type');
  }

  // Location validation
  if (!load.originCity || typeof load.originCity !== 'string' || load.originCity.trim().length === 0) {
    errors.push('Origin city is required');
  }
  if (!load.destinationCity || typeof load.destinationCity !== 'string' || load.destinationCity.trim().length === 0) {
    errors.push('Destination city is required');
  }

  // Date validation
  if (!load.pickupDate || !(load.pickupDate instanceof Date) || isNaN(load.pickupDate.getTime())) {
    errors.push('Valid pickup date is required');
  }
  if (!load.deliveryDate || !(load.deliveryDate instanceof Date) || isNaN(load.deliveryDate.getTime())) {
    errors.push('Valid delivery date is required');
  }
  if (load.pickupDate && load.deliveryDate && load.deliveryDate < load.pickupDate) {
    errors.push('Delivery date must be after pickup date');
  }

  // Weight validation
  const weightNum = typeof load.weight === 'number' ? load.weight : Number(String(load.weight).replace(/[^0-9.]/g, ''));
  if (isNaN(weightNum) || weightNum <= 0) {
    errors.push('Weight must be a positive number');
  }

  // Rate validation
  const rateNum = typeof load.rate === 'number' ? load.rate : Number(String(load.rate).replace(/[^0-9.]/g, ''));
  if (isNaN(rateNum) || rateNum <= 0) {
    errors.push('Rate must be a positive number');
  }

  // Rate type validation
  if (!load.rateType || !['flat', 'per_mile'].includes(load.rateType)) {
    errors.push('Rate type must be either "flat" or "per_mile"');
  }

  // Miles validation for per_mile rate
  if (load.rateType === 'per_mile') {
    const milesNum = typeof load.miles === 'number' ? load.miles : Number(String(load.miles || '').replace(/[^0-9.]/g, ''));
    if (isNaN(milesNum) || milesNum <= 0) {
      errors.push('Miles must be a positive number when using per-mile rate');
    }
  }

  // Photo validation
  if (!Array.isArray(load.photoUrls)) {
    errors.push('Photo URLs must be an array');
  } else if (load.photoUrls.length < 5) {
    errors.push('At least 5 photos are required');
  }

  // Shipper ID validation
  if (!load.shipperId || typeof load.shipperId !== 'string' || load.shipperId.trim().length === 0) {
    errors.push('Shipper ID is required');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function toNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  return Number(String(value).replace(/[^0-9.]/g, '')) || 0;
}

export function round(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}