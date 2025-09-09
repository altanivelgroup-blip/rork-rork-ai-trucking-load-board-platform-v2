export const VEHICLE_TYPES = [
  { value: 'truck', label: 'Truck' },
  { value: 'trailer', label: 'Trailer' },
] as const;

export type VehicleTypeOption = typeof VEHICLE_TYPES[number]['value'];

export const TRUCK_SUBTYPES = [
  'Hotshot',
  'Cargo Van',
  'Box Truck',
  'Semi Truck',
  'Pickup Truck',
  'Other',
] as const;

export const TRAILER_SUBTYPES = [
  'Flatbed Trailer',
  'Enclosed Trailer',
  'Gooseneck Trailer',
  'Car Hauler',
  'Utility Trailer',
  'Other',
] as const;

export type TruckSubtype = typeof TRUCK_SUBTYPES[number];
export type TrailerSubtype = typeof TRAILER_SUBTYPES[number];
export type AnySubtype = TruckSubtype | TrailerSubtype;
