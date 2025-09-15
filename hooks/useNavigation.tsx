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
}

interface UseNavigationReturn {
  state: NavigationState;
  getRoute: (origin: Location, destination: Location) => Promise<RouteData | null>;
  clearRoute: () => void;
  toggleVoice: () => void;
  getCachedRoute: (origin: Location, destination: Location) => Promise<RouteData | null>;
  cacheRoute: (origin: Location, destination: Location, route: RouteData) => Promise<void>;
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
  });

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

  const getRouteFromAPI = useCallback(async (origin: Location, destination: Location): Promise<RouteData | null> => {
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

      console.log('[useNavigation] API route fetched successfully - Navigation ready');
      return route;
    } catch (error) {
      console.error('[useNavigation] API route fetch failed:', error);
      throw error;
    }
  }, []);

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
  }), [state, getRoute, clearRoute, toggleVoice, getCachedRoute, cacheRoute]);

  return memoizedReturn;
}