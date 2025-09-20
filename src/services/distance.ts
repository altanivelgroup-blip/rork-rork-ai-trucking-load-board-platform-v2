import Constants from 'expo-constants';
import { extractEndpoints, sanitizeZip } from './zipUtil';

// Environment variables with fallbacks
const MAPBOX = Constants.expoConfig?.extra?.EXPO_PUBLIC_MAPBOX_TOKEN ?? process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const ORS = Constants.expoConfig?.extra?.EXPO_PUBLIC_ORS_API_KEY ?? process.env.EXPO_PUBLIC_ORS_API_KEY;

// Simple in-memory cache
const milesCache = new Map<string, number>();

type LatLng = { lat: number; lon: number };

// Haversine distance calculation
function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.7613; // Earth's radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// Geocode ZIP code to coordinates
async function geocodeZip(zip: string): Promise<LatLng | null> {
  try {
    if (MAPBOX) {
      // Use Mapbox Geocoding API
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(zip)}.json?country=US&limit=1&access_token=${MAPBOX}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Mapbox geocoding failed');
      const data = await response.json();
      if (data.features && data.features[0] && data.features[0].center) {
        const [lon, lat] = data.features[0].center;
        return { lat, lon };
      }
    }
    
    // Fallback to zippopotam.us
    const url = `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Zippopotam geocoding failed');
    const data = await response.json();
    if (data.places && data.places[0]) {
      const place = data.places[0];
      return {
        lat: parseFloat(place.latitude),
        lon: parseFloat(place.longitude)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('[distance] Geocoding failed for ZIP', zip, error);
    return null;
  }
}

// Geocode any text (ZIP or freeform address) using Mapbox
async function geocodeAny(text: string): Promise<LatLng | null> {
  try {
    if (!MAPBOX) {
      console.warn('[distance] No Mapbox token for freeform geocoding');
      return null;
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?country=US&limit=1&access_token=${MAPBOX}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Mapbox freeform geocoding failed');
    
    const data = await response.json();
    if (data.features && data.features[0] && data.features[0].center) {
      const [lon, lat] = data.features[0].center;
      return { lat, lon };
    }
    
    return null;
  } catch (error) {
    console.warn('[distance] Freeform geocoding failed for text', text, error);
    return null;
  }
}

// Get route distance using routing APIs
async function routeMiles(a: LatLng, b: LatLng): Promise<number | null> {
  try {
    if (ORS) {
      // Use OpenRouteService
      const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': ORS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [[a.lon, a.lat], [b.lon, b.lat]]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0] && data.routes[0].summary) {
          const meters = data.routes[0].summary.distance;
          return meters / 1609.34; // Convert to miles
        }
      }
    }
    
    if (MAPBOX) {
      // Use Mapbox Directions API
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&access_token=${MAPBOX}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const meters = data.routes[0].distance;
          return meters / 1609.34; // Convert to miles
        }
      }
    }
    
    // Fallback to Haversine with road factor
    return haversineMiles(a, b) * 1.2;
  } catch (error) {
    console.warn('[distance] Route calculation failed, using Haversine fallback', error);
    return haversineMiles(a, b) * 1.2;
  }
}

// Main function to compute distance from ZIP codes
export async function computeDistanceMilesFromZips(origZip: string, destZip: string): Promise<number | null> {
  try {
    // Normalize ZIP codes
    const normalizedOrig = origZip.trim().slice(0, 5);
    const normalizedDest = destZip.trim().slice(0, 5);
    
    if (!/^\d{5}$/.test(normalizedOrig) || !/^\d{5}$/.test(normalizedDest)) {
      console.warn('[distance] Invalid ZIP code format:', origZip, destZip);
      return null;
    }
    
    const key = `${normalizedOrig}-${normalizedDest}`;
    
    // Check cache
    if (milesCache.has(key)) {
      return milesCache.get(key)!;
    }
    
    // Geocode both ZIP codes
    const [origCoords, destCoords] = await Promise.all([
      geocodeZip(normalizedOrig),
      geocodeZip(normalizedDest)
    ]);
    
    if (!origCoords || !destCoords) {
      console.warn('[distance] Failed to geocode ZIP codes:', origZip, destZip);
      return null;
    }
    
    // Calculate route distance
    const miles = await routeMiles(origCoords, destCoords);
    
    if (miles && miles > 0) {
      // Cache the result
      milesCache.set(key, miles);
      return Math.round(miles * 10) / 10; // Round to 1 decimal place
    }
    
    return null;
  } catch (error) {
    console.error('[distance] computeDistanceMilesFromZips error:', error);
    return null;
  }
}

// Main function to compute distance from load object with robust endpoint extraction
export async function computeDistanceMiles(load: any): Promise<number | null> {
  try {
    if (!load) {
      console.warn('[distance] No load provided');
      return null;
    }

    const endpoints = extractEndpoints(load);
    const cacheKey = `${endpoints.origin.zip || endpoints.origin.text}-${endpoints.destination.zip || endpoints.destination.text}`;
    
    // Check cache first
    if (milesCache.has(cacheKey)) {
      return milesCache.get(cacheKey)!;
    }

    let originCoords: LatLng | null = null;
    let destCoords: LatLng | null = null;

    // Try to geocode origin
    if (endpoints.origin.zip) {
      // Clean ZIP available - use ZIP geocoding
      originCoords = await geocodeZip(endpoints.origin.zip);
    }
    
    if (!originCoords && endpoints.origin.text) {
      // Fallback to freeform geocoding
      originCoords = await geocodeAny(endpoints.origin.text);
    }

    // Try to geocode destination
    if (endpoints.destination.zip) {
      // Clean ZIP available - use ZIP geocoding
      destCoords = await geocodeZip(endpoints.destination.zip);
    }
    
    if (!destCoords && endpoints.destination.text) {
      // Fallback to freeform geocoding
      destCoords = await geocodeAny(endpoints.destination.text);
    }

    if (!originCoords || !destCoords) {
      console.warn('[distance] Failed to geocode endpoints:', {
        origin: endpoints.origin,
        destination: endpoints.destination,
        originCoords: !!originCoords,
        destCoords: !!destCoords
      });
      return null;
    }

    // Calculate route distance
    const miles = await routeMiles(originCoords, destCoords);
    
    if (miles && miles > 0) {
      // Cache the result
      milesCache.set(cacheKey, miles);
      return Math.round(miles * 10) / 10; // Round to 1 decimal place
    }
    
    return null;
  } catch (error) {
    console.error('[distance] computeDistanceMiles error:', error);
    return null;
  }
}

// Legacy function for backward compatibility
export function extractZips(load: any): { origZip: string | null; destZip: string | null } {
  const endpoints = extractEndpoints(load);
  return {
    origZip: endpoints.origin.zip,
    destZip: endpoints.destination.zip
  };
}