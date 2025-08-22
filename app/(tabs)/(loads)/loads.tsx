import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LoadCard } from '@/components/LoadCard';
import { FilterBar } from '@/components/FilterBar';
import { theme } from '@/constants/theme';
import { VehicleType } from '@/types';
import { mockLoads } from '@/mocks/loads';

export default function LoadsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filters, setFilters] = useState<any>({});

  const filteredLoads = useMemo(() => mockLoads, []);

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
  ), [handleLoadPress]);

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
      
      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, flexDirection: 'row', gap: 8 }}>
        <Text onPress={() => router.push('/ai-loads')} style={styles.aiLink} accessibilityRole="button" testID="open-ai-loads">AI for Loads</Text>
        <Text onPress={() => router.push({ pathname: '/ai-loads', params: { backhaul: '1' } })} style={[styles.aiLink, { backgroundColor: theme.colors.primary }]} accessibilityRole="button" testID="open-ai-backhaul">AI Backhaul</Text>
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