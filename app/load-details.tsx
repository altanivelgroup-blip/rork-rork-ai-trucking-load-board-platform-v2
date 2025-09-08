import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Calendar, Package, DollarSign, Truck, AlertCircle, X, Fuel } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useLoads } from '@/hooks/useLoads';
//
import { useAuth } from '@/hooks/useAuth';
import { estimateFuelForLoad, formatCurrency } from '@/utils/fuel';
import { estimateMileageFromZips } from '@/utils/distance';

import { db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Image } from 'expo-image';

export default function LoadDetailsScreen() {
  const params = useLocalSearchParams();
const loadId = typeof params.loadId === 'string' ? params.loadId : Array.isArray(params.loadId) ? params.loadId[0] : undefined;
  const router = useRouter();
  const { acceptLoad, setFilters, loads } = useLoads();
  const { user, updateProfile } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
const [load, setLoad] = useState<any | null>(null);
const [loading, setLoading] = useState<boolean>(true);
  const photos: string[] = useMemo(() => {
    try {
      const p = (load as any)?.photos;
      if (Array.isArray(p)) return p.filter((u) => typeof u === 'string' && u.length > 0);
      return [];
    } catch {
      return [];
    }
  }, [load]);
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);

  const selectableVehicles: Array<{ key: string; label: string }> = useMemo(() => ([
    { key: 'car-hauler', label: 'Car Hauler' },
    { key: 'flatbed', label: 'Flatbed' },
    { key: 'box-truck', label: 'Box Truck' },
    { key: 'cargo-van', label: 'Cargo Van' },
  ]), []);

  const selectedVehicleType = useMemo(() => {
    const fromUser = (user?.fuelProfile?.vehicleType ?? '') as string;
    const fromLoad = (load?.vehicleType ?? '') as string;
    return (fromUser || fromLoad) as any;
  }, [user?.fuelProfile?.vehicleType, load?.vehicleType]);

  const [mpgInput, setMpgInput] = useState<string>(() => {
    const val = user?.fuelProfile?.averageMpg ?? undefined;
    return typeof val === 'number' && Number.isFinite(val) ? String(val) : '';
  });

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

      const localMatch = Array.isArray(loads) ? loads.find(l => String(l.id) === String(loadId)) : undefined;
      if (localMatch) {
        const toMillisLocal = (v: any): number => {
          try {
            if (typeof v === 'number') return v;
            if (v instanceof Date) return v.getTime();
            if (typeof v?.toDate === 'function') return v.toDate().getTime();
            if (typeof v === 'string') return new Date(v).getTime();
            return Date.now();
          } catch {
            return Date.now();
          }
        };
        const normalizedLocal = {
          ...localMatch,
          pickupDate: toMillisLocal((localMatch as any).pickupDate),
          deliveryDate: toMillisLocal((localMatch as any).deliveryDate),
        } as any;
        setLoad(normalizedLocal);
        setLoading(false);
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
              if (v instanceof Date) return v.getTime();
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

// Estimate mileage via ZIPs if distance is missing
useEffect(() => {
  let active = true;
  const run = async () => {
    try {
      const originZip = String(load?.origin?.zipCode ?? '').slice(0, 5);
      const destZip = String(load?.destination?.zipCode ?? '').slice(0, 5);
      const currentDistance = Number((load as any)?.distance ?? 0);
      if (!load || !originZip || !destZip) return;
      if (Number.isFinite(currentDistance) && currentDistance > 0) return;
      console.log('[LoadDetails] estimating mileage from zips', { originZip, destZip });
      const miles = await estimateMileageFromZips(originZip, destZip);
      if (!active) return;
      if (miles && miles > 0) {
        const rate = Number(load.rate ?? 0);
        const rpm = miles > 0 ? rate / miles : 0;
        setLoad((prev: any) => (prev ? { ...prev, distance: miles, ratePerMile: rpm } : prev));
      }
    } catch (e) {
      console.warn('[LoadDetails] mileage estimate failed', e);
    }
  };
  run();
  return () => {
    active = false;
  };
}, [load?.origin?.zipCode, load?.destination?.zipCode, load?.rate]);

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
          {photos.length > 0 && (
            <View style={styles.photoStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStripContent}>
                {photos.map((uri, idx) => (
                  <TouchableOpacity key={`${uri}-${idx}`} onPress={() => { setViewerIndex(idx); setViewerOpen(true); }} accessibilityRole="button" testID={`photoThumb-${idx}`}>
                    <Image
                      source={{ uri }}
                      style={styles.photoThumb}
                      contentFit="cover"
                      transition={100}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
              <Text style={styles.distanceText} testID="miles-display">{Number(load.distance) > 0 ? `${Math.round(Number(load.distance))} miles` : 'calculating…'}</Text>
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

            <View style={styles.vehicleProfileCard}>
              <Text style={styles.vehicleProfileTitle}>Vehicle Profile</Text>
              <View style={styles.vehicleChipsRow}>
                {selectableVehicles.map((v) => {
                  const isActive = String(selectedVehicleType) === v.key;
                  return (
                    <TouchableOpacity
                      key={v.key}
                      style={[styles.vehicleChip, isActive ? styles.vehicleChipActive : undefined]}
                      onPress={async () => {
                        try {
                          await updateProfile({
                            fuelProfile: {
                              vehicleType: v.key as any,
                              averageMpg: Number(mpgInput) || (undefined as unknown as number),
                              fuelPricePerGallon: user?.fuelProfile?.fuelPricePerGallon ?? undefined as unknown as number,
                              fuelType: (user?.fuelProfile?.fuelType ?? 'diesel') as any,
                            } as any,
                          });
                        } catch (e) {
                          console.log('[VehicleProfile] failed to update vehicle type', e);
                        }
                      }}
                      accessibilityRole="button"
                      testID={`chip-${v.key}`}
                    >
                      <Text style={[styles.vehicleChipText, isActive ? styles.vehicleChipTextActive : undefined]}>{v.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.mpgRow}>
                <Text style={styles.mpgLabel}>Custom MPG</Text>
                <TextInput
                  style={styles.mpgInput}
                  inputMode="decimal"
                  keyboardType="numeric"
                  placeholder="e.g. 8.5"
                  value={mpgInput}
                  onChangeText={setMpgInput}
                  onBlur={async () => {
                    try {
                      const val = parseFloat(mpgInput);
                      if (!Number.isFinite(val) || val <= 0) return;
                      await updateProfile({
                        fuelProfile: {
                          vehicleType: (selectedVehicleType as any) ?? (load?.vehicleType as any),
                          averageMpg: val,
                          fuelPricePerGallon: user?.fuelProfile?.fuelPricePerGallon ?? undefined as unknown as number,
                          fuelType: (user?.fuelProfile?.fuelType ?? 'diesel') as any,
                        } as any,
                      });
                    } catch (e) {
                      console.log('[VehicleProfile] failed to update mpg', e);
                    }
                  }}
                  testID="input-mpg"
                />
              </View>
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

        {/* Fullscreen viewer */}
        <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
          <View style={styles.viewerBackdrop}>
            <View style={styles.viewerHeader}>
              <TouchableOpacity onPress={() => setViewerOpen(false)} style={styles.viewerCloseBtn} testID="viewerClose">
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
              <Text style={styles.viewerIndex}>{photos.length ? `${viewerIndex + 1}/${photos.length}` : ''}</Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={styles.viewerBody}>
              {photos[viewerIndex] ? (
                <Image source={{ uri: photos[viewerIndex] }} style={styles.viewerImage} contentFit="contain" />
              ) : null}
            </View>
            <View style={styles.viewerFooter}>
              <TouchableOpacity disabled={viewerIndex <= 0} onPress={() => setViewerIndex((i) => Math.max(0, i - 1))} style={[styles.navBtn, viewerIndex <= 0 && styles.navBtnDisabled]} testID="viewerPrev">
                <Text style={styles.navBtnText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={viewerIndex >= photos.length - 1} onPress={() => setViewerIndex((i) => Math.min(photos.length - 1, i + 1))} style={[styles.navBtn, viewerIndex >= photos.length - 1 && styles.navBtnDisabled]} testID="viewerNext">
                <Text style={styles.navBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  photoStrip: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  photoStripContent: {
    gap: theme.spacing.sm,
  },
  photoThumb: {
    width: 110,
    height: 80,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
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
  vehicleProfileCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  vehicleProfileTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  vehicleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  vehicleChip: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
  },
  vehicleChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#CBD5FF',
  },
  vehicleChipText: {
    color: theme.colors.dark,
    fontWeight: '600',
  },
  vehicleChipTextActive: {
    color: theme.colors.primary,
  },
  mpgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  mpgLabel: {
    flex: 0,
    color: theme.colors.gray,
    fontSize: theme.fontSize.md,
  },
  mpgInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.md,
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
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 48,
  },
  viewerHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerCloseBtn: { padding: 6 },
  viewerIndex: { color: theme.colors.white, fontWeight: '600', fontSize: theme.fontSize.md },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: theme.spacing.lg, gap: theme.spacing.md },
  navBtn: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: theme.borderRadius.md },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: theme.colors.white, fontWeight: '700' },
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