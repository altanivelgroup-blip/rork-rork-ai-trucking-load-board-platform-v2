import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Truck, DollarSign, X, ArrowRight } from 'lucide-react-native';
import { theme } from '@/constants/theme';

import { useLoads } from '@/hooks/useLoads';
import { formatCurrency } from '@/utils/fuel';

interface BackhaulPillProps {
  deliveryLocation: {
    lat: number;
    lng: number;
    city: string;
    state: string;
  };
  onLoadSelect?: (loadId: string) => void;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export default function BackhaulPill({ deliveryLocation, onLoadSelect }: BackhaulPillProps) {
  const { loads } = useLoads();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const nearbyBackhauls = useMemo(() => {
    const radiusMiles = 50;
    return loads
      .filter(load => {
        if (load.status !== 'available') return false;
        
        // Calculate distance from delivery location to load's pickup location
        const distance = haversineMiles(
          { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
          { lat: load.origin.lat, lng: load.origin.lng }
        );
        
        return distance <= radiusMiles;
      })
      .map(load => ({
        ...load,
        distanceFromDelivery: haversineMiles(
          { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
          { lat: load.origin.lat, lng: load.origin.lng }
        )
      }))
      .sort((a, b) => a.distanceFromDelivery - b.distanceFromDelivery)
      .slice(0, 5); // Show top 5 closest backhauls
  }, [loads, deliveryLocation]);

  const handlePillPress = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to fetch real-time backhauls
      await new Promise<void>((resolve) => {
        if (typeof resolve === 'function') {
          setTimeout(resolve, 800);
        }
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to fetch backhauls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSelect = (loadId: string) => {
    setModalVisible(false);
    onLoadSelect?.(loadId);
  };

  // Don't show pill if no backhauls available
  if (nearbyBackhauls.length === 0) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={handlePillPress}
        disabled={isLoading}
        testID="backhaul-pill"
      >
        <View style={styles.pillContent}>
          <View style={styles.pillIcon}>
            <Truck size={16} color={theme.colors.white} />
          </View>
          <View style={styles.pillText}>
            <Text style={styles.pillTitle}>
              Backhaul near delivery ({Math.round(nearbyBackhauls[0]?.distanceFromDelivery || 0)}mi)
            </Text>
            <Text style={styles.pillSubtitle}>
              {nearbyBackhauls.length} option{nearbyBackhauls.length !== 1 ? 's' : ''} available
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <ArrowRight size={16} color={theme.colors.white} />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
              testID="close-backhaul-modal"
            >
              <X size={24} color={theme.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nearby Backhauls</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.locationInfo}>
              <MapPin size={20} color={theme.colors.primary} />
              <Text style={styles.locationText}>
                From your delivery in {deliveryLocation.city}, {deliveryLocation.state}
              </Text>
            </View>

            {nearbyBackhauls.map((load) => (
              <TouchableOpacity
                key={load.id}
                style={styles.loadCard}
                onPress={() => handleLoadSelect(load.id)}
                testID={`backhaul-load-${load.id}`}
              >
                <View style={styles.loadHeader}>
                  <View style={styles.loadRoute}>
                    <Text style={styles.loadOrigin}>{load.origin.city}, {load.origin.state}</Text>
                    <ArrowRight size={16} color={theme.colors.gray} />
                    <Text style={styles.loadDestination}>{load.destination.city}, {load.destination.state}</Text>
                  </View>
                  <Text style={styles.loadDistance}>{Math.round(load.distanceFromDelivery)}mi away</Text>
                </View>

                <View style={styles.loadDetails}>
                  <View style={styles.loadMeta}>
                    <View style={styles.vehicleTag}>
                      <Truck size={14} color={theme.colors.white} />
                      <Text style={styles.vehicleText}>
                        {load.vehicleType.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.loadWeight}>{(load.weight / 1000).toFixed(1)}k lbs</Text>
                  </View>

                  <View style={styles.loadFinancials}>
                    <View style={styles.rateInfo}>
                      <DollarSign size={16} color={theme.colors.success} />
                      <Text style={styles.rateAmount}>{formatCurrency(load.rate)}</Text>
                      <Text style={styles.ratePerMile}>${load.ratePerMile.toFixed(2)}/mi</Text>
                    </View>
                    <Text style={styles.loadMiles}>{load.distance} miles</Text>
                  </View>
                </View>

                {load.description && (
                  <Text style={styles.loadDescription} numberOfLines={2}>
                    {load.description}
                  </Text>
                )}

                <View style={styles.loadFooter}>
                  <Text style={styles.pickupDate}>
                    Pickup: {new Date(load.pickupDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {load.aiScore && (
                    <View style={styles.aiScore}>
                      <Text style={styles.aiScoreText}>{load.aiScore}% match</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {nearbyBackhauls.length === 0 && (
              <View style={styles.emptyState}>
                <Truck size={48} color={theme.colors.gray} />
                <Text style={styles.emptyTitle}>No backhauls found</Text>
                <Text style={styles.emptySubtitle}>
                  No available loads within 50 miles of your delivery location.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#FF8C00',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    flex: 1,
  },
  pillTitle: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  pillSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: theme.fontSize.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  locationText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '500',
  },
  loadCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  loadRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  loadOrigin: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadDestination: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadDistance: {
    fontSize: theme.fontSize.sm,
    color: '#FF8C00',
    fontWeight: '600',
  },
  loadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  loadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  vehicleText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  loadWeight: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadFinancials: {
    alignItems: 'flex-end',
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.success,
  },
  ratePerMile: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadMiles: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  loadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickupDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  aiScore: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  aiScoreText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  headerSpacer: {
    width: 24,
  },
});