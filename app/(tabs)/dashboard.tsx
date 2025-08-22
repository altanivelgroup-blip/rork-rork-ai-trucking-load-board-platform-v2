import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';

import { View, Text, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';
import { useRouter } from 'expo-router';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';
import { Truck, Star, Package, ArrowRight, MapPin } from 'lucide-react-native';

interface RecentLoadProps {
  id: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  pickupDate: string | number | Date;
  weight: number;
  rate: number;
  onPress: (id: string) => void;
}

const RecentLoadRow = memo<RecentLoadProps>(({
  id,
  originCity,
  originState,
  destinationCity,
  destinationState,
  pickupDate,
  weight,
  rate,
  onPress,
}) => {
  return (
    <TouchableOpacity key={id} onPress={() => onPress(id)} style={styles.loadRow} testID={`recent-load-${id}`}>
      <View style={styles.loadLeft}>
        <Text style={styles.loadTitle}>{originCity}, {originState}</Text>
        <Text style={styles.loadSub}>{destinationCity}, {destinationState}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Pickup: {new Date(pickupDate as any).toLocaleDateString?.() ?? String(pickupDate)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{weight} lbs</Text>
        </View>
      </View>
      <View style={styles.loadRight}>
        <Text style={styles.price}>${rate}</Text>
        <Text style={styles.favorite}>Favorite</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  const { user } = useAuth();
  const { filteredLoads, setFilters, currentLoad } = useLoads();
  const router = useRouter();
  const [backhaulOn, setBackhaulOn] = useState<boolean>(false);
  const { startWatching, stopWatching, requestPermissionAsync } = useLiveLocation();

  const recentLoads = useMemo(() => filteredLoads.slice(0, 3), [filteredLoads]);
  const heroUrl = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/2cwo4h1uv8vh32px1blj8';
  const heroSource = useMemo(() => ({ uri: heroUrl }), [heroUrl]);
  const lastDelivery = useMemo(() => currentLoad?.destination ?? recentLoads[0]?.destination, [currentLoad, recentLoads]);

  const haversineMiles = useCallback((a: GeoCoords, b: GeoCoords): number => {
    const R = 3958.8;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }, []);

  const handleViewAll = useCallback(() => {
    router.push('/(tabs)/(loads)');
  }, [router]);

  const handleOpenLoad = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);

  const toggleBackhaul = useCallback((value: boolean) => {
    setBackhaulOn(value);
    if (value && lastDelivery) {
      setFilters({ showBackhaul: true, backhaulCenter: { lat: lastDelivery.lat, lng: lastDelivery.lng }, backhaulRadiusMiles: 50 });
      router.push('/(tabs)/(loads)');
    } else {
      setFilters({ showBackhaul: undefined, backhaulCenter: undefined, backhaulRadiusMiles: undefined });
    }
  }, [lastDelivery, router, setFilters]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    
    const init = async () => {
      try {
        if (!currentLoad || !currentLoad.destination) return;
        if (currentLoad.status !== 'in-transit') return;
        
        const ok = await requestPermissionAsync();
        if (!ok || !mounted) return;
        
        const dest = currentLoad.destination;
        const destPoint: GeoCoords = { latitude: dest.lat, longitude: dest.lng };
        
        unsubscribe = await startWatching((coords) => {
          if (!mounted) return;
          
          try {
            const miles = haversineMiles(coords, destPoint);
            console.log('[Backhaul] distance to delivery', miles);
            const arriveRadiusMiles = 2;
            if (miles <= arriveRadiusMiles && !backhaulOn && mounted) {
              setBackhaulOn(true);
              setFilters({ showBackhaul: true, backhaulCenter: { lat: dest.lat, lng: dest.lng }, backhaulRadiusMiles: 50 });
              router.push('/(tabs)/(loads)');
            }
          } catch (e) {
            console.error('Error computing backhaul distance', e);
          }
        }, { distanceIntervalMeters: 100 });
      } catch (e) {
        console.error('[Dashboard] location init error', e);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      try {
        if (unsubscribe) unsubscribe();
      } catch (e) {
        console.warn('[Dashboard] location cleanup failed', e);
      }
      try {
        stopWatching();
      } catch (e) {
        console.warn('[Dashboard] stop watching failed', e);
      }
    };
  }, [currentLoad, requestPermissionAsync, startWatching, stopWatching, haversineMiles, backhaulOn, router, setFilters]);

  useEffect(() => {
    let mounted = true;
    
    const prefetchImage = async () => {
      try {
        if (mounted) {
          await Image.prefetch(heroUrl);
        }
      } catch (e) {
        console.log('[Dashboard] hero prefetch error', e);
      }
    };
    
    prefetchImage();
    
    return () => {
      mounted = false;
    };
  }, [heroUrl]);

  return (
    <>

      <SafeAreaView style={styles.container} edges={['top']}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={heroSource}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle}>LoadRun</Text>
          <Text style={styles.heroSubtitle}>AI Load Board for Car Haulers</Text>
        </ImageBackground>

        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user?.name?.split(' ')[0] ?? 'Driver'}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard} testID="stat-available-loads">
            <Truck size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{filteredLoads.length}</Text>
            <Text style={styles.statLabel}>Available Loads</Text>
          </View>
          <View style={styles.statCard} testID="stat-rating">
            <Star size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{(user?.rating ?? 4.8).toString()}</Text>
            <Text style={styles.statLabel}>Your Rating</Text>
          </View>
          <View style={styles.statCard} testID="stat-completed">
            <Package size={20} color={theme.colors.gray} />
            <Text style={styles.statValue}>{user?.completedLoads ?? 24}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Loads</Text>
          <TouchableOpacity onPress={handleViewAll} accessibilityRole="button">
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View All</Text>
              <ArrowRight size={16} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View>
          {recentLoads.map((l) => (
            <RecentLoadRow
              key={l.id}
              id={l.id}
              originCity={l.origin.city}
              originState={l.origin.state}
              destinationCity={l.destination.city}
              destinationState={l.destination.state}
              pickupDate={l.pickupDate as any}
              weight={l.weight}
              rate={l.rate}
              onPress={handleOpenLoad}
            />
          ))}
        </View>

        <View style={styles.backhaulCard} testID="backhaul-toggle-card">
          <View style={styles.backhaulRow}>
            <MapPin size={22} color="#1D4ED8" />
            <Text style={styles.backhaulTitle}>Backhaul near delivery (50mi)</Text>
          </View>
          <Text style={styles.backhaulSub} numberOfLines={2}>
            {lastDelivery ? `${lastDelivery.city}, ${lastDelivery.state}` : 'No recent delivery found'}
          </Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show backhaul loads</Text>
            <Switch
              value={backhaulOn}
              onValueChange={(val) => {
                if (val && !lastDelivery) {
                  console.log('Backhaul: cannot enable without a recent delivery');
                  return;
                }
                toggleBackhaul(val);
              }}
              trackColor={{ false: theme.colors.gray, true: '#EA580C' }}
              thumbColor={theme.colors.white}
              disabled={false}
              testID="backhaul-switch"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    height: 160,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  heroImage: {
    borderRadius: theme.borderRadius.lg,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: theme.borderRadius.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.white,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.9,
    marginTop: 2,
    marginBottom: 2,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  welcomeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  welcomeName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  sectionHeader: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginRight: 6,
  },
  loadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  loadLeft: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  loadRight: {
    alignItems: 'flex-end',
  },
  loadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  metaDot: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  price: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  favorite: {
    marginTop: 6,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  backhaulCard: {
    backgroundColor: '#EA580C',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#C2410C',
    shadowColor: '#9A3412',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  backhaulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backhaulTitle: {
    marginLeft: 6,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.white,
  },
  backhaulSub: {
    marginTop: 4,
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.9,
  },
  toggleRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
  },
});
