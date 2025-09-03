import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadCard } from '@/components/LoadCard';
import { FilterBar } from '@/components/FilterBar';
import Screen from '@/src/ui/Screen';
import { font, moderateScale } from '@/src/ui/scale';

import { GEO_SORT_ENABLED, AI_NL_SEARCH_ENABLED, AI_RERANK_ENABLED, AI_COPILOT_CHIPS_ENABLED } from '@/constants/flags';
import { useSettings } from '@/hooks/useSettings';
import { theme } from '@/constants/theme';
import { VehicleType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { fetchAll, LoadItem } from '@/src/data';
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
  const [demoLoads, setDemoLoads] = useState<LoadItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const insets = useSafeAreaInsets();
  const TABBAR_FALLBACK = 88;

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
  }, [filters.sort, requestPermissionAsync, startWatching, stopWatching]);

  // Load demo data on mount
  useEffect(() => {
    const loadDemoData = async () => {
      try {
        const loads = await fetchAll();
        setDemoLoads(loads);
        setLastUpdated(new Date());
        console.log(`[LoadsScreen] Loaded ${loads.length} demo loads`);
      } catch (error) {
        console.error('[LoadsScreen] Failed to load demo data:', error);
        setDemoLoads([]);
      }
    };
    loadDemoData();
  }, []);

  useEffect(() => {
    if (!currentLoc) return;
    const map: Record<string, number> = {};
    // Note: Demo loads don't have lat/lng coordinates, so distance calculation is skipped
    setDistances(map);
  }, [currentLoc, haversineMiles]);

  const baseFiltered = useMemo(() => {
    let base = demoLoads.slice();
    const origin = String(filters.origin ?? '').toLowerCase();
    const destination = String(filters.destination ?? '').toLowerCase();
    const minW = parseInt(String(filters.minWeight ?? ''), 10);
    const minP = parseInt(String(filters.minPrice ?? ''), 10);
    const maxW = parseInt(String(filters.maxWeight ?? ''), 10);
    const truckType = String(filters.truckType ?? '').toLowerCase();
    const dateFrom = String((filters as any).dateFrom ?? '');
    const dateTo = String((filters as any).dateTo ?? '');

    if (origin) {
      base = base.filter(l => l.origin.toLowerCase().includes(origin));
    }
    if (destination) {
      base = base.filter(l => l.destination.toLowerCase().includes(destination));
    }
    if (!Number.isNaN(minW)) {
      base = base.filter(l => (l.weightLbs ?? 0) >= minW);
    }
    if (!Number.isNaN(minP)) {
      base = base.filter(l => (l.payUSD ?? 0) >= minP);
    }

    if (!Number.isNaN(maxW)) {
      base = base.filter(l => (l.weightLbs ?? 0) <= maxW);
    }
    if (truckType) {
      base = base.filter(l => (l.equipment ?? '').toLowerCase().includes(truckType));
    }
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      if (!Number.isNaN(fromTs)) base = base.filter(l => new Date(l.pickupDate).getTime() >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime();
      if (!Number.isNaN(toTs)) base = base.filter(l => new Date(l.pickupDate).getTime() <= toTs);
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
      list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } else if (sort === 'Highest $') {
      list.sort((a, b) => (b.payUSD ?? 0) - (a.payUSD ?? 0));
    } else if (sort === 'Lightest') {
      list.sort((a, b) => (a.weightLbs ?? 0) - (b.weightLbs ?? 0));
    }
    return list;
  }, [filters, currentLoc, distances, radiusMiles, demoLoads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const loads = await fetchAll();
      setDemoLoads(loads);
      setLastUpdated(new Date());
      console.log(`[LoadsScreen] Refreshed ${loads.length} demo loads`);
    } catch (error) {
      console.error('[LoadsScreen] Failed to refresh demo data:', error);
    } finally {
      setRefreshing(false);
    }
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

  const renderItem = useCallback(({ item }: { item: LoadItem }) => {
    // Convert LoadItem to Load format for LoadCard
    const loadForCard = {
      id: item.id,
      shipperId: 'demo',
      shipperName: 'Demo Shipper',
      origin: {
        address: '',
        city: item.origin.split(', ')[0] || item.origin,
        state: item.origin.split(', ')[1] || '',
        zipCode: '',
        lat: 0,
        lng: 0,
      },
      destination: {
        address: '',
        city: item.destination.split(', ')[0] || item.destination,
        state: item.destination.split(', ')[1] || '',
        zipCode: '',
        lat: 0,
        lng: 0,
      },
      distance: 0,
      weight: item.weightLbs || 0,
      vehicleType: (item.equipment?.toLowerCase().replace(' ', '-') || 'dry-van') as any,
      rate: item.payUSD || 0,
      ratePerMile: 0,
      pickupDate: new Date(item.pickupDate),
      deliveryDate: new Date(item.pickupDate),
      status: 'available' as const,
      description: item.title,
      special_requirements: [],
    };
    
    return (
      <View>
        <LoadCard load={loadForCard} onPress={() => handleLoadPress(item.id)} distanceMiles={distances[item.id]} />
        <View style={styles.sourceLabel}>
          <Text style={styles.sourceText}>Source: {item.source}</Text>
        </View>
      </View>
    );
  }, [handleLoadPress, distances]);

  const keyExtractor = useCallback((item: LoadItem) => item.id, []);

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
    <Screen>
      <View style={styles.container}>
        {lastUpdated && (
          <View style={styles.updatedHeader}>
            <Text style={styles.updatedText}>
              Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} minutes ago
            </Text>
          </View>
        )}
        
        <FilterBar
          selectedVehicle={filters.truckType as any}
          showBackhaul={!!filters.showBackhaul}
          onVehicleSelect={handleVehicleSelect}
          onBackhaulToggle={handleBackhaulToggle}
          onOpenFilters={handleOpenFilters}
          onApplyChip={applyChip}
          onOpenAiLoads={() => router.push('/ai-loads')}
          onOpenAiBackhaul={() => router.push('/ai-loads')}
          currentSort={String(filters.sort ?? 'Best')}
          hasLocationPerm={hasLocationPerm}
          radiusMiles={radiusMiles}
          onSetRadius={setRadiusMiles}
        />

        {summaryLine ? (
          <View style={{ paddingHorizontal: moderateScale(16), paddingBottom: moderateScale(8) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: moderateScale(4) }}>
              <Text style={styles.summaryText} numberOfLines={1} testID="labelAIFilterSummary">{summaryLine}</Text>
              <Text onPress={onResetFilters} style={styles.resetLink} accessibilityRole="button" testID="filtersReset">Reset</Text>
            </View>
          </View>
        ) : null}
        <FlatList
          data={baseFiltered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, moderateScale(10)) + TABBAR_FALLBACK + moderateScale(16) }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No loads available</Text>
              <Text style={styles.emptySubtext}>Pull to refresh or try adjusting your filters</Text>
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
    </Screen>
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
    paddingVertical: moderateScale(12),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: moderateScale(100),
  },
  emptyText: {
    fontSize: font(18),
    color: theme.colors.gray,
    marginBottom: moderateScale(8),
  },
  emptySubtext: {
    fontSize: font(14),
    color: theme.colors.gray,
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
    lineHeight: font(18),
    overflow: 'hidden',
  },
  summaryText: {
    color: theme.colors.gray,
    fontSize: font(14),
    paddingHorizontal: moderateScale(6),
  },
  resetLink: {
    color: theme.colors.primary,
    fontSize: font(14),
    textDecorationLine: 'underline',
  },
  updatedHeader: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  updatedText: {
    fontSize: font(12),
    color: theme.colors.gray,
    textAlign: 'center',
  },
  sourceLabel: {
    position: 'absolute',
    bottom: moderateScale(8),
    right: moderateScale(12),
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  sourceText: {
    fontSize: font(10),
    color: theme.colors.gray,
  },
  input: {
    backgroundColor: theme.colors.white,
    color: theme.colors.dark,
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    minWidth: moderateScale(160),
    flexGrow: 1,
  },
});