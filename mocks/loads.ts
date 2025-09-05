import { Load, VehicleType } from '@/types';

// Helper function to calculate distance between two coordinates
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Filter loads by geo-fencing
export const filterLoadsByLocation = (
  loads: Load[],
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): Load[] => {
  return loads.filter(load => {
    const distanceToOrigin = calculateDistance(
      centerLat,
      centerLng,
      load.origin.lat,
      load.origin.lng
    );
    const distanceToDestination = calculateDistance(
      centerLat,
      centerLng,
      load.destination.lat,
      load.destination.lng
    );
    
    // Include load if either origin or destination is within radius
    return distanceToOrigin <= radiusMiles || distanceToDestination <= radiusMiles;
  });
};

export const mockLoads: Load[] = [
  {
    id: '1',
    shipperId: 'shipper1',
    shipperName: 'ABC Logistics',
    origin: {
      address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      lat: 34.0522,
      lng: -118.2437,
    },
    destination: {
      address: '456 Oak Ave',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      lat: 33.4484,
      lng: -112.0740,
    },
    distance: 373,
    weight: 42000,
    vehicleType: 'flatbed' as VehicleType,
    rate: 2800,
    ratePerMile: 7.51,
    pickupDate: new Date('2025-01-20'),
    deliveryDate: new Date('2025-01-21'),
    status: 'available',
    description: 'Construction materials - steel beams',
    special_requirements: ['Tarps required', 'Straps needed'],
    aiScore: 95,
  },
  {
    id: '2',
    shipperId: 'shipper2',
    shipperName: 'Fresh Foods Co',
    origin: {
      address: '789 Market St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      lat: 37.7749,
      lng: -122.4194,
    },
    destination: {
      address: '321 Pine St',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      lat: 45.5152,
      lng: -122.6784,
    },
    distance: 635,
    weight: 38000,
    vehicleType: 'reefer' as VehicleType,
    rate: 3500,
    ratePerMile: 5.51,
    pickupDate: new Date('2025-01-19'),
    deliveryDate: new Date('2025-01-20'),
    status: 'available',
    description: 'Frozen produce - temperature controlled',
    special_requirements: ['Maintain 32°F', 'Food grade trailer'],
    isBackhaul: true,
    aiScore: 88,
  },
  {
    id: '3',
    shipperId: 'shipper3',
    shipperName: 'Auto Transport Inc',
    origin: {
      address: '555 Auto Blvd',
      city: 'Detroit',
      state: 'MI',
      zipCode: '48201',
      lat: 42.3314,
      lng: -83.0458,
    },
    destination: {
      address: '999 Dealer Way',
      city: 'Atlanta',
      state: 'GA',
      zipCode: '30301',
      lat: 33.7490,
      lng: -84.3880,
    },
    distance: 716,
    weight: 45000,
    vehicleType: 'car-hauler' as VehicleType,
    rate: 4200,
    ratePerMile: 5.87,
    pickupDate: new Date('2025-01-22'),
    deliveryDate: new Date('2025-01-23'),
    status: 'available',
    description: '8 vehicles - mixed sedans and SUVs',
    special_requirements: ['Insurance verification required'],
    aiScore: 92,
  },
  {
    id: '4',
    shipperId: 'shipper4',
    shipperName: 'Texas Freight',
    origin: {
      address: '100 Industrial Blvd',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      lat: 29.7604,
      lng: -95.3698,
    },
    destination: {
      address: '200 Commerce St',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      lat: 32.7767,
      lng: -96.7970,
    },
    distance: 239,
    weight: 35000,
    vehicleType: 'truck' as VehicleType,
    rate: 1800,
    ratePerMile: 7.53,
    pickupDate: new Date('2025-01-21'),
    deliveryDate: new Date('2025-01-21'),
    status: 'available',
    description: 'Electronics shipment',
    special_requirements: ['Signature required'],
    aiScore: 90,
  },
  {
    id: '5',
    shipperId: 'shipper5',
    shipperName: 'East Coast Logistics',
    origin: {
      address: '300 Harbor Dr',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      lat: 25.7617,
      lng: -80.1918,
    },
    destination: {
      address: '400 Broadway',
      city: 'New York',
      state: 'NY',
      zipCode: '10013',
      lat: 40.7128,
      lng: -74.0060,
    },
    distance: 1280,
    weight: 48000,
    vehicleType: 'reefer' as VehicleType,
    rate: 6400,
    ratePerMile: 5.00,
    pickupDate: new Date('2025-01-23'),
    deliveryDate: new Date('2025-01-25'),
    status: 'available',
    description: 'Pharmaceutical products',
    special_requirements: ['Temperature controlled', 'Security escort'],
    aiScore: 85,
  },
];