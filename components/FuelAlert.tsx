import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { AlertTriangle, Fuel, X, MapPin, Navigation, Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useFuelMonitor, useFuelDisplay } from '@/hooks/useFuelMonitor';

interface FuelAlertProps {
  onDismiss?: () => void;
  onFindFuelStops?: () => void;
  onNavigateToStop?: (stopId: string) => void;
}

export const FuelAlert: React.FC<FuelAlertProps> = ({
  onDismiss,
  onFindFuelStops,
  onNavigateToStop,
}) => {
  const { isLowFuel, currentLoad, nearbyFuelStops, isLoadingFuelStops, findNearbyFuelStops, currentLocation } = useFuelMonitor();
  const { fuelLevel, fuelColor } = useFuelDisplay();
  const [showFuelStops, setShowFuelStops] = useState<boolean>(false);

  const handleDismiss = useCallback(() => {
    console.log('[FuelAlert] Alert dismissed');
    onDismiss?.();
  }, [onDismiss]);

  const handleFindFuelStops = useCallback(async () => {
    console.log('[FuelAlert] Finding fuel stops');
    
    if (nearbyFuelStops.length === 0) {
      await findNearbyFuelStops(currentLocation || undefined);
    }
    
    setShowFuelStops(true);
    onFindFuelStops?.();
  }, [onFindFuelStops, findNearbyFuelStops, nearbyFuelStops.length, currentLocation]);

  const handleNavigateToStop = useCallback((stopId: string) => {
    console.log('[FuelAlert] Navigating to fuel stop:', stopId);
    setShowFuelStops(false);
    onNavigateToStop?.(stopId);
  }, [onNavigateToStop]);

  const handleCloseFuelStops = useCallback(() => {
    setShowFuelStops(false);
  }, []);

  if (!isLowFuel || !currentLoad) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.alertCard}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={20} color={theme.colors.white} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Low Fuel Alert</Text>
            <Text style={styles.subtitle}>Fuel level at {fuelLevel}%</Text>
          </View>
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
              <X size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          )}
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
          <Text style={styles.fuelText}>{fuelLevel}%</Text>
        </View>

        <Text style={styles.message}>
          Low fuel - Suggest refuel
        </Text>

        {onFindFuelStops && (
          <TouchableOpacity style={styles.actionButton} onPress={handleFindFuelStops}>
            <Fuel size={16} color={theme.colors.white} />
            <Text style={styles.actionButtonText}>Find Fuel Stops</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Fuel Stops Modal */}
      <Modal
        visible={showFuelStops}
        transparent
        animationType="slide"
        onRequestClose={handleCloseFuelStops}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Fuel size={20} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>Nearby Fuel Stops</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseFuelStops}>
                <X size={20} color={theme.colors.gray} />
              </TouchableOpacity>
            </View>
            
            {isLoadingFuelStops ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Finding fuel stops...</Text>
              </View>
            ) : (
              <ScrollView style={styles.stopsContainer}>
                {nearbyFuelStops.map((stop) => (
                  <TouchableOpacity
                    key={stop.id}
                    style={[
                      styles.stopCard,
                      stop.isSponsored && styles.sponsoredStop,
                    ]}
                    onPress={() => handleNavigateToStop(stop.id)}
                  >
                    {stop.isSponsored && (
                      <View style={styles.sponsoredBadge}>
                        <Star size={12} color={theme.colors.white} />
                        <Text style={styles.sponsoredText}>Sponsored</Text>
                      </View>
                    )}
                    
                    <View style={styles.stopHeader}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      <Text style={styles.stopDistance}>{stop.distance.toFixed(1)} mi</Text>
                    </View>
                    
                    <View style={styles.stopDetails}>
                      <MapPin size={14} color={theme.colors.gray} />
                      <Text style={styles.stopAddress}>
                        {stop.location.address}, {stop.location.city}
                      </Text>
                    </View>
                    
                    {stop.pricePerGallon && (
                      <Text style={styles.fuelPrice}>
                        ${stop.pricePerGallon.toFixed(2)}/gal
                      </Text>
                    )}
                    
                    <View style={styles.amenitiesContainer}>
                      {stop.amenities.slice(0, 3).map((amenity) => (
                        <View key={`${stop.id}-${amenity}`} style={styles.amenityTag}>
                          <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                      ))}
                      {stop.amenities.length > 3 && (
                        <Text style={styles.moreAmenities}>
                          +{stop.amenities.length - 3} more
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.navigateButton}>
                      <Navigation size={14} color={theme.colors.primary} />
                      <Text style={styles.navigateText}>Navigate</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {nearbyFuelStops.length === 0 && (
                  <View style={styles.noStopsContainer}>
                    <Fuel size={32} color={theme.colors.gray} />
                    <Text style={styles.noStopsText}>No fuel stops found nearby</Text>
                    <Text style={styles.noStopsSubtext}>Try searching in a different area</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: theme.spacing.md,
  },
  alertCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  dismissButton: {
    padding: theme.spacing.xs,
  },
  fuelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  fuelTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fuelBar: {
    height: '100%',
    borderRadius: 4,
  },
  fuelText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    minWidth: 40,
    textAlign: 'right',
  },
  message: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  stopsContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  stopCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sponsoredStop: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 2,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stopName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
  },
  stopDistance: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  stopDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  stopAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    flex: 1,
  },
  fuelPrice: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  amenityTag: {
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  amenityText: {
    fontSize: 10,
    color: theme.colors.gray,
  },
  moreAmenities: {
    fontSize: 10,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  navigateText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  noStopsContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  noStopsText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.gray,
    textAlign: 'center',
  },
  noStopsSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
});