import React, { useMemo, useCallback, useState, memo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Switch, TextInput } from 'react-native';
import Screen from '@/src/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Truck, Star, Package, ArrowRight, MapPin, Mic, Cloud, Sun, CloudRain, CloudLightning, Snowflake } from 'lucide-react-native';
import { VoiceCapture } from '@/components/VoiceCapture';
import { mockLoads } from '@/mocks/loads';
import { useLoads } from '@/hooks/useLoads';
import { SORT_DROPDOWN_ENABLED, GEO_SORT_ENABLED, AI_RERANK_ENABLED, AI_COPILOT_CHIPS_ENABLED } from '@/constants/flags';
import { SortDropdown } from '@/components/SortDropdown';
import { useSettings, type SortOrder } from '@/hooks/useSettings';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';
import { font, moderateScale } from '@/src/ui/scale';
import { trpcClient } from '@/lib/trpc';
import { OPENWEATHER_API_KEY, ORS_API_KEY, MAPBOX_TOKEN } from '@/utils/env';

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
  const bidsCount = Math.floor(Math.random() * 5) + 1;
  
  return (
    <TouchableOpacity key={id} onPress={() => onPress(id)} style={styles.loadCard} testID={`recent-load-${id}`}>
      {/* Status Pills Row */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Active</Text>
        </View>
        {Math.random() > 0.7 && (
          <View style={styles.rushBadge}>
            <Text style={styles.rushText}>Rush Delivery</Text>
          </View>
        )}
      </View>

      {/* Load Details */}
      <Text style={styles.statusLine}>Status: Pending</Text>
      <Text style={styles.rateText}>Rate: {formatUSD(rate)}</Text>
      <Text style={styles.routeText}>Route: {originCity}, {originState} → {destinationCity}, {destinationState}</Text>
      <Text style={styles.bidsText}>Bids: {bidsCount}</Text>
      
      {/* Tap for Details */}
      <Text style={styles.tapForDetails}>Tap for Details</Text>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  console.log('[Dashboard] rendering');
  const { user, isLoading } = useAuth();
  const { loads: actualLoads, filteredLoads } = useLoads();
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';
  const router = useRouter();

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
  const [weather, setWeather] = useState<{ tempF?: number; description?: string; main?: string } | null>(null);

  const handleSortChange = useCallback((next: string) => {
    const opts: string[] = GEO_SORT_ENABLED && hasLocationPerm ? [...sortOptionsBase, 'Nearest'] : [...sortOptionsBase];
    const valid = opts.find(o => o === next);
    if (valid) {
      setSort(valid as SortOrder);
      void setSortOrder(valid as SortOrder);
    }
  }, [hasLocationPerm, sortOptionsBase, setSortOrder]);

  console.log('[Dashboard] user:', user?.name, 'isLoading:', isLoading);

  const recentLoads = useMemo(() => actualLoads?.slice(0, 3) ?? [], [actualLoads]);
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
    (async () => {
      try {
        const hasKey: boolean = typeof OPENWEATHER_API_KEY === 'string' && !!OPENWEATHER_API_KEY;
        if (!currentLoc || !hasKey) { setWeather(null); return; }
        const res = await trpcClient.weather.current.query({ lat: currentLoc.latitude, lon: currentLoc.longitude, openWeatherKey: OPENWEATHER_API_KEY });
        setWeather(res ?? null);
      } catch (e) {
        console.warn('[Dashboard] weather fetch failed', e);
        setWeather(null);
      }
    })();
  }, [currentLoc?.latitude, currentLoc?.longitude]);

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
      const truckPref: string | null = ((user as any)?.vehicleTypes && (user as any).vehicleTypes.length > 0 ? (user as any).vehicleTypes[0] : null) as any;
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
            truckType: ((user as any)?.vehicleTypes && (user as any).vehicleTypes.length > 0 ? (user as any).vehicleTypes[0] : null),
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


  const onSubmitNlSearch = useCallback(async () => {
    const q = nlQuery.trim();
    if (!q) return;
    console.log('[Dashboard] Natural language search:', q);
    // For now, just navigate to loads page with the query
    router.push({ pathname: '/loads', params: { nlQuery: q } });
  }, [nlQuery, router]);

  const handleNlQueryChange = useCallback((text: string) => {
    setNlQuery(text);
  }, []);

  const handleVoiceTranscribed = useCallback((text: string) => {
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
    router.push({ pathname: '/loads', params });
  }, [router, origin, destination, minWeight, minPrice, sort, radiusMiles]);

  const handleOpenLoad = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);



  const currentSortOptions = useMemo<SortOrder[]>(() => {
    const base: SortOrder[] = [...sortOptionsBase];
    if (GEO_SORT_ENABLED && hasLocationPerm) base.push('Nearest');
    return base;
  }, [sortOptionsBase, hasLocationPerm]);

  const WeatherIcon = useMemo(() => {
    const key = String(weather?.main || '').toLowerCase();
    if (key.includes('thunder')) return CloudLightning;
    if (key.includes('snow')) return Snowflake;
    if (key.includes('rain') || key.includes('drizzle')) return CloudRain;
    if (key.includes('cloud')) return Cloud;
    if (key.includes('clear')) return Sun;
    return Cloud;
  }, [weather?.main]);

  return (
    <Screen>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : !user ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please log in to continue</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.container}>
          <ImageBackground
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uzyvqegm8riqj7x0yy7p9' }}
            style={styles.hero}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay} />
            <Text style={styles.heroTitle} testID="dashboard-hero-title" allowFontScaling={false}>
            {isDriver ? 'LoadRun Driver' : isShipper ? 'LoadRun Shipper' : 'LoadRun'}
          </Text>
          <Text style={styles.heroSubtitle} testID="dashboard-hero-subtitle">
            {isDriver ? 'AI-Powered Load Matching' : isShipper ? 'Bulk Load Management' : 'AI Load Board for Car Haulers'}
          </Text>
            {weather?.tempF != null ? (
              <View style={styles.weatherPill} testID="dashboard-weather-pill">
                <WeatherIcon size={moderateScale(16)} color={theme.colors.white} />
                <Text style={styles.weatherText} allowFontScaling={false}>{Math.round(weather.tempF)}°F</Text>
                {weather?.description ? (
                  <Text style={[styles.weatherText, { opacity: 0.9 }]} numberOfLines={1} allowFontScaling={false}>{String(weather.description)}</Text>
                ) : null}
              </View>
            ) : null}
          </ImageBackground>

          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.welcomeName} allowFontScaling={false}>{user?.name?.split(' ')[0] ?? 'Driver'}</Text>
            {isDriver && (
              <VoiceCapture
                onTranscribed={handleVoiceTranscribed}
                size="sm"
                testID="dashboard-welcome-voice-capture"
              />
            )}
          </View>

          <View style={styles.statsRow}>
            {isDriver ? (
              <>
                <View style={styles.statCard} testID="stat-available-loads">
                  <Truck size={moderateScale(20)} color={theme.colors.primary} />
                  <Text style={styles.statValue} allowFontScaling={false}>{actualLoads?.length ?? 0}</Text>
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
              </>
            ) : (
              <>
                <View style={styles.statCard} testID="stat-posted-loads">
                  <Package size={moderateScale(20)} color={theme.colors.primary} />
                  <Text style={styles.statValue} allowFontScaling={false}>{(user as any)?.totalLoadsPosted ?? 0}</Text>
                  <Text style={styles.statLabel} allowFontScaling={false}>Posted Loads</Text>
                </View>
                <View style={styles.statCard} testID="stat-active-loads">
                  <Truck size={moderateScale(20)} color={theme.colors.warning} />
                  <Text style={styles.statValue} allowFontScaling={false}>{(user as any)?.activeLoads ?? 0}</Text>
                  <Text style={styles.statLabel} allowFontScaling={false}>Active Loads</Text>
                </View>
                <View style={styles.statCard} testID="stat-revenue">
                  <Star size={moderateScale(20)} color={theme.colors.gray} />
                  <Text style={styles.statValue} allowFontScaling={false}>{formatUSD((user as any)?.totalRevenue ?? 0)}</Text>
                  <Text style={styles.statLabel} allowFontScaling={false}>Revenue</Text>
                </View>
              </>
            )}
          </View>

          {isDriver && (
            <View style={styles.describeLoadRow}>
              <VoiceCapture
                onTranscribed={handleVoiceTranscribed}
                size="sm"
                testID="describe-load-voice-capture"
              />
              <TextInput
                testID="describe-load-input"
                value={nlQuery}
                onChangeText={handleNlQueryChange}
                placeholder={'Describe your ideal load'}
                placeholderTextColor={theme.colors.gray}
                returnKeyType="search"
                onSubmitEditing={onSubmitNlSearch}
                style={styles.describeInput}
                accessibilityLabel="Natural language search"
              />
              <TouchableOpacity
                onPress={onSubmitNlSearch}
                testID="describe-load-ai-intelligence"
                style={styles.applyButton}
              >
                <Text style={styles.applyButtonText} allowFontScaling={false}>
                  AI LOADS
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {AI_COPILOT_CHIPS_ENABLED && isDriver ? (
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
            <Text style={styles.sectionTitle}>
              {isDriver ? 'AI Recommended Loads' : 'Recent Loads'}
            </Text>
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



          {isShipper && (
            <View style={styles.shipperActionsCard}>
              <Text style={styles.shipperActionsTitle}>Quick Actions</Text>
              <View style={styles.shipperActionsRow}>
                <TouchableOpacity 
                  style={styles.shipperActionButton}
                  onPress={() => router.push('/post-load')}
                >
                  <Text style={styles.shipperActionText}>Post Load</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.shipperActionButton}
                  onPress={() => router.push('/csv-bulk-upload')}
                >
                  <Text style={styles.shipperActionText}>Bulk Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.shipperActionButton}
                  onPress={() => router.push('/shipper-dashboard')}
                >
                  <Text style={styles.shipperActionText}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
    height: moderateScale(220),
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
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(9999),
    marginTop: moderateScale(6),
    gap: moderateScale(6),
  },
  weatherText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: font(12),
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: moderateScale(theme.spacing.lg),
    paddingTop: moderateScale(theme.spacing.md),
    justifyContent: 'space-between',
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
  loadCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: moderateScale(theme.spacing.lg),
    marginTop: moderateScale(theme.spacing.sm),
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rushBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rushText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  rateText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '600',
  },
  routeText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  bidsText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
  tapForDetails: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    textAlign: 'center',
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
    minWidth: moderateScale(64),
    flex: 0,
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
    flex: 1,
    minWidth: moderateScale(96),
    fontSize: font(16),
    minHeight: 44,
  },
  shipperActionsCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: moderateScale(theme.spacing.lg),
    marginTop: moderateScale(theme.spacing.sm),
    padding: moderateScale(theme.spacing.lg),
    borderRadius: moderateScale(theme.borderRadius.md),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shipperActionsTitle: {
    fontSize: font(18),
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: moderateScale(theme.spacing.md),
  },
  shipperActionsRow: {
    flexDirection: 'row',
    gap: moderateScale(theme.spacing.md),
  },
  shipperActionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: moderateScale(theme.spacing.md),
    paddingHorizontal: moderateScale(theme.spacing.sm),
    borderRadius: moderateScale(theme.borderRadius.md),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  shipperActionText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: font(14),
  },
});