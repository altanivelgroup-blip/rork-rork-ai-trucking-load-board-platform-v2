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
import { SORT_DROPDOWN_ENABLED } from '@/constants/flags';
import { theme } from '@/constants/theme';
import { VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

export default function LoadsScreen() {
  console.log('[LoadsScreen] Rendering loads screen');
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; destination?: string; minWeight?: string; minPrice?: string; sort?: string }>();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filters, setFilters] = useState<any>({ sort: 'Best' });

  useEffect(() => {
    const initial: any = {};
    if (params.origin) initial.origin = String(params.origin);
    if (params.destination) initial.destination = String(params.destination);
    if (params.minWeight) initial.minWeight = String(params.minWeight);
    if (params.minPrice) initial.minPrice = String(params.minPrice);
    if (params.sort) initial.sort = String(params.sort);
    if (Object.keys(initial).length > 0) {
      setFilters((prev: any) => ({ ...prev, ...initial }));
      console.log('[LoadsScreen] Applied initial filters from params', initial);
    }
  }, [params.origin, params.destination, params.minWeight, params.minPrice, params.sort]);

  const filteredLoads = useMemo(() => {
    let list = mockLoads.slice();
    const origin = (filters.origin ?? '').toLowerCase();
    const destination = (filters.destination ?? '').toLowerCase();
    const minW = parseInt(filters.minWeight ?? '', 10);
    const minP = parseInt(filters.minPrice ?? '', 10);

    if (origin) {
      list = list.filter(l => `${l.origin?.city ?? ''}, ${l.origin?.state ?? ''}`.toLowerCase().includes(origin));
    }
    if (destination) {
      list = list.filter(l => `${l.destination?.city ?? ''}, ${l.destination?.state ?? ''}`.toLowerCase().includes(destination));
    }
    if (!Number.isNaN(minW)) {
      list = list.filter(l => (l.weight ?? 0) >= minW);
    }
    if (!Number.isNaN(minP)) {
      list = list.filter(l => (l.rate ?? 0) >= minP);
    }

    const sort = String(filters.sort ?? 'Best');
    if (sort === 'Newest') {
      list.sort((a, b) => new Date(b.pickupDate ?? 0).getTime() - new Date(a.pickupDate ?? 0).getTime());
    } else if (sort === 'Highest $') {
      list.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    } else if (sort === 'Lightest') {
      list.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
    }
    return list;
  }, [filters]);

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

  const renderItem = useCallback(({ item }: { item: typeof filteredLoads[number] }) => (
    <LoadCard load={item} onPress={() => handleLoadPress(item.id)} />
  ), [handleLoadPress, filteredLoads]);

  const keyExtractor = useCallback((item: typeof filteredLoads[number]) => item.id, []);

  const getItemLayout = useCallback((_: unknown, index: number) => {
    const ITEM_HEIGHT = 188;
    const SEPARATOR_HEIGHT = 8;
    const length = ITEM_HEIGHT;
    const offset = (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index;
    return { length, offset, index };
  }, []);

  return (
    <>
      <View style={styles.container}>
        <FilterBar
          selectedVehicle={filters.vehicleType}
          showBackhaul={filters.showBackhaul}
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
              options={['Best', 'Newest', 'Highest $', 'Lightest']}
              onChange={(next) => setFilters({ ...filters, sort: next })}
              testID="loads-sort"
            />
          ) : (
            <Text
              onPress={() => {
                const opts = ['Best', 'Newest', 'Highest $', 'Lightest'];
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
