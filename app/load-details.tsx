import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Calendar, Package, DollarSign, Truck, AlertCircle, X, Fuel } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useLoads } from '@/hooks/useLoads';
//
import { useAuth } from '@/hooks/useAuth';
import { estimateFuelForLoad, formatCurrency } from '@/utils/fuel';

import { db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoadDetailsScreen() {
  const params = useLocalSearchParams();
const loadId = typeof params.loadId === 'string' ? params.loadId : Array.isArray(params.loadId) ? params.loadId[0] : undefined;
  const router = useRouter();
  const { acceptLoad, setFilters } = useLoads();
  const { user } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
const [load, setLoad] = useState<any | null>(null);
const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
  let cancelled = false;
  async function fetchLoad() {
    try {
      console.log('[LoadDetails] fetching load', loadId);
      if (!loadId) {
        setLoading(false);
        setLoad(null);
        return;
      }
      const ref = doc(db, 'loads', loadId);
      const snap = await getDoc(ref);
      if (!cancelled) {
        if (snap.exists()) {
          const raw = snap.data() as any;
          const toMillis = (v: any): number | undefined => {
            try {
              if (!v) return undefined;
              if (typeof v === 'number') return v;
              if (typeof v === 'string') return new Date(v).getTime();
              if (typeof v?.toDate === 'function') return v.toDate().getTime();
              return undefined;
            } catch {
              return undefined;
            }
          };
          const normalized = {
            id: snap.id,
            ...raw,
            pickupDate: toMillis(raw.pickupDate) ?? Date.now(),
            deliveryDate: toMillis(raw.deliveryDate) ?? Date.now(),
          };
          setLoad(normalized);
        } else {
          setLoad(null);
        }
        setLoading(false);
      }
    } catch (e) {
      console.error('[LoadDetails] fetch error', e);
      if (!cancelled) {
        setLoad(null);
        setLoading(false);
      }
    }
  }
  fetchLoad();
  return () => {
    cancelled = true;
  };
}, [loadId]);

  if (loading) {
    return (
      <Modal animationType="slide" transparent={false} visible={true} onRequestClose={() => router.back()}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <X size={24} color={theme.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Load Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      </Modal>
    );
  }

  if (!load) {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={true}
        onRequestClose={() => router.back()}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <X size={24} color={theme.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Load Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centered}>
            <Text>Load not found</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptLoad(load.id);
      setFilters({
        showBackhaul: true,
        backhaulCenter: { lat: load.destination.lat, lng: load.destination.lng },
        backhaulRadiusMiles: 50,
      });
      router.push('/(tabs)/loads');
    } catch (error) {
      console.error('Failed to accept load:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const vehicleColor = theme.colors[(load?.vehicleType as keyof typeof theme.colors) ?? 'primary'] ?? theme.colors.primary;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Load Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.mainInfo}>
            <View style={styles.tags}>
              <View style={[styles.vehicleTag, { backgroundColor: vehicleColor }]}>
                <Truck size={16} color={theme.colors.white} />
                <Text style={styles.vehicleText}>
                  {String(load.vehicleType ?? '').replace('-', ' ').toUpperCase()}
                </Text>
              </View>
              {load.isBackhaul && (
                <View style={styles.backhaulTag}>
                  <Text style={styles.backhaulText}>BACKHAUL</Text>
                </View>
              )}
            </View>

            <Text style={styles.shipperName}>{load.shipperName}</Text>
            {load.description ? <Text style={styles.description}>{load.description}</Text> : null}

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Total Rate</Text>
              <Text style={styles.rateAmount}>${Number(load.rate ?? 0).toLocaleString()}</Text>
              {typeof load.ratePerMile === 'number' ? (
                <Text style={styles.ratePerMile}>${load.ratePerMile.toFixed(2)} per mile</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.routeSection}>
            <Text style={styles.sectionTitle}>Route Details</Text>
            
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <MapPin size={20} color={theme.colors.success} />
                <Text style={styles.locationLabel}>Pickup Location</Text>
              </View>
              {load.origin?.address ? (
                <Text style={styles.locationAddress}>{load.origin.address}</Text>
              ) : null}
              <Text style={styles.locationCity}>
                {load.origin?.city}, {load.origin?.state} {load.origin?.zipCode}
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={16} color={theme.colors.gray} />
                <Text style={styles.dateText}>
                  {new Date(load.pickupDate ?? Date.now()).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.distanceIndicator}>
              <View style={styles.distanceLine} />
              <Text style={styles.distanceText}>{load.distance} miles</Text>
              <View style={styles.distanceLine} />
            </View>

            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <MapPin size={20} color={theme.colors.danger} />
                <Text style={styles.locationLabel}>Delivery Location</Text>
              </View>
              {load.destination?.address ? (
                <Text style={styles.locationAddress}>{load.destination.address}</Text>
              ) : null}
              <Text style={styles.locationCity}>
                {load.destination?.city}, {load.destination?.state} {load.destination?.zipCode}
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={16} color={theme.colors.gray} />
                <Text style={styles.dateText}>
                  {new Date(load.deliveryDate ?? Date.now()).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Load Information</Text>
            
            <View style={styles.detailRow}>
              <Package size={20} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{(Number(load.weight ?? 0) / 1000).toFixed(1)}k lbs</Text>
            </View>

            <View style={styles.detailRow}>
              <Fuel size={20} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Estimated Fuel</Text>
              {(() => {
                try {
                  const f = estimateFuelForLoad(load, user);
                  return <Text style={styles.detailValue}>{f.gallons.toFixed(1)} gal • {formatCurrency(f.cost)} (@ {f.mpg.toFixed(1)} mpg)</Text>;
                } catch (e) {
                  return <Text style={styles.detailValue}>N/A</Text>;
                }
              })()}
            </View>

            {Array.isArray(load.special_requirements) && load.special_requirements.length > 0 && (
              <View style={styles.requirementsContainer}>
                <View style={styles.requirementsHeader}>
                  <AlertCircle size={20} color={theme.colors.warning} />
                  <Text style={styles.requirementsTitle}>Special Requirements</Text>
                </View>
                {load.special_requirements.map((req: string, index: number): React.ReactElement => (
                  <Text key={`req-${index}`} style={styles.requirementItem} testID={`requirement-${index}`}>• {req}</Text>
                ))}
              </View>
            )}
          </View>

          {typeof load.aiScore === 'number' && (
            <View style={styles.aiScoreCard}>
              <Text style={styles.aiScoreLabel}>AI Match Score</Text>
              <View style={styles.aiScoreBar}>
                <View 
                  style={[styles.aiScoreFill, { width: `${load.aiScore}%` }]} 
                />
              </View>
              <Text style={styles.aiScoreValue}>{load.aiScore}%</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push({ pathname: '/damage-protection', params: { loadId: load.id } })}
            testID="btn-damage-photos"
          >
            <Text style={styles.secondaryButtonText}>Pickup/Delivery Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={isAccepting}
            testID="btn-accept-load"
          >
            {isAccepting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.acceptButtonText}>Accept Load</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
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
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  mainInfo: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  vehicleText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  backhaulTag: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  backhaulText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  shipperName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
  },
  rateContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  rateLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  rateAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 4,
  },
  ratePerMile: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  routeSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  locationCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  locationLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  locationAddress: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  locationCity: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  distanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  distanceLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray,
    opacity: 0.3,
  },
  distanceText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  detailsSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  requirementsContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#fff9e6',
    borderRadius: theme.borderRadius.md,
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  requirementsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  requirementItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginLeft: theme.spacing.lg,
    marginTop: 4,
  },
  aiScoreCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  aiScoreLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  aiScoreBar: {
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  aiScoreFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
  },
  aiScoreValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.success,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    gap: theme.spacing.sm,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5FF',
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});