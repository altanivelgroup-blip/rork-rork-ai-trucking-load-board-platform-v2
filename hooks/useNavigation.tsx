import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '@/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { trpcClient } from '@/lib/trpc';
import { MAPBOX_TOKEN, ORS_API_KEY, hasMapbox, hasORS } from '@/utils/env';

interface RouteData {
  durationSec?: number;
  distanceMeters?: number;
  instructions?: string[];
  geometry?: any;
  provider: 'mapbox' | 'ors' | 'fallback';
  cachedAt: number;
}

interface NavigationState {
  isLoading: boolean;
  currentRoute: RouteData | null;
  error: string | null;
  isOffline: boolean;
  voiceEnabled: boolean;
  retryCount: number;
  lastRetryTime: number | null;
}

interface UseNavigationReturn {
  state: NavigationState;
  getRoute: (origin: Location, destination: Location) => Promise<RouteData | null>;
  clearRoute: () => void;
  toggleVoice: () => void;
  getCachedRoute: (origin: Location, destination: Location) => Promise<RouteData | null>;
  cacheRoute: (origin: Location, destination: Location, route: RouteData) => Promise<void>;
  retryRoute: (origin: Location, destination: Location) => Promise<RouteData | null>;
}

const CACHE_KEY_PREFIX = 'navigation_route_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const VOICE_SETTINGS_KEY = 'navigation_voice_enabled';

export function useNavigation(): UseNavigationReturn {
  const { online } = useOnlineStatus();
  const [state, setState] = useState<NavigationState>({
    isLoading: false,
    currentRoute: null,
    error: null,
    isOffline: !online,
    voiceEnabled: true,
    retryCount: 0,
    lastRetryTime: null,
  });
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  console.log('[useNavigation] Hook initialized - Online:', online);

  // Update offline status when connectivity changes
  useEffect(() => {
    setState(prev => ({ ...prev, isOffline: !online }));
  }, [online]);

  // Load voice settings on mount
  useEffect(() => {
    const loadVoiceSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
        if (stored !== null) {
          setState(prev => ({ ...prev, voiceEnabled: JSON.parse(stored) }));
        }
      } catch (error) {
        console.warn('[useNavigation] Failed to load voice settings:', error);
      }
    };
    loadVoiceSettings();
  }, []);

  const generateCacheKey = useCallback((origin: Location, destination: Location): string => {
    // Validate input parameters
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      throw new Error('Invalid origin location');
    }
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      throw new Error('Invalid destination location');
    }
    
    const originKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`;
    const destKey = `${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    return `${CACHE_KEY_PREFIX}${originKey}_to_${destKey}`;
  }, []);

  const getCachedRoute = useCallback(async (origin: Location, destination: Location): Promise<RouteData | null> => {
    try {
      // Validate input parameters
      if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
        console.warn('[useNavigation] Invalid origin location provided');
        return null;
      }
      if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
        console.warn('[useNavigation] Invalid destination location provided');
        return null;
      }
      
      const cacheKey = generateCacheKey(origin, destination);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const route: RouteData = JSON.parse(cached);
        const isExpired = Date.now() - route.cachedAt > CACHE_EXPIRY_MS;
        
        if (!isExpired) {
          console.log('[useNavigation] Using cached route - Offline route ready');
          return route;
        } else {
          // Clean up expired cache
          await AsyncStorage.removeItem(cacheKey);
          console.log('[useNavigation] Expired cache cleaned up');
        }
      }
    } catch (error) {
      console.warn('[useNavigation] Failed to get cached route:', error);
    }
    return null;
  }, [generateCacheKey]);

  const getDirectRouteFromAPI = useCallback(async (origin: Location, destination: Location, provider: 'mapbox' | 'ors'): Promise<RouteData | null> => {
    try {
      if (provider === 'mapbox' && hasMapbox) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-hgv/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?alternatives=false&overview=simplified&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Mapbox API failed: ${response.status}`);
        }
        
        const data = await response.json();
        const route = data.routes?.[0];
        
        if (route) {
          console.log('[useNavigation] Direct Mapbox API call successful - Navigation ready');
          return {
            durationSec: route.duration,
            distanceMeters: route.distance,
            provider: 'mapbox',
            cachedAt: Date.now(),
          };
        }
      } else if (provider === 'ors' && hasORS) {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]]
          })
        });
        
        if (!response.ok) {
          throw new Error(`ORS API failed: ${response.status}`);
        }
        
        const data = await response.json();
        const summary = data.routes?.[0]?.summary;
        
        if (summary) {
          console.log('[useNavigation] Direct ORS API call successful - Navigation ready');
          return {
            durationSec: summary.duration,
            distanceMeters: summary.distance,
            provider: 'ors',
            cachedAt: Date.now(),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.warn('[useNavigation] Direct API call failed:', error);
      return null;
    }
  }, []);

  const cacheRoute = useCallback(async (origin: Location, destination: Location, route: RouteData): Promise<void> => {
    try {
      // Validate input parameters
      if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
        console.warn('[useNavigation] Invalid origin location for caching');
        return;
      }
      if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
        console.warn('[useNavigation] Invalid destination location for caching');
        return;
      }
      
      const cacheKey = generateCacheKey(origin, destination);
      const routeWithTimestamp = {
        ...route,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(routeWithTimestamp));
      console.log('[useNavigation] Route cached for offline use');
    } catch (error) {
      console.warn('[useNavigation] Failed to cache route:', error);
    }
  }, [generateCacheKey]);

  const getRouteFromAPI = useCallback(async (origin: Location, destination: Location, isRetry: boolean = false): Promise<RouteData | null> => {
    try {
      // Validate input parameters
      if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
        console.warn('[useNavigation] Invalid origin location for API call');
        return null;
      }
      if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
        console.warn('[useNavigation] Invalid destination location for API call');
        return null;
      }
      
      console.log('[useNavigation] Fetching route from API...');
      
      // Prefer Mapbox if available, fallback to OpenRouteService
      const provider = hasMapbox ? 'mapbox' : hasORS ? 'ors' : null;
      
      if (!provider) {
        console.warn('[useNavigation] No API keys available for routing');
        return null;
      }

      try {
        const routeData = await trpcClient.route.eta.query({
          origin: { lat: origin.lat, lon: origin.lng },
          destination: { lat: destination.lat, lon: destination.lng },
          provider,
          mapboxToken: hasMapbox ? MAPBOX_TOKEN : undefined,
          orsKey: hasORS ? ORS_API_KEY : undefined,
          profile: 'driving-hgv',
        });

        const route: RouteData = {
          durationSec: routeData.durationSec,
          distanceMeters: routeData.distanceMeters,
          provider,
          cachedAt: Date.now(),
        };

        console.log(`[useNavigation] API route fetched successfully${isRetry ? ' (retry)' : ''} - Navigation ready`);
        // Clear retry count on success
        setState(prev => ({ ...prev, retryCount: 0, error: null }));
        return route;
      } catch (apiError) {
        console.warn(`[useNavigation] Route API failed${isRetry ? ' (retry)' : ''}:`, apiError);
        
        // Try direct API call to routing service
        const directRoute = await getDirectRouteFromAPI(origin, destination, provider);
        if (directRoute) {
          setState(prev => ({ ...prev, retryCount: 0, error: null }));
          return directRoute;
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('[useNavigation] API route fetch failed:', error);
      throw error;
    }
  }, [getDirectRouteFromAPI]);

  const getCurrentLocation = useCallback(async (): Promise<Location | null> => {
    try {
      // Try to get real location first
      if (Platform.OS !== 'web') {
        const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
        const { status } = await requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await getCurrentPositionAsync({ accuracy: 6 });
          const realLocation: Location = {
            address: '',
            city: 'Current Location',
            state: '',
            zipCode: '',
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          setCurrentLocation(realLocation);
          console.log('[useNavigation] Real location acquired:', realLocation.lat, realLocation.lng);
          return realLocation;
        }
      }
    } catch (error) {
      console.warn('[useNavigation] Failed to get real location, using fallback:', error);
    }
    
    // Fallback to mock location
    const mockLocation: Location = {
      address: '',
      city: 'Current Location (Mock)',
      state: '',
      zipCode: '',
      lat: 40.7128,
      lng: -74.0060,
    };
    setCurrentLocation(mockLocation);
    return mockLocation;
  }, []);

  const retryRoute = useCallback(async (origin: Location, destination: Location): Promise<RouteData | null> => {
    const now = Date.now();
    const timeSinceLastRetry = state.lastRetryTime ? now - state.lastRetryTime : Infinity;
    
    // Rate limit retries: minimum 2 seconds between attempts
    if (timeSinceLastRetry < 2000) {
      console.log('[useNavigation] Retry rate limited, please wait');
      return null;
    }
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      retryCount: prev.retryCount + 1,
      lastRetryTime: now 
    }));
    
    console.log(`[useNavigation] Retrying route (attempt ${state.retryCount + 1})`);
    
    try {
      if (online) {
        const apiRoute = await getRouteFromAPI(origin, destination, true);
        if (apiRoute) {
          await cacheRoute(origin, destination, apiRoute);
          setState(prev => ({ 
            ...prev, 
            currentRoute: apiRoute, 
            isLoading: false,
            error: null 
          }));
          return apiRoute;
        }
      }
      
      // If retry fails, show appropriate message
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: `Retry failed (${prev.retryCount}/${3}). ${online ? 'API unavailable' : 'Still offline'}.`
      }));
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `${errorMessage} (attempt ${prev.retryCount})`
      }));
      return null;
    }
  }, [online, getRouteFromAPI, cacheRoute, state.retryCount, state.lastRetryTime]);

  const getRoute = useCallback(async (origin: Location, destination: Location): Promise<RouteData | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // First, try to get cached route (works offline)
      const cachedRoute = await getCachedRoute(origin, destination);
      if (cachedRoute) {
        setState(prev => ({ 
          ...prev, 
          currentRoute: cachedRoute, 
          isLoading: false,
          error: null 
        }));
        return cachedRoute;
      }

      // If online, fetch from API
      if (online) {
        try {
          const apiRoute = await getRouteFromAPI(origin, destination);
          if (apiRoute) {
            // Cache the route for offline use
            await cacheRoute(origin, destination, apiRoute);
            
            setState(prev => ({ 
              ...prev, 
              currentRoute: apiRoute, 
              isLoading: false,
              error: null 
            }));
            return apiRoute;
          }
        } catch (apiError) {
          console.warn('[useNavigation] API failed, will use fallback:', apiError);
          setState(prev => ({ 
            ...prev, 
            error: state.retryCount < 3 ? 'Route failed - tap retry for another attempt' : 'Max retries reached - using basic navigation'
          }));
        }
      }

      // Fallback: create basic route data
      const fallbackRoute: RouteData = {
        provider: 'fallback',
        cachedAt: Date.now(),
      };
      
      setState(prev => ({ 
        ...prev, 
        currentRoute: fallbackRoute, 
        isLoading: false,
        error: online ? 'API unavailable, using basic navigation' : 'Offline mode - basic navigation only'
      }));
      
      console.log('[useNavigation] Using fallback route - Basic navigation available');
      return fallbackRoute;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Navigation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        currentRoute: null 
      }));
      console.error('[useNavigation] Route generation failed:', error);
      return null;
    }
  }, [online, getCachedRoute, getRouteFromAPI, cacheRoute]);

  const clearRoute = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      currentRoute: null, 
      error: null 
    }));
    console.log('[useNavigation] Route cleared');
  }, []);

  const toggleVoice = useCallback(async () => {
    try {
      const newVoiceEnabled = !state.voiceEnabled;
      setState(prev => ({ ...prev, voiceEnabled: newVoiceEnabled }));
      await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(newVoiceEnabled));
      console.log('[useNavigation] Voice guidance toggled:', newVoiceEnabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.warn('[useNavigation] Failed to save voice settings:', error);
    }
  }, [state.voiceEnabled]);

  const memoizedReturn = useMemo((): UseNavigationReturn => ({
    state,
    getRoute,
    clearRoute,
    toggleVoice,
    getCachedRoute,
    cacheRoute,
    retryRoute,
  }), [state, getRoute, clearRoute, toggleVoice, getCachedRoute, cacheRoute, retryRoute]);

  return memoizedReturn;
}