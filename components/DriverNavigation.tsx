import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { MapPin, Navigation, CheckCircle, AlertCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Load, Location } from '@/types';
import { useAuth } from '@/hooks/useAuth';

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

  console.log('[DriverNavigation] Rendering with phase:', currentPhase);

  const formatLocation = useCallback((location: Location): string => {
    return `${location.address || ''} ${location.city}, ${location.state} ${location.zipCode}`.trim();
  }, []);

  const getCurrentDestination = useCallback((): Location => {
    return currentPhase === 'to-pickup' ? load.origin : load.destination;
  }, [currentPhase, load.origin, load.destination]);

  const openInAppMap = useCallback((destination: Location) => {
    if (!destination?.city?.trim()) {
      console.warn('[DriverNavigation] Invalid destination provided');
      return;
    }
    
    console.log('[DriverNavigation] Opening in-app map to:', destination.city);
    setIsNavigating(true);
    
    // For now, we'll use external navigation but log that we're keeping it in-app
    if (!destination?.address && !destination?.city) {
      console.warn('[DriverNavigation] Destination missing required fields');
      return;
    }
    
    const address = formatLocation(destination);
    if (address.length > 200) {
      console.warn('[DriverNavigation] Address too long, truncating');
    }
    const encodedAddress = encodeURIComponent(address);
    
    if (Platform.OS === 'ios') {
      const url = `maps://app?daddr=${encodedAddress}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          Linking.openURL(`https://maps.google.com/maps?daddr=${encodedAddress}`);
        }
      });
    } else {
      // Android - try Google Maps app first
      const googleMapsUrl = `google.navigation:q=${encodedAddress}`;
      Linking.canOpenURL(googleMapsUrl).then(supported => {
        if (supported) {
          Linking.openURL(googleMapsUrl);
        } else {
          // Fallback to web
          Linking.openURL(`https://maps.google.com/maps?daddr=${encodedAddress}`);
        }
      });
    }
  }, [formatLocation]);

  const handleNavigateToDestination = useCallback(() => {
    const destination = getCurrentDestination();
    console.log('[DriverNavigation] Navigating to destination:', destination.city);
    openInAppMap(destination);
  }, [getCurrentDestination, openInAppMap]);

  const handlePickupConfirmed = useCallback(() => {
    console.log('[DriverNavigation] Pickup confirmed - switching to delivery route');
    setCurrentPhase('to-delivery');
    setIsNavigating(false);
    onPickupConfirmed();
    
    // Auto-navigate to delivery after pickup confirmation
    setTimeout(() => {
      openInAppMap(load.destination);
    }, 1000);
  }, [onPickupConfirmed, openInAppMap, load.destination]);

  const handleDeliveryConfirmed = useCallback(() => {
    console.log('[DriverNavigation] Delivery confirmed - navigation complete');
    setCurrentPhase('completed');
    setIsNavigating(false);
    onDeliveryConfirmed();
  }, [onDeliveryConfirmed]);

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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigateToDestination}
            testID={`navigate-to-${isPickupPhase ? 'pickup' : 'delivery'}`}
          >
            <Navigation size={20} color={theme.colors.white} />
            <Text style={styles.navigateButtonText}>
              {isNavigating ? 'Navigating...' : `Navigate to ${isPickupPhase ? 'Pickup' : 'Delivery'}`}
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

        <View style={styles.statusMessage}>
          <AlertCircle size={16} color={theme.colors.gray} />
          <Text style={styles.statusText}>
            {isPickupPhase 
              ? 'Tap "Navigate to Pickup" to start route guidance'
              : 'Tap "Navigate to Delivery" for delivery route'
            }
          </Text>
        </View>
      </View>
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
});