import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { MapPin, Navigation, CheckCircle, AlertCircle, Volume2, VolumeX, Wifi, WifiOff, Fuel } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Load, Location } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { FuelSelector } from '@/components/FuelSelector';
import { FuelAlert } from '@/components/FuelAlert';
import { useFuelMonitor, useFuelDisplay } from '@/hooks/useFuelMonitor';

interface DriverNavigationProps {
  load: Load;
  onPickupConfirmed: () => void;
  onDeliveryConfirmed: () => void;
}

type NavigationPhase = 'to-pickup' | 'to-delivery' | 'completed';

export const DriverNavigation: React.FC<DriverNavigationProps> = ({
  load,
  onPickupConfirmed,
  onDeliveryConfirmed,
}) => {
  useAuth(); // Hook for potential future use
  const [currentPhase, setCurrentPhase] = useState<NavigationPhase>('to-pickup');
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [showFuelSelector, setShowFuelSelector] = useState<boolean>(false);
  const { state: navState, getRoute, clearRoute, toggleVoice, retryRoute } = useNavigation();
  const { resetFuelMonitor } = useFuelMonitor();
  const { fuelLevel, isLowFuel, fuelColor } = useFuelDisplay();

  console.log('[DriverNavigation] Rendering with phase:', currentPhase, 'Navigation state:', navState.isOffline ? 'offline' : 'online');

  const formatLocation = useCallback((location: Location): string => {
    return `${location.address || ''} ${location.city}, ${location.state} ${location.zipCode}`.trim();
  }, []);

  const getCurrentDestination = useCallback((): Location => {
    return currentPhase === 'to-pickup' ? load.origin : load.destination;
  }, [currentPhase, load.origin, load.destination]);

  // Get route data when phase changes
  useEffect(() => {
    const loadRoute = async () => {
      const currentDestination = getCurrentDestination();
      if (currentDestination && (currentDestination.lat !== 0 || currentDestination.lng !== 0)) {
        try {
          // Try to get real location first
          let currentLocation: Location;
          
          if (Platform.OS !== 'web') {
            try {
              const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
              const { status } = await requestForegroundPermissionsAsync();
              if (status === 'granted') {
                const location = await getCurrentPositionAsync({ accuracy: 6 });
                currentLocation = {
                  address: '',
                  city: 'Current Location',
                  state: '',
                  zipCode: '',
                  lat: location.coords.latitude,
                  lng: location.coords.longitude,
                };
                console.log('[DriverNavigation] Using real location for route calculation');
              } else {
                throw new Error('Location permission denied');
              }
            } catch (locationError) {
              console.warn('[DriverNavigation] Failed to get real location, using fallback:', locationError);
              currentLocation = {
                address: '',
                city: 'Current Location (Mock)',
                state: '',
                zipCode: '',
                lat: 40.7128,
                lng: -74.0060,
              };
            }
          } else {
            // Web fallback
            currentLocation = {
              address: '',
              city: 'Current Location (Web)',
              state: '',
              zipCode: '',
              lat: 40.7128,
              lng: -74.0060,
            };
          }
          
          const route = await getRoute(currentLocation, currentDestination);
          if (route) {
            const phaseText = currentPhase === 'to-pickup' ? 'pickup' : 'delivery';
            const eta = route.durationSec ? `${Math.round(route.durationSec / 60)} min` : 'no ETA';
            const provider = route.provider === 'fallback' ? 'basic navigation' : route.provider.toUpperCase();
            console.log(`[DriverNavigation] ${phaseText} route loaded - ${eta} via ${provider}`);
          }
        } catch (error) {
          console.warn('[DriverNavigation] Route loading failed:', error);
        }
      }
    };
    
    loadRoute();
  }, [currentPhase, getRoute, getCurrentDestination]);

  const openInAppMap = useCallback(async (destination: Location) => {
    if (!destination?.city?.trim()) {
      console.warn('[DriverNavigation] Invalid destination provided');
      return;
    }
    
    const phaseText = currentPhase === 'to-pickup' ? 'pickup' : 'delivery';
    console.log(`[DriverNavigation] Starting navigation to ${phaseText}:`, destination.city);
    setIsNavigating(true);
    
    try {
      // Enhanced navigation with real location
      if (navState.currentRoute) {
        const route = navState.currentRoute;
        const duration = route.durationSec ? Math.round(route.durationSec / 60) : null;
        const distance = route.distanceMeters ? (route.distanceMeters / 1000).toFixed(1) : null;
        const provider = route.provider === 'fallback' ? 'basic navigation' : route.provider.toUpperCase();
        
        console.log(`[DriverNavigation] ${phaseText} navigation ready - ${duration ? `${duration} min` : 'calculating ETA'}, ${distance ? `${distance} km` : 'calculating distance'} via ${provider}`);
        
        if (navState.voiceEnabled && route.provider !== 'fallback') {
          console.log('[DriverNavigation] Voice guidance enabled for turn-by-turn directions');
        }
      } else {
        console.log(`[DriverNavigation] ${phaseText} navigation - using external maps app`);
      }
    } catch (error) {
      console.warn(`[DriverNavigation] ${phaseText} navigation setup failed:`, error);
    }
    
    // Always provide external navigation as backup
    const address = formatLocation(destination);
    const encodedAddress = encodeURIComponent(address);
    
    if (Platform.OS === 'ios') {
      const url = `maps://app?daddr=${encodedAddress}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://maps.google.com/maps?daddr=${encodedAddress}`);
        }
      });
    } else {
      const googleMapsUrl = `google.navigation:q=${encodedAddress}`;
      Linking.canOpenURL(googleMapsUrl).then(supported => {
        if (supported) {
          Linking.openURL(googleMapsUrl);
        } else {
          Linking.openURL(`https://maps.google.com/maps?daddr=${encodedAddress}`);
        }
      });
    }
  }, [formatLocation, getRoute, navState.voiceEnabled]);

  const handleNavigateToDestination = useCallback(() => {
    const destination = getCurrentDestination();
    console.log('[DriverNavigation] Navigating to destination:', destination.city);
    openInAppMap(destination);
  }, [getCurrentDestination, openInAppMap]);

  const handlePickupConfirmed = useCallback(() => {
    console.log('[DriverNavigation] Pickup confirmed - showing fuel selector');
    setShowFuelSelector(true);
  }, []);

  const handleFuelConfirmed = useCallback((fuelLevel: number) => {
    console.log('[DriverNavigation] Fuel level confirmed:', fuelLevel + '% - switching to delivery route');
    setCurrentPhase('to-delivery');
    setIsNavigating(false);
    clearRoute(); // Clear previous route
    onPickupConfirmed();
    
    // Auto-navigate to delivery after pickup confirmation
    setTimeout(() => {
      openInAppMap(load.destination);
    }, 1000);
  }, [onPickupConfirmed, openInAppMap, load.destination, clearRoute]);

  const handleDeliveryConfirmed = useCallback(() => {
    console.log('[DriverNavigation] Delivery confirmed - navigation complete');
    setCurrentPhase('completed');
    setIsNavigating(false);
    clearRoute(); // Clear route data
    onDeliveryConfirmed();
  }, [onDeliveryConfirmed, clearRoute]);

  const currentDestination = getCurrentDestination();
  const isPickupPhase = currentPhase === 'to-pickup';

  const isCompleted = currentPhase === 'completed';

  if (isCompleted) {
    return (
      <View style={styles.container}>
        <View style={styles.completedCard}>
          <CheckCircle size={24} color={theme.colors.success} />
          <Text style={styles.completedTitle}>Load Completed!</Text>
          <Text style={styles.completedSubtitle}>Great job on this delivery</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fuel Alert - shows when fuel is low */}
      <FuelAlert />
      
      <View style={styles.navigationCard}>
        <View style={styles.phaseHeader}>
          <View style={[styles.phaseIndicator, { backgroundColor: isPickupPhase ? theme.colors.warning : theme.colors.success }]}>
            <MapPin size={16} color={theme.colors.white} />
          </View>
          <Text style={styles.phaseTitle}>
            {isPickupPhase ? 'Navigate to Pickup' : 'Navigate to Delivery'}
          </Text>
        </View>

        <View style={styles.destinationInfo}>
          <Text style={styles.destinationLabel}>
            {isPickupPhase ? 'Pickup Location:' : 'Delivery Location:'}
          </Text>
          <Text style={styles.destinationAddress}>
            {formatLocation(currentDestination)}
          </Text>
        </View>

        {/* Route Information */}
        {navState.currentRoute && (
          <View style={styles.routeInfo}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeTitle}>Route Information</Text>
              <View style={styles.routeStatus}>
                {navState.isOffline ? (
                  <WifiOff size={16} color={theme.colors.warning} />
                ) : (
                  <Wifi size={16} color={theme.colors.success} />
                )}
                <Text style={[styles.routeStatusText, { color: navState.isOffline ? theme.colors.warning : theme.colors.success }]}>
                  {navState.isOffline ? 'Offline' : 'Online'}
                </Text>
              </View>
            </View>
            
            {navState.currentRoute.durationSec && (
              <Text style={styles.routeDetail}>
                ETA: {Math.round(navState.currentRoute.durationSec / 60)} minutes
              </Text>
            )}
            
            {navState.currentRoute.distanceMeters && (
              <Text style={styles.routeDetail}>
                Distance: {(navState.currentRoute.distanceMeters / 1000).toFixed(1)} km
              </Text>
            )}
            
            <Text style={styles.routeProvider}>
              Provider: {navState.currentRoute.provider === 'fallback' ? 'Basic Navigation' : navState.currentRoute.provider.toUpperCase()}
            </Text>
            
            {navState.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.routeError}>{navState.error}</Text>
                {navState.error.includes('retry') && navState.retryCount < 3 && (
                  <TouchableOpacity 
                    style={styles.retryButton} 
                    onPress={() => {
                      const currentDestination = getCurrentDestination();
                      const mockLocation: Location = {
                        address: '',
                        city: 'Current Location',
                        state: '',
                        zipCode: '',
                        lat: 40.7128,
                        lng: -74.0060,
                      };
                      retryRoute(mockLocation, currentDestination);
                    }}
                  >
                    <Text style={styles.retryButtonText}>Retry ({navState.retryCount}/3)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.navigateButton, navState.isLoading && styles.buttonDisabled]}
            onPress={handleNavigateToDestination}
            disabled={navState.isLoading}
            testID={`navigate-to-${isPickupPhase ? 'pickup' : 'delivery'}`}
          >
            <Navigation size={20} color={theme.colors.white} />
            <Text style={styles.navigateButtonText}>
              {navState.isLoading ? 'Loading Route...' : isNavigating ? 'Navigating...' : `Navigate to ${isPickupPhase ? 'Pickup' : 'Delivery'}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={isPickupPhase ? handlePickupConfirmed : handleDeliveryConfirmed}
            testID={`confirm-${isPickupPhase ? 'pickup' : 'delivery'}`}
          >
            <CheckCircle size={20} color={theme.colors.white} />
            <Text style={styles.confirmButtonText}>
              Confirm {isPickupPhase ? 'Pickup' : 'Delivery'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Voice Control */}
        <TouchableOpacity style={styles.voiceToggle} onPress={toggleVoice}>
          {navState.voiceEnabled ? (
            <Volume2 size={20} color={theme.colors.primary} />
          ) : (
            <VolumeX size={20} color={theme.colors.gray} />
          )}
          <Text style={[styles.voiceToggleText, { color: navState.voiceEnabled ? theme.colors.primary : theme.colors.gray }]}>
            Voice Guidance {navState.voiceEnabled ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusMessage}>
          <AlertCircle size={16} color={theme.colors.gray} />
          <Text style={styles.statusText}>
            {navState.isOffline 
              ? 'Offline mode - using cached routes when available'
              : navState.currentRoute?.provider === 'fallback'
                ? 'Basic navigation mode - external maps will provide directions'
                : isPickupPhase 
                  ? 'Enhanced navigation ready - tap to start pickup route'
                  : 'Enhanced navigation ready - tap to start delivery route'
            }
          </Text>
        </View>
        
        {/* Fuel Level Display - show during delivery phase */}
        {!isPickupPhase && (
          <View style={styles.fuelDisplay}>
            <View style={styles.fuelHeader}>
              <Fuel size={16} color={fuelColor} />
              <Text style={styles.fuelTitle}>Fuel Level</Text>
            </View>
            <View style={styles.fuelIndicator}>
              <View style={styles.fuelTrack}>
                <View
                  style={[
                    styles.fuelBar,
                    {
                      width: `${fuelLevel}%`,
                      backgroundColor: fuelColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.fuelText, { color: fuelColor }]}>{fuelLevel}%</Text>
            </View>
            {isLowFuel && (
              <Text style={styles.fuelWarning}>Low fuel - Consider refueling</Text>
            )}
          </View>
        )}
      </View>
      
      {/* Fuel Selector Modal */}
      <FuelSelector
        visible={showFuelSelector}
        onClose={() => setShowFuelSelector(false)}
        onConfirm={handleFuelConfirmed}
        loadId={load.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  navigationCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  phaseIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  phaseTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  destinationInfo: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  destinationLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  destinationAddress: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  actionButtons: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  navigateButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  completedCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  completedSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  routeInfo: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  routeTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  routeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  routeStatusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  routeDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  routeProvider: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  routeError: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  errorContainer: {
    marginTop: theme.spacing.xs,
  },
  retryButton: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  voiceToggleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  fuelDisplay: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  fuelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  fuelTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  fuelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  fuelTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fuelBar: {
    height: '100%',
    borderRadius: 3,
  },
  fuelText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  fuelWarning: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});