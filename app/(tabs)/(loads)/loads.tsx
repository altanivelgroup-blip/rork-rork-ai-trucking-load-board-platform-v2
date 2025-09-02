import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadCard } from '@/components/LoadCard';
import { FilterBar } from '@/components/FilterBar';
import { SortDropdown } from '@/components/SortDropdown';
import { SORT_DROPDOWN_ENABLED, GEO_SORT_ENABLED } from '@/constants/flags';
import { useSettings } from '@/hooks/useSettings';
import { theme } from '@/constants/theme';
import { VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';

export default function LoadsScreen() {
  console.log('[LoadsScreen] Rendering loads screen');
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; destination?: string; minWeight?: string; minPrice?: string; sort?: string; radius?: string }>();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { sortOrder, setSortOrder, radiusMiles, setRadiusMiles } = useSettings();
  const [filters, setFilters] = useState<Record<string, unknown>>({ sort: sortOrder });
  const { startWatching, stopWatching, requestPermissionAsync, getForegroundPermissionStatusAsync } = useLiveLocation();
  const [currentLoc, setCurrentLoc] = useState<GeoCoords | null>(null);
  const [hasLocationPerm, setHasLocationPerm] = useState<boolean>(false);
  const [distances, setDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, unknown> = {};
    if (params.origin) initial.origin = String(params.origin);
    if (params.destination) initial.destination = String(params.destination);
    if (params.minWeight) initial.minWeight = String(params.minWeight);
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

  const filteredLoads = useMemo(() => {
    let base = mockLoads.slice();
    const origin = String(filters.origin ?? '').toLowerCase();
    const destination = String(filters.destination ?? '').toLowerCase();
    const minW = parseInt(String(filters.minWeight ?? ''), 10);
    const minP = parseInt(String(filters.minPrice ?? ''), 10);

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

  const handleLoadPress = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: (typeof filteredLoads)[number] }) => (
    <LoadCard load={item} onPress={() => handleLoadPress(item.id)} distanceMiles={distances[item.id]} />
  ), [handleLoadPress, filteredLoads, distances]);

  const keyExtractor = useCallback((item: (typeof filteredLoads)[number]) => item.id, []);

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
          data={filteredLoads}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
});
