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

// Generate a comprehensive set of mock loads to simulate a real load board
const generateMockLoads = (): Load[] => {
  const cities = [
    { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
    { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
    { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
    { name: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
    { name: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
    { name: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
    { name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
    { name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
    { name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
    { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
    { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
    { name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
    { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
    { name: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
    { name: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
    { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
    { name: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
    { name: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.4850 },
    { name: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.0490 },
    { name: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
    { name: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
    { name: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
    { name: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
    { name: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
    { name: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
    { name: 'Virginia Beach', state: 'VA', lat: 36.8529, lng: -75.9780 },
    { name: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.4360 },
    { name: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
    { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
    { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
    { name: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
    { name: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
    { name: 'Cincinnati', state: 'OH', lat: 39.1031, lng: -84.5120 },
    { name: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
    { name: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
    { name: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650 },
    { name: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
    { name: 'St. Louis', state: 'MO', lat: 38.6270, lng: -90.1994 },
    { name: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
    { name: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928 },
    { name: 'Little Rock', state: 'AR', lat: 34.7465, lng: -92.2896 },
    { name: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
    { name: 'Baton Rouge', state: 'LA', lat: 30.4515, lng: -91.1871 },
    { name: 'Birmingham', state: 'AL', lat: 33.5186, lng: -86.8104 },
    { name: 'Mobile', state: 'AL', lat: 30.6954, lng: -88.0399 },
    { name: 'Jackson', state: 'MS', lat: 32.2988, lng: -90.1848 },
    { name: 'Shreveport', state: 'LA', lat: 32.5252, lng: -93.7502 },
    { name: 'Amarillo', state: 'TX', lat: 35.2220, lng: -101.8313 },
    { name: 'Lubbock', state: 'TX', lat: 33.5779, lng: -101.8552 },
    { name: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
    { name: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
    { name: 'Boise', state: 'ID', lat: 43.6150, lng: -116.2023 },
    { name: 'Spokane', state: 'WA', lat: 47.6587, lng: -117.4260 },
    { name: 'Fresno', state: 'CA', lat: 36.7378, lng: -119.7871 },
    { name: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
    { name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
    { name: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
    { name: 'Oakland', state: 'CA', lat: 37.8044, lng: -122.2712 },
    { name: 'Bakersfield', state: 'CA', lat: 35.3733, lng: -119.0187 },
    { name: 'Stockton', state: 'CA', lat: 37.9577, lng: -121.2908 },
    { name: 'Riverside', state: 'CA', lat: 33.9533, lng: -117.3962 },
    { name: 'Anaheim', state: 'CA', lat: 33.8366, lng: -117.9143 },
    { name: 'Long Beach', state: 'CA', lat: 33.7701, lng: -118.1937 },
    { name: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
    { name: 'Mesa', state: 'AZ', lat: 33.4152, lng: -111.8315 },
    { name: 'Chandler', state: 'AZ', lat: 33.3062, lng: -111.8413 },
    { name: 'Glendale', state: 'AZ', lat: 33.5387, lng: -112.1860 },
    { name: 'Scottsdale', state: 'AZ', lat: 33.4942, lng: -111.9261 },
    { name: 'Flagstaff', state: 'AZ', lat: 35.1983, lng: -111.6513 },
    { name: 'Yuma', state: 'AZ', lat: 32.6927, lng: -114.6277 },
    { name: 'Reno', state: 'NV', lat: 39.5296, lng: -119.8138 },
    { name: 'Henderson', state: 'NV', lat: 36.0395, lng: -114.9817 },
    { name: 'North Las Vegas', state: 'NV', lat: 36.1989, lng: -115.1175 },
    { name: 'Carson City', state: 'NV', lat: 39.1638, lng: -119.7674 },
    { name: 'Eugene', state: 'OR', lat: 44.0521, lng: -123.0868 },
    { name: 'Salem', state: 'OR', lat: 44.9429, lng: -123.0351 },
    { name: 'Bend', state: 'OR', lat: 44.0582, lng: -121.3153 },
    { name: 'Medford', state: 'OR', lat: 42.3265, lng: -122.8756 },
    { name: 'Corvallis', state: 'OR', lat: 44.5646, lng: -123.2620 },
    { name: 'Tacoma', state: 'WA', lat: 47.2529, lng: -122.4443 },
    { name: 'Vancouver', state: 'WA', lat: 45.6387, lng: -122.6615 },
    { name: 'Bellevue', state: 'WA', lat: 47.6101, lng: -122.2015 },
    { name: 'Everett', state: 'WA', lat: 47.9790, lng: -122.2021 },
    { name: 'Kent', state: 'WA', lat: 47.3809, lng: -122.2348 },
    { name: 'Renton', state: 'WA', lat: 47.4829, lng: -122.2171 },
    { name: 'Spokane Valley', state: 'WA', lat: 47.6732, lng: -117.2394 },
    { name: 'Federal Way', state: 'WA', lat: 47.3223, lng: -122.3126 },
    { name: 'Yakima', state: 'WA', lat: 46.6021, lng: -120.5059 },
    { name: 'Bellingham', state: 'WA', lat: 48.7519, lng: -122.4787 }
  ];

  const vehicleTypes: VehicleType[] = ['cargo-van', 'truck', 'flatbed', 'reefer', 'car-hauler'];
  const shippers = [
    'ABC Logistics', 'Fresh Foods Co', 'Auto Transport Inc', 'Texas Freight', 'East Coast Logistics',
    'West Coast Shipping', 'Midwest Transport', 'Southern Express', 'Northern Routes', 'Central Freight',
    'Prime Logistics', 'Swift Transport', 'JB Hunt', 'Schneider', 'Werner Enterprises',
    'Knight Transportation', 'Landstar', 'Old Dominion', 'FedEx Freight', 'UPS Freight',
    'XPO Logistics', 'Estes Express', 'YRC Worldwide', 'Saia', 'R+L Carriers',
    'Southeastern Freight', 'AAA Cooper', 'Averitt Express', 'Dayton Freight', 'Holland',
    'New Penn', 'Roadway Express', 'USF Holland', 'Vitran Express', 'Wilson Trucking',
    'Celadon Group', 'Covenant Transport', 'Heartland Express', 'Marten Transport', 'PAM Transport',
    'Prime Inc', 'Stevens Transport', 'TMC Transportation', 'USA Truck', 'Vanguard Logistics'
  ];

  const descriptions = [
    'Construction materials - steel beams', 'Electronics shipment', 'Frozen produce - temperature controlled',
    '8 vehicles - mixed sedans and SUVs', 'Pharmaceutical products', 'Furniture and appliances',
    'Auto parts and accessories', 'Food and beverages', 'Clothing and textiles', 'Machinery and equipment',
    'Paper products', 'Chemical products', 'Building supplies', 'Consumer goods', 'Industrial equipment',
    'Agricultural products', 'Retail merchandise', 'Medical supplies', 'Office supplies', 'Sporting goods',
    'Home improvement materials', 'Automotive components', 'Technology equipment', 'Raw materials',
    'Finished goods', 'Perishable items', 'Hazardous materials', 'Oversized cargo', 'High-value items',
    'Fragile merchandise', 'Bulk commodities', 'Packaged goods', 'Liquid products', 'Dry goods',
    'Refrigerated items', 'Frozen products', 'Fresh produce', 'Dairy products', 'Meat products',
    'Bakery items', 'Beverages', 'Snack foods', 'Canned goods', 'Household items'
  ];

  const loads: Load[] = [];
  const now = new Date();

  // Generate 86+ loads to match your expected count
  for (let i = 1; i <= 90; i++) {
    const originCity = cities[Math.floor(Math.random() * cities.length)];
    let destinationCity = cities[Math.floor(Math.random() * cities.length)];
    
    // Ensure origin and destination are different
    while (destinationCity.name === originCity.name) {
      destinationCity = cities[Math.floor(Math.random() * cities.length)];
    }

    // Calculate distance (simplified)
    const distance = Math.floor(Math.random() * 2000) + 100;
    const rate = Math.floor((distance * (3 + Math.random() * 5)) / 10) * 10; // $3-8 per mile, rounded
    const ratePerMile = Number((rate / distance).toFixed(2));
    
    // Random pickup date within next 7 days
    const pickupDate = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    const deliveryDate = new Date(pickupDate.getTime() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000);
    
    const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    const shipper = shippers[Math.floor(Math.random() * shippers.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    const load: Load = {
      id: `mock-${i}`,
      shipperId: `shipper${i}`,
      shipperName: shipper,
      origin: {
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Maple Ln'][Math.floor(Math.random() * 5)]}`,
        city: originCity.name,
        state: originCity.state,
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        lat: originCity.lat + (Math.random() - 0.5) * 0.1, // Add small random offset
        lng: originCity.lng + (Math.random() - 0.5) * 0.1,
      },
      destination: {
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Commerce St', 'Industrial Blvd', 'Business Pkwy', 'Trade Center Dr', 'Logistics Way'][Math.floor(Math.random() * 5)]}`,
        city: destinationCity.name,
        state: destinationCity.state,
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        lat: destinationCity.lat + (Math.random() - 0.5) * 0.1,
        lng: destinationCity.lng + (Math.random() - 0.5) * 0.1,
      },
      distance,
      weight: Math.floor(Math.random() * 40000) + 10000, // 10k-50k lbs
      vehicleType,
      rate,
      ratePerMile,
      pickupDate,
      deliveryDate,
      status: 'available',
      description,
      special_requirements: Math.random() > 0.7 ? [
        ['Tarps required', 'Straps needed', 'Signature required', 'Temperature controlled', 'Hazmat certified'][Math.floor(Math.random() * 5)]
      ] : undefined,
      isBackhaul: Math.random() > 0.8, // 20% chance of backhaul
      aiScore: Math.floor(Math.random() * 30) + 70, // 70-100 AI score
    };
    
    loads.push(load);
  }
  
  return loads;
};

export const mockLoads: Load[] = generateMockLoads();