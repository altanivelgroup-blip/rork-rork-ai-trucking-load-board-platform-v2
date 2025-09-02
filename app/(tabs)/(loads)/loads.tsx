import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadCard } from '@/components/LoadCard';
import { FilterBar } from '@/components/FilterBar';
import { SortDropdown } from '@/components/SortDropdown';
import { SORT_DROPDOWN_ENABLED, GEO_SORT_ENABLED, AI_NL_SEARCH_ENABLED, AI_RERANK_ENABLED, AI_COPILOT_CHIPS_ENABLED } from '@/constants/flags';
import { useSettings } from '@/hooks/useSettings';
import { theme } from '@/constants/theme';
import { VehicleType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { mockLoads } from '@/mocks/loads';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoadsScreen() {
  console.log('[LoadsScreen] Rendering loads screen');
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; destination?: string; minWeight?: string; maxWeight?: string; minPrice?: string; sort?: string; radius?: string; truckType?: string }>();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { user } = useAuth();
  const [nlQuery, setNlQuery] = useState<string>('');
  const { sortOrder, setSortOrder, radiusMiles, setRadiusMiles } = useSettings();
  const [filters, setFilters] = useState<Record<string, unknown>>({ sort: sortOrder });
  const { startWatching, stopWatching, requestPermissionAsync, getForegroundPermissionStatusAsync } = useLiveLocation();
  const [currentLoc, setCurrentLoc] = useState<GeoCoords | null>(null);
  const [hasLocationPerm, setHasLocationPerm] = useState<boolean>(false);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [aiOrder, setAiOrder] = useState<string[] | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const initial: Record<string, unknown> = {};
    if (params.origin) initial.origin = String(params.origin);
    if (params.destination) initial.destination = String(params.destination);
    if (params.minWeight) initial.minWeight = String(params.minWeight);
    if (params.maxWeight) initial.maxWeight = String(params.maxWeight);
    if (params.truckType) initial.truckType = String(params.truckType);
    if (params.minPrice) initial.minPrice = String(params.minPrice);
    if (params.sort) initial.sort = String(params.sort);
    if (params.radius) {
      const r = parseInt(String(params.radius), 10);
      if (!Number.isNaN(r)) void setRadiusMiles(r);
    }
    if (Object.keys(initial).length > 0) {
      setFilters((prev) => ({ ...prev, ...initial }));
      console.log('[LoadsScreen] Applied initial filters from params', initial);
    }
  }, [params.origin, params.destination, params.minWeight, params.minPrice, params.sort, params.radius, setRadiusMiles]);

  useEffect(() => {
    (async () => {
      const fg = await getForegroundPermissionStatusAsync();
      setHasLocationPerm(fg);
      const curSort = String(filters.sort ?? sortOrder ?? 'Best');
      if (!fg && curSort === 'Nearest') {
        setFilters((prev) => ({ ...prev, sort: 'Best' }));
      }
    })();
  }, [getForegroundPermissionStatusAsync]);

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
    if (!GEO_SORT_ENABLED) return;
    if (String(filters.sort ?? 'Best') !== 'Nearest') {
      if (currentLoc) setCurrentLoc(null);
      setDistances({});
      stopWatching();
      return;
    }
    let unsub: (() => void) | null = null;
    (async () => {
      const ok = await requestPermissionAsync();
      setHasLocationPerm(ok);
      if (!ok) {
        setFilters((prev) => ({ ...prev, sort: 'Best' }));
        return;
      }
      unsub = await startWatching((coords) => {
        setCurrentLoc(coords);
      }, { distanceIntervalMeters: 50 });
    })();
    return () => { try { unsub?.(); } catch {} };
  }, [filters.sort, requestPermissionAsync, startWatching, stopWatching, currentLoc]);

  useEffect(() => {
    if (!currentLoc) return;
    const map: Record<string, number> = {};
    for (const l of mockLoads) {
      if (l.origin?.lat != null && l.origin?.lng != null) {
        map[l.id] = haversineMiles({ lat: currentLoc.latitude, lng: currentLoc.longitude }, { lat: l.origin.lat, lng: l.origin.lng });
      }
    }
    setDistances(map);
  }, [currentLoc, haversineMiles]);

  const baseFiltered = useMemo(() => {
    let base = mockLoads.slice();
    const origin = String(filters.origin ?? '').toLowerCase();
    const destination = String(filters.destination ?? '').toLowerCase();
    const minW = parseInt(String(filters.minWeight ?? ''), 10);
    const minP = parseInt(String(filters.minPrice ?? ''), 10);
    const maxW = parseInt(String(filters.maxWeight ?? ''), 10);
    const truckType = String(filters.truckType ?? '').toLowerCase();
    const dateFrom = String((filters as any).dateFrom ?? '');
    const dateTo = String((filters as any).dateTo ?? '');

    if (origin) {
      base = base.filter(l => `${l.origin?.city ?? ''}, ${l.origin?.state ?? ''}`.toLowerCase().includes(origin));
    }
    if (destination) {
      base = base.filter(l => `${l.destination?.city ?? ''}, ${l.destination?.state ?? ''}`.toLowerCase().includes(destination));
    }
    if (!Number.isNaN(minW)) {
      base = base.filter(l => (l.weight ?? 0) >= minW);
    }
    if (!Number.isNaN(minP)) {
      base = base.filter(l => (l.rate ?? 0) >= minP);
    }

    if (!Number.isNaN(maxW)) {
      base = base.filter(l => (l.weight ?? 0) <= maxW);
    }
    if (truckType) {
      base = base.filter(l => (l.vehicleType ?? '').toLowerCase() === truckType);
    }
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      if (!Number.isNaN(fromTs)) base = base.filter(l => new Date(l.pickupDate ?? 0).getTime() >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime();
      if (!Number.isNaN(toTs)) base = base.filter(l => new Date(l.pickupDate ?? 0).getTime() <= toTs);
    }

    const sort = String(filters.sort ?? 'Best');

    const bestIndex: Record<string, number> = {};
    base.forEach((l, idx) => { bestIndex[l.id] = idx; });

    if (sort === 'Nearest' && GEO_SORT_ENABLED && currentLoc) {
      const withDist = base.filter(l => typeof distances[l.id] === 'number' && !Number.isNaN(distances[l.id] as number))
        .filter(l => (distances[l.id] as number) <= (radiusMiles ?? 50))
        .sort((a, b) => (distances[a.id] as number) - (distances[b.id] as number));
      const withoutDist = base.filter(l => typeof distances[l.id] !== 'number')
        .sort((a, b) => (bestIndex[a.id] ?? 0) - (bestIndex[b.id] ?? 0));
      return [...withDist, ...withoutDist];
    }

    const list = base.slice();
    if (sort === 'Newest') {
      list.sort((a, b) => new Date(b.pickupDate ?? 0).getTime() - new Date(a.pickupDate ?? 0).getTime());
    } else if (sort === 'Highest $') {
      list.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    } else if (sort === 'Lightest') {
      list.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
    }
    return list;
  }, [filters, currentLoc, distances, radiusMiles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleVehicleSelect = useCallback((vehicle?: VehicleType) => {
    setFilters({ ...filters, vehicleType: vehicle });
  }, [filters, setFilters]);

  const handleBackhaulToggle = useCallback(() => {
    setFilters({ ...filters, showBackhaul: !filters.showBackhaul });
  }, [filters, setFilters]);

  const handleOpenFilters = useCallback(() => {
    console.log('Open filters modal');
  }, []);

  const onVoiceToFilters = useCallback((text: string) => {
    console.log('Voice search:', text);
  }, []);

  const applyChip = useCallback(async (chip: 'highest' | 'near' | 'lightest' | 'new') => {
    console.log('[LoadsScreen] Apply chip', chip);
    if (chip === 'highest') {
      const nextSort = 'Highest $';
      setFilters(prev => ({ ...prev, sort: nextSort }));
      await setSortOrder(nextSort as any);
    } else if (chip === 'near') {
      const nextSort = 'Nearest';
      setFilters(prev => ({ ...prev, sort: nextSort }));
      await setSortOrder(nextSort as any);
      if ((radiusMiles ?? 0) <= 0) await setRadiusMiles(50);
    } else if (chip === 'lightest') {
      const nextSort = 'Lightest';
      setFilters(prev => ({ ...prev, sort: nextSort }));
      await setSortOrder(nextSort as any);
    } else if (chip === 'new') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      setFilters(prev => ({ ...prev, sort: 'Newest', dateFrom: iso, dateTo: iso } as Record<string, unknown>));
      await setSortOrder('Newest' as any);
    }
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, [setFilters, setSortOrder, radiusMiles, setRadiusMiles]);

  const handleLoadPress = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: (typeof baseFiltered)[number] }) => (
    <LoadCard load={item} onPress={() => handleLoadPress(item.id)} distanceMiles={distances[item.id]} />
  ), [handleLoadPress, distances]);

  const keyExtractor = useCallback((item: (typeof baseFiltered)[number]) => item.id, []);

  const getItemLayout = useCallback((_: unknown, index: number) => {
    const ITEM_HEIGHT = 188;
    const SEPARATOR_HEIGHT = 8;
    const length = ITEM_HEIGHT;
    const offset = (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index;
    return { length, offset, index };
  }, []);

  const sortOptions: string[] = useMemo(() => {
    const base = ['Best', 'Newest', 'Highest $', 'Lightest'];
    if (GEO_SORT_ENABLED && hasLocationPerm) base.push('Nearest');
    return base;
  }, [hasLocationPerm]);

  useEffect(() => {
    let aborted = false;
    const clientPersonalize = () => {
      const loads = baseFiltered;
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
      if (!AI_RERANK_ENABLED) { setAiOrder(null); return; }
      const t0 = Date.now();
      try {
        const payload = {
          loads: baseFiltered,
          prefs: {
            homeBase: (user as any)?.homeBase ?? null,
            favoriteLanes: (user as any)?.favoriteLanes ?? [],
            truckType: (user?.vehicleTypes && user.vehicleTypes.length > 0 ? user.vehicleTypes[0] : null),
          },
          context: {
            currentLocation: currentLoc ? { lat: currentLoc.latitude, lng: currentLoc.longitude } : null,
          },
        };
        console.log('[LoadsScreen] AI rerank request', { size: baseFiltered.length });
        const res = await fetch('/ai/rerankLoads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const t1 = Date.now();
        if (!res.ok) {
          console.warn('[LoadsScreen] AI rerank failed', res.status, { ms: t1 - t0 });
          if (!aborted) setAiOrder(clientPersonalize());
          return;
        }
        const data: any = await res.json();
        const ids: string[] = Array.isArray(data?.ids) ? data.ids : (Array.isArray(data?.order) ? data.order : []);
        if (!ids || ids.length === 0) {
          console.warn('[LoadsScreen] AI rerank empty/invalid response', { ms: t1 - t0 });
          if (!aborted) setAiOrder(clientPersonalize());
          return;
        }
        const allowed = new Set(baseFiltered.map(l => l.id));
        const clean = ids.filter((id) => allowed.has(id));
        if (!aborted) setAiOrder(clean.length > 0 ? clean : clientPersonalize());
        console.log('[LoadsScreen] AI rerank applied', { count: clean.length, ms: t1 - t0 });
      } catch (e) {
        const tErr = Date.now();
        console.warn('[LoadsScreen] AI rerank error', e, { ms: tErr - t0 });
        if (!aborted) setAiOrder(clientPersonalize());
      }
    })();
    return () => { aborted = true; };
  }, [AI_RERANK_ENABLED, JSON.stringify(baseFiltered.map(l => l.id)), currentLoc?.latitude, currentLoc?.longitude, user?.id, radiusMiles, JSON.stringify(distances)])

  const onSubmitNlSearch = useCallback(async () => {
    if (!AI_NL_SEARCH_ENABLED) return;
    const q = nlQuery.trim();
    if (!q) return;
    const t0 = Date.now();
    try {
      console.log('[LoadsScreen] NL parse start');
      const res = await fetch('/ai/parseLoadQuery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const t1 = Date.now();
      if (!res.ok) {
        console.warn('[LoadsScreen] NL parse failed', res.status, { ms: t1 - t0 });
        return;
      }
      const data: { origin?: string; dest?: string; minPrice?: number; maxWeight?: number; dateRange?: { from?: string; to?: string }; radiusMiles?: number; truckType?: string } | null = await res.json();
      if (!data || typeof data !== 'object') {
        console.warn('[LoadsScreen] NL parse returned empty/invalid payload', { ms: t1 - t0 });
        return;
      }
      const next: Record<string, unknown> = { ...filters };
      if (data.origin) next.origin = data.origin;
      if (data.dest) next.destination = data.dest;
      if (typeof data.minPrice === 'number') next.minPrice = String(data.minPrice);
      if (typeof data.maxWeight === 'number') next.maxWeight = String(data.maxWeight);
      if (data.truckType) next.truckType = data.truckType;
      if (data.dateRange?.from) (next as any).dateFrom = data.dateRange.from;
      if (data.dateRange?.to) (next as any).dateTo = data.dateRange.to;
      setFilters(next);
      if (typeof data.radiusMiles === 'number' && !Number.isNaN(data.radiusMiles)) {
        await setRadiusMiles(data.radiusMiles);
      }
      console.log('[LoadsScreen] NL parse applied', { ms: t1 - t0, data });
    } catch (e) {
      const tErr = Date.now();
      console.warn('[LoadsScreen] NL parse error', e, { ms: tErr - t0 });
    }
  }, [AI_NL_SEARCH_ENABLED, nlQuery, filters, setRadiusMiles]);

  const summaryLine = useMemo(() => {
    const parts: string[] = [];
    const origin = String(filters.origin ?? '').trim();
    const destination = String(filters.destination ?? '').trim();
    if (origin || destination) {
      parts.push(`${origin || 'Anywhere'} → ${destination || 'Anywhere'}`);
    }
    const maxW = String(filters.maxWeight ?? '').trim();
    if (maxW) parts.push(`≤${maxW} lbs`);
    const minP = String(filters.minPrice ?? '').trim();
    if (minP) parts.push(`≥$${minP}`);
    const dateFrom = String((filters as any).dateFrom ?? '').trim();
    const dateTo = String((filters as any).dateTo ?? '').trim();
    if (dateFrom && dateTo && dateFrom === dateTo) parts.push('Today');
    else if (dateFrom || dateTo) parts.push(`${dateFrom || 'Any'}—${dateTo || 'Any'}`);
    const isNearest = String(filters.sort ?? 'Best') === 'Nearest';
    if (isNearest && hasLocationPerm) parts.push(`${radiusMiles ?? 50}mi`);
    return parts.join(' • ');
  }, [filters, hasLocationPerm, radiusMiles]);

  const onResetFilters = useCallback(async () => {
    const next: Record<string, unknown> = { sort: 'Best' };
    setFilters(next);
    await setSortOrder('Best' as any);
    await setRadiusMiles(50);
    setNlQuery('');
  }, [setFilters, setSortOrder, setRadiusMiles]);

  return (
    <>
      <View style={styles.container}>
        <FilterBar
          selectedVehicle={filters.vehicleType as VehicleType | undefined}
          showBackhaul={Boolean(filters.showBackhaul)}
          onVehicleSelect={handleVehicleSelect}
          onBackhaulToggle={handleBackhaulToggle}
          onOpenFilters={handleOpenFilters}
        />
        <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {AI_NL_SEARCH_ENABLED ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexGrow: 1 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  testID="aiSearchInput"
                  value={nlQuery}
                  onChangeText={setNlQuery}
                  placeholder={'Describe your load (e.g., “Dallas to ATL, ≥$800, ≤8k lbs”)'}
                  placeholderTextColor={theme.colors.gray}
                  returnKeyType="search"
                  onSubmitEditing={onSubmitNlSearch}
                  style={[styles.input]}
                  accessibilityLabel="Natural language search"
                />
              </View>
              <Text
                onPress={onSubmitNlSearch}
                accessibilityRole="button"
                testID="nlSearchSubmit"
                style={[styles.aiLink, { backgroundColor: theme.colors.primary }]}
              >
                Apply
              </Text>
            </View>
          ) : null}
          {AI_COPILOT_CHIPS_ENABLED ? (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Text onPress={() => void applyChip('highest')} style={[styles.aiLink, { backgroundColor: theme.colors.white, color: theme.colors.dark }]} accessibilityRole="button" testID="chipHighest">Highest $/mi</Text>
              <Text onPress={() => void applyChip('near')} style={[styles.aiLink, { backgroundColor: theme.colors.secondary }]} accessibilityRole="button" testID="chipNearMe">Near me</Text>
              <Text onPress={() => void applyChip('lightest')} style={[styles.aiLink, { backgroundColor: theme.colors.white, color: theme.colors.dark }]} accessibilityRole="button" testID="chipLightest">Lightest</Text>
              <Text onPress={() => void applyChip('new')} style={[styles.aiLink, { backgroundColor: theme.colors.primary }]} accessibilityRole="button" testID="chipNew">New Today</Text>
            </View>
          ) : null}
          {summaryLine ? (
            <Text style={styles.summaryText} numberOfLines={1} testID="labelAIFilterSummary">{summaryLine}</Text>
          ) : null}
          {summaryLine ? (
            <Text onPress={onResetFilters} style={styles.resetLink} accessibilityRole="button" testID="filtersReset">Reset</Text>
          ) : null}
          <Text onPress={() => router.push('/ai-loads')} style={styles.aiLink} accessibilityRole="button" testID="open-ai-loads">AI for Loads</Text>
          <Text onPress={() => router.push({ pathname: '/ai-loads', params: { backhaul: '1' } })} style={[styles.aiLink, { backgroundColor: theme.colors.primary }]} accessibilityRole="button" testID="open-ai-backhaul">AI Backhaul</Text>
          {SORT_DROPDOWN_ENABLED ? (
            <SortDropdown
              value={String(filters.sort ?? 'Best')}
              options={sortOptions}
              onChange={(next) => { setFilters({ ...filters, sort: next }); void setSortOrder(next as any); }}
            />
          ) : (
            <Text
              onPress={() => {
                const opts = sortOptions;
                const cur = String(filters.sort ?? 'Best');
                const idx = opts.indexOf(cur);
                const next = opts[(idx + 1) % opts.length];
                setFilters({ ...filters, sort: next });
              }}
              style={[styles.aiLink, { backgroundColor: theme.colors.white, color: theme.colors.dark }]}
              accessibilityRole="button"
              testID="loads-sort"
            >
              {String(filters.sort ?? 'Best')}
            </Text>
          )}
          {GEO_SORT_ENABLED && hasLocationPerm && String(filters.sort ?? 'Best') === 'Nearest' && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[25, 50, 100, 250].map((r) => (
                <Text
                  key={r}
                  onPress={() => { void setRadiusMiles(r); }}
                  style={[styles.aiLink, r === radiusMiles ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.white, color: theme.colors.dark }]}
                  accessibilityRole="button"
                  testID={r === 25 ? 'pillRadius25' : r === 50 ? 'pillRadius50' : r === 100 ? 'pillRadius100' : 'pillRadius250'}
                >
                  {r} mi
                </Text>
              ))}
            </View>
          )}
        </View>
        <FlatList
          data={aiOrder ? (
            (() => {
              const map = new Map(baseFiltered.map(l => [l.id, l] as const));
              const ordered: typeof baseFiltered = [];
              aiOrder.forEach(id => {
                const item = map.get(id);
                if (item) ordered.push(item);
              });
              baseFiltered.forEach(l => { if (!map.has(l.id) || (aiOrder.indexOf(l.id) === -1)) ordered.push(l); });
              return ordered;
            })()
          ) : baseFiltered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 10) + 88 }
          ]
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No loads found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
          getItemLayout={getItemLayout}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={true}
          testID="loads-flatlist"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  aiLink: {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.white,
    paddingHorizontal: 12,
    borderRadius: 10,
    textAlignVertical: 'center',
    textAlign: 'center',
    fontWeight: '800',
    overflow: 'hidden',
  },
  summaryText: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
    paddingHorizontal: 6,
  },
  resetLink: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: theme.colors.white,
    color: theme.colors.dark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    minWidth: 160,
    flexGrow: 1,
  },
});