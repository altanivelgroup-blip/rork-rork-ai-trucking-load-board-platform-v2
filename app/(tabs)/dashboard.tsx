import React, { useMemo, useCallback, useState, memo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Switch, TextInput } from 'react-native';
import Screen from '@/src/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Truck, Star, Package, ArrowRight, MapPin, Mic } from 'lucide-react-native';
import { mockLoads } from '@/mocks/loads';
import { SORT_DROPDOWN_ENABLED, GEO_SORT_ENABLED, AI_RERANK_ENABLED, AI_COPILOT_CHIPS_ENABLED } from '@/constants/flags';
import { SortDropdown } from '@/components/SortDropdown';
import { useSettings, type SortOrder } from '@/hooks/useSettings';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';
import { font, moderateScale } from '@/src/ui/scale';

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

function formatUSD(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount ?? 0);
  } catch (_e) {
    const n = Number(amount ?? 0);
    const parts = Math.round(n).toString().split('');
    for (let i = parts.length - 3; i > 0; i -= 3) parts.splice(i, 0, ',');
    return `$${parts.join('')}`;
  }
}

const RecentLoadRow = memo<RecentLoadProps & { distanceMiles?: number }>(({ id, originCity, originState, destinationCity, destinationState, pickupDate, weight, rate, onPress, distanceMiles }) => {
  return (
    <TouchableOpacity key={id} onPress={() => onPress(id)} style={styles.loadRow} testID={`recent-load-${id}`}>
      <View style={styles.loadLeft}>
        <Text style={styles.loadTitle}>{originCity}, {originState}</Text>
        <Text style={styles.loadSub}>{destinationCity}, {destinationState}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Pickup: {new Date(pickupDate as any).toLocaleDateString?.('en-US', { month: 'short', day: 'numeric' } as any) ?? String(pickupDate)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{weight.toLocaleString()} lbs</Text>
        </View>
      </View>
      <View style={styles.loadRight}>
        <View style={styles.priceChip}>
          <Text style={styles.priceChipText}>{formatUSD(rate)}</Text>
        </View>
        {typeof distanceMiles === 'number' ? (
          <Text style={styles.distanceSmall}>{distanceMiles.toFixed(1)} mi</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  console.log('[Dashboard] rendering');
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [backhaulOn, setBackhaulOn] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [minWeight, setMinWeight] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [nlQuery, setNlQuery] = useState<string>('');

  const sortOptionsBase = useMemo<SortOrder[]>(() => ['Best', 'Newest', 'Highest $', 'Lightest'], []);
  const { sortOrder, setSortOrder, isHydrating, radiusMiles, setRadiusMiles } = useSettings();
  const [sort, setSort] = useState<SortOrder>(sortOrder);

  const { startWatching, stopWatching, requestPermissionAsync, getForegroundPermissionStatusAsync } = useLiveLocation();
  const [currentLoc, setCurrentLoc] = useState<GeoCoords | null>(null);
  const [hasLocationPerm, setHasLocationPerm] = useState<boolean>(false);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [aiRecentOrder, setAiRecentOrder] = useState<string[] | null>(null);

  const handleSortChange = useCallback((next: string) => {
    const opts: string[] = GEO_SORT_ENABLED && hasLocationPerm ? [...sortOptionsBase, 'Nearest'] : [...sortOptionsBase];
    const valid = opts.find(o => o === next);
    if (valid) {
      setSort(valid as SortOrder);
      void setSortOrder(valid as SortOrder);
    }
  }, [hasLocationPerm, sortOptionsBase, setSortOrder]);

  console.log('[Dashboard] user:', user?.name, 'isLoading:', isLoading);

  const recentLoads = useMemo(() => mockLoads?.slice(0, 3) ?? [], []);
  const lastDelivery = useMemo(() => recentLoads[0]?.destination, [recentLoads]);

  const haversineMiles = useCallback((a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
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
  }, []);

  useEffect(() => {
    (async () => {
      const fg = await getForegroundPermissionStatusAsync();
      setHasLocationPerm(fg);
      if (!fg && sort === 'Nearest') {
        setSort('Best');
      }
    })();
  }, [getForegroundPermissionStatusAsync]);

  useEffect(() => {
    if (!GEO_SORT_ENABLED) return;
    if (sort !== 'Nearest') {
      setDistances({});
      if (currentLoc) setCurrentLoc(null);
      stopWatching();
      return;
    }
    let unsub: (() => void) | null = null;
    (async () => {
      const ok = await requestPermissionAsync();
      setHasLocationPerm(ok);
      if (!ok) {
        setSort('Best');
        return;
      }
      unsub = await startWatching((coords) => setCurrentLoc(coords), { distanceIntervalMeters: 50 });
    })();
    return () => { try { unsub?.(); } catch {} };
  }, [sort, requestPermissionAsync, startWatching, stopWatching, currentLoc]);

  useEffect(() => {
    if (!currentLoc) return;
    const map: Record<string, number> = {};
    for (const l of recentLoads) {
      if (l.origin?.lat != null && l.origin?.lng != null) {
        map[l.id] = haversineMiles({ lat: currentLoc.latitude, lng: currentLoc.longitude }, { lat: l.origin.lat, lng: l.origin.lng });
      }
    }
    setDistances(map);
  }, [currentLoc, recentLoads, haversineMiles]);

  useEffect(() => {
    let aborted = false;
    const clientPersonalize = () => {
      const loads = recentLoads;
      if (!loads || loads.length === 0) return null as string[] | null;
      const maxRpm = loads.reduce((m, l) => Math.max(m, Number(l.ratePerMile ?? 0)), 0) || 1;
      const radius = Number(radiusMiles ?? 50) || 50;
      const fav: any = (user as any)?.favoriteLanes ?? [];
      const truckPref: string | null = (user?.vehicleTypes && user.vehicleTypes.length > 0 ? user.vehicleTypes[0] : null) as any;
      const cur = currentLoc ? { lat: currentLoc.latitude, lng: currentLoc.longitude } : null;
      const laneKey = (o?: any, d?: any) => {
        const oc = `${o?.city ?? ''}`.toLowerCase();
        const os = `${o?.state ?? ''}`.toLowerCase();
        const dc = `${d?.city ?? ''}`.toLowerCase();
        const ds = `${d?.state ?? ''}`.toLowerCase();
        return [
          `${oc}->${dc}`,
          `${os}->${ds}`,
          `${oc},${os}->${dc},${ds}`,
        ];
      };
      const isFavLane = (o?: any, d?: any) => {
        const keys = laneKey(o, d);
        try {
          if (Array.isArray(fav)) {
            return fav.some((x: any) => {
              const s = typeof x === 'string' ? x.toLowerCase() : JSON.stringify(x ?? {}).toLowerCase();
              return keys.some(k => s.includes(k));
            });
          }
        } catch {}
        return false;
      };
      const score = (l: typeof loads[number]): number => {
        let s = 0;
        const rpm = Number(l.ratePerMile ?? 0) / maxRpm;
        s += rpm * 0.5;
        if (truckPref && String(l.vehicleType ?? '').toLowerCase() === String(truckPref).toLowerCase()) s += 0.15;
        if (isFavLane(l.origin, l.destination)) s += 0.2;
        const dist = typeof distances[l.id] === 'number' ? (distances[l.id] as number) : null;
        if (cur && dist != null && !Number.isNaN(dist)) {
          const dScore = 1 - Math.min(dist / Math.max(radius, 1), 1);
          s += dScore * 0.25;
        }
        return s;
      };
      const ordered = loads.slice().sort((a, b) => score(b) - score(a)).map(l => l.id);
      return ordered;
    };
    (async () => {
      if (!AI_RERANK_ENABLED) { setAiRecentOrder(null); return; }
      const t0 = Date.now();
      try {
        const payload = {
          loads: recentLoads,
          prefs: {
            homeBase: (user as any)?.homeBase ?? null,
            favoriteLanes: (user as any)?.favoriteLanes ?? [],
            truckType: (user?.vehicleTypes && user.vehicleTypes.length > 0 ? user.vehicleTypes[0] : null),
          },
          context: {
            currentLocation: currentLoc ? { lat: currentLoc.latitude, lng: currentLoc.longitude } : null,
          },
        };
        console.log('[Dashboard] AI rerank request for recent loads', { size: recentLoads.length });
        const res = await fetch('/ai/rerankLoads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const t1 = Date.now();
        if (!res.ok) {
          console.warn('[Dashboard] AI rerank failed', res.status, { ms: t1 - t0 });
          if (!aborted) setAiRecentOrder(clientPersonalize());
          return;
        }
        const data: any = await res.json();
        const ids: string[] = Array.isArray(data?.ids) ? data.ids : (Array.isArray(data?.order) ? data.order : []);
        if (!ids || ids.length === 0) {
          console.warn('[Dashboard] AI rerank empty/invalid response', { ms: t1 - t0 });
          if (!aborted) setAiRecentOrder(clientPersonalize());
          return;
        }
        const allowed = new Set(recentLoads.map(l => l.id));
        const clean = ids.filter((id) => allowed.has(id));
        if (!aborted) setAiRecentOrder(clean.length > 0 ? clean : clientPersonalize());
        console.log('[Dashboard] AI rerank applied for recent loads', { count: clean.length, ms: t1 - t0 });
      } catch (e) {
        const tErr = Date.now();
        console.warn('[Dashboard] AI rerank error', e, { ms: tErr - t0 });
        if (!aborted) setAiRecentOrder(clientPersonalize());
      }
    })();
    return () => { aborted = true; };
  }, [AI_RERANK_ENABLED, JSON.stringify(recentLoads.map(l => l.id)), currentLoc?.latitude, currentLoc?.longitude, user?.id, radiusMiles, JSON.stringify(distances)]);

  const applyChip = useCallback(async (chip: 'highest' | 'near' | 'lightest') => {
    console.log('[Dashboard] Apply chip', chip);
    if (chip === 'highest') {
      const nextSort = 'Highest $';
      setSort(nextSort as SortOrder);
      await setSortOrder(nextSort as SortOrder);
    } else if (chip === 'near') {
      const nextSort = 'Nearest';
      setSort(nextSort as any);
      await setSortOrder(nextSort as any);
      if ((radiusMiles ?? 0) <= 0) await setRadiusMiles(50);
      try {
        const ok = await requestPermissionAsync();
        setHasLocationPerm(ok);
        if (!ok) {
          setSort('Best');
          await setSortOrder('Best');
        }
      } catch {}
    } else if (chip === 'lightest') {
      const nextSort = 'Lightest';
      setSort(nextSort as SortOrder);
      await setSortOrder(nextSort as SortOrder);
    }
  }, [setSortOrder, radiusMiles, setRadiusMiles, requestPermissionAsync]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please log in to continue</Text>
        </View>
      </Screen>
    );
  }

  const onSubmitNlSearch = useCallback(async () => {
    const q = nlQuery.trim();
    if (!q) return;
    console.log('[Dashboard] Natural language search:', q);
    // For now, just navigate to loads page with the query
    router.push({ pathname: '/(tabs)/(loads)', params: { nlQuery: q } });
  }, [nlQuery, router]);

  const handleNlQueryChange = useCallback((text: string) => {
    setNlQuery(text);
  }, []);

  const handleViewAll = useCallback(() => {
    const params: Record<string, string> = {};
    if (origin) params.origin = origin;
    if (destination) params.destination = destination;
    if (minWeight) params.minWeight = minWeight;
    if (minPrice) params.minPrice = minPrice;
    if (sort) params.sort = sort;
    if (radiusMiles) params.radius = String(radiusMiles);
    router.push({ pathname: '/(tabs)/(loads)', params });
  }, [router, origin, destination, minWeight, minPrice, sort, radiusMiles]);

  const handleOpenLoad = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);

  const toggleBackhaul = useCallback((value: boolean) => {
    setBackhaulOn(value);
    if (value && lastDelivery) {
      router.push('/(tabs)/(loads)');
    }
  }, [lastDelivery, router]);

  const currentSortOptions = useMemo<SortOrder[]>(() => {
    const base: SortOrder[] = [...sortOptionsBase];
    if (GEO_SORT_ENABLED && hasLocationPerm) base.push('Nearest');
    return base;
  }, [sortOptionsBase, hasLocationPerm]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.container}>
        <ImageBackground
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uzyvqegm8riqj7x0yy7p9' }}
          style={styles.hero}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle} testID="dashboard-hero-title" allowFontScaling={false}>LoadRun</Text>
          <Text style={styles.heroSubtitle} testID="dashboard-hero-subtitle">AI Load Board for Car Haulers</Text>
        </ImageBackground>

        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.welcomeName} allowFontScaling={false}>{user?.name?.split(' ')[0] ?? 'Driver'}</Text>
          <TouchableOpacity style={styles.voiceButton} testID="dashboard-voice-capture">
            <Mic size={moderateScale(20)} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard} testID="stat-available-loads">
            <Truck size={moderateScale(20)} color={theme.colors.primary} />
            <Text style={styles.statValue} allowFontScaling={false}>{mockLoads?.length ?? 0}</Text>
            <Text style={styles.statLabel} allowFontScaling={false}>Available Loads</Text>
          </View>
          <View style={styles.statCard} testID="stat-rating">
            <Star size={moderateScale(20)} color={theme.colors.warning} />
            <Text style={styles.statValue} allowFontScaling={false}>{user?.rating?.toString() ?? '4.8'}</Text>
            <Text style={styles.statLabel} allowFontScaling={false}>Your Rating</Text>
          </View>
          <View style={styles.statCard} testID="stat-completed">
            <Package size={moderateScale(20)} color={theme.colors.gray} />
            <Text style={styles.statValue} allowFontScaling={false}>{user?.completedLoads ?? 24}</Text>
            <Text style={styles.statLabel} allowFontScaling={false}>Completed</Text>
          </View>
        </View>

        <View style={styles.describeLoadRow}>
          <TextInput
            testID="describe-load-input"
            value={nlQuery}
            onChangeText={handleNlQueryChange}
            placeholder={'Describe your load'}
            placeholderTextColor={theme.colors.gray}
            returnKeyType="search"
            onSubmitEditing={onSubmitNlSearch}
            style={styles.describeInput}
            accessibilityLabel="Natural language search"
          />
          <TouchableOpacity
            onPress={onSubmitNlSearch}
            testID="describe-load-apply"
            style={styles.applyButton}
          >
            <Text style={styles.applyButtonText} allowFontScaling={false}>
              Apply
            </Text>
          </TouchableOpacity>
        </View>

        {AI_COPILOT_CHIPS_ENABLED ? (
          <View style={styles.filtersRow}>
            <Text onPress={() => void applyChip('highest')} style={[styles.sortChip]} accessibilityRole="button" testID="chipHighest">
              <Text style={styles.sortChipText} allowFontScaling={false}>Highest $/mi</Text>
            </Text>
            <Text onPress={() => void applyChip('near')} style={[styles.sortChip, { backgroundColor: theme.colors.primary }]} accessibilityRole="button" testID="chipNearMe">
              <Text style={[styles.sortChipText, { color: theme.colors.white }]} allowFontScaling={false}>Near me</Text>
            </Text>
            <Text onPress={() => void applyChip('lightest')} style={[styles.sortChip]} accessibilityRole="button" testID="chipLightest">
              <Text style={styles.sortChipText} allowFontScaling={false}>Lightest</Text>
            </Text>
          </View>
        ) : null}


        
        {GEO_SORT_ENABLED && hasLocationPerm && sort === 'Nearest' && (
          <View style={styles.filtersRow}>
            {[25, 50, 100, 250].map((r) => (
              <Text
                key={r}
                onPress={() => { void setRadiusMiles(r); }}
                style={[styles.sortChip, r === radiusMiles ? { backgroundColor: theme.colors.primary } : {}, r !== radiusMiles ? { backgroundColor: theme.colors.white } : {}, { paddingVertical: moderateScale(8) }]}
                accessibilityRole="button"
                testID={r === 25 ? 'pillRadius25' : r === 50 ? 'pillRadius50' : r === 100 ? 'pillRadius100' : 'pillRadius250'}
              >
                <Text style={{ color: r === radiusMiles ? theme.colors.white : theme.colors.dark, fontWeight: '600' }} allowFontScaling={false}>{r} mi</Text>
              </Text>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          {isHydrating && <Text style={styles.viewAllText}>Loading preferences…</Text>}
          <Text style={styles.sectionTitle}>Recent Loads</Text>
          <TouchableOpacity onPress={handleViewAll} accessibilityRole="button">
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText} allowFontScaling={false}>View All</Text>
              <ArrowRight size={moderateScale(16)} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View>
          {(aiRecentOrder ? (() => {
            const map = new Map(recentLoads.map(l => [l.id, l] as const));
            const ordered = [] as typeof recentLoads;
            aiRecentOrder.forEach(id => { const it = map.get(id); if (it) ordered.push(it); });
            recentLoads.forEach(l => { if (aiRecentOrder.indexOf(l.id) === -1) ordered.push(l); });
            return ordered;
          })() : recentLoads)?.map((l) => (
            <RecentLoadRow
              key={l.id}
              id={l.id}
              originCity={l.origin?.city ?? 'Unknown'}
              originState={l.origin?.state ?? 'Unknown'}
              destinationCity={l.destination?.city ?? 'Unknown'}
              destinationState={l.destination?.state ?? 'Unknown'}
              pickupDate={l.pickupDate ?? new Date()}
              weight={l.weight ?? 0}
              rate={l.rate ?? 0}
              onPress={handleOpenLoad}
              distanceMiles={distances[l.id]}
            />
          )) ?? []}
        </View>

        <View style={styles.backhaulCard} testID="backhaul-toggle-card">
          <View style={styles.backhaulRow}>
            <MapPin size={moderateScale(22)} color="#1D4ED8" />
            <Text style={styles.backhaulTitle} allowFontScaling={false}>Backhaul near delivery (50mi)</Text>
          </View>
          <Text style={styles.backhaulSub} numberOfLines={2}>
            {lastDelivery ? `${lastDelivery.city}, ${lastDelivery.state}` : 'No recent delivery found'}
          </Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} allowFontScaling={false}>Show backhaul loads</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    paddingBottom: moderateScale(theme.spacing.xl),
  },
  hero: {
    height: moderateScale(160),
    justifyContent: 'flex-end',
    padding: moderateScale(theme.spacing.lg),
    backgroundColor: theme.colors.primary,
    marginHorizontal: moderateScale(theme.spacing.lg),
    marginTop: moderateScale(theme.spacing.sm),
    borderRadius: moderateScale(theme.borderRadius.lg),
  },
  heroImage: {
    borderRadius: moderateScale(theme.borderRadius.lg),
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: moderateScale(theme.borderRadius.lg),
  },
  heroTitle: {
    fontSize: font(28),
    fontWeight: '800',
    color: theme.colors.white,
  },
  heroSubtitle: {
    fontSize: font(14),
    color: theme.colors.white,
    opacity: 0.9,
    marginTop: moderateScale(2),
    marginBottom: moderateScale(2),
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: moderateScale(theme.spacing.lg),
    paddingTop: moderateScale(theme.spacing.md),
    justifyContent: 'space-between',
  },
  voiceButton: {
    padding: moderateScale(theme.spacing.xs),
    borderRadius: moderateScale(theme.borderRadius.sm),
    backgroundColor: theme.colors.lightGray,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: font(16),
    color: theme.colors.gray,
  },
  welcomeText: {
    fontSize: font(14),
    color: theme.colors.gray,
  },
  welcomeName: {
    fontSize: font(20),
    fontWeight: '700',
    color: theme.colors.dark,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(theme.spacing.lg),
    paddingVertical: moderateScale(theme.spacing.md),
    gap: moderateScale(8),
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: moderateScale(theme.spacing.md),
    borderRadius: moderateScale(theme.borderRadius.md),
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: font(20),
    fontWeight: '700',
    color: theme.colors.dark,
  },
  statLabel: {
    fontSize: font(12),
    color: theme.colors.gray,
  },
  sectionHeader: {
    marginTop: moderateScale(theme.spacing.sm),
    paddingHorizontal: moderateScale(theme.spacing.lg),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersRow: {
    marginTop: moderateScale(theme.spacing.md),
    paddingHorizontal: moderateScale(theme.spacing.lg),
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  describeLoadRow: {
    marginTop: moderateScale(theme.spacing.md),
    paddingHorizontal: moderateScale(theme.spacing.lg),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  describeInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: moderateScale(12),
    backgroundColor: theme.colors.white,
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    fontSize: font(16),
  },
  applyButton: {
    minWidth: moderateScale(96),
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: moderateScale(10),
  },
  applyButtonText: {
    fontSize: font(14),
    fontWeight: '700',
    color: theme.colors.white,
  },
  aiLink: {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.white,
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(10),
    textAlignVertical: 'center',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: font(14),
    lineHeight: moderateScale(18),
    overflow: 'hidden',
    minHeight: 44,
  },
  sectionTitle: {
    fontSize: font(18),
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
    marginRight: moderateScale(6),
    fontSize: font(14),
  },
  loadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: moderateScale(theme.spacing.lg),
    marginTop: moderateScale(theme.spacing.sm),
    padding: moderateScale(theme.spacing.md),
    borderRadius: moderateScale(theme.borderRadius.md),
    minHeight: 44,
  },
  loadLeft: {
    flex: 1,
    paddingRight: moderateScale(theme.spacing.md),
  },
  loadRight: {
    alignItems: 'flex-end',
  },
  loadTitle: {
    fontSize: font(16),
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadSub: {
    fontSize: font(14),
    color: theme.colors.gray,
    marginTop: moderateScale(2),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(6),
  },
  metaText: {
    fontSize: font(12),
    color: theme.colors.gray,
  },
  metaDot: {
    fontSize: font(12),
    color: theme.colors.gray,
  },
  price: {
    fontSize: font(18),
    fontWeight: '700',
    color: theme.colors.primary,
  },
  priceChip: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(9999),
    minWidth: moderateScale(80),
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  priceChipText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: font(16),
  },
  favorite: {
    marginTop: moderateScale(6),
    fontSize: font(12),
    color: theme.colors.gray,
  },
  distanceSmall: {
    marginTop: moderateScale(6),
    fontSize: font(12),
    color: theme.colors.gray,
    fontWeight: '600',
  },
  backhaulCard: {
    backgroundColor: '#EA580C',
    marginHorizontal: moderateScale(theme.spacing.lg),
    marginTop: moderateScale(theme.spacing.xl),
    padding: moderateScale(theme.spacing.lg),
    borderRadius: moderateScale(theme.borderRadius.lg),
    borderWidth: 1,
    borderColor: '#C2410C',
    shadowColor: '#9A3412',
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(10),
    shadowOffset: { width: 0, height: moderateScale(6) },
    elevation: 3,
  },
  backhaulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  backhaulTitle: {
    marginLeft: moderateScale(6),
    fontSize: font(16),
    fontWeight: '700',
    color: theme.colors.white,
  },
  backhaulSub: {
    marginTop: moderateScale(4),
    fontSize: font(14),
    color: theme.colors.white,
    opacity: 0.9,
  },
  toggleRow: {
    marginTop: moderateScale(theme.spacing.md),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  toggleLabel: {
    fontSize: font(14),
    color: theme.colors.white,
  },
  sortChip: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortChipText: {
    color: theme.colors.dark,
    fontWeight: '600',
    fontSize: font(14),
  },
  input: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    minWidth: moderateScale(120),
    flexGrow: 1,
    fontSize: font(16),
    minHeight: 44,
  },
});