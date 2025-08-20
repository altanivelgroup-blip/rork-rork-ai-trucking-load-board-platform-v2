import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LoadCard } from '@/components/LoadCard';
import { FilterBar } from '@/components/FilterBar';
import { useLoads } from '@/hooks/useLoads';
import { theme } from '@/constants/theme';
import { VehicleType } from '@/types';

import { VoiceCapture } from '@/components/VoiceCapture';
import SkeletonLoadCard from '@/components/SkeletonLoadCard';

import { useToast } from '@/components/Toast';
import useOnlineStatus from '@/hooks/useOnlineStatus';

export default function LoadsScreen() {
  const router = useRouter();
  const { filteredLoads, filters, setFilters, refreshLoads, isLoading, currentLoad } = useLoads();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { online } = useOnlineStatus();
  const { show } = useToast();
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRefresh = async () => {
    if (!online) {
      show('You are offline. Showing cached loads.', 'warning', 2500);
    }
    setRefreshing(true);
    await refreshLoads();
    setRefreshing(false);
  };

  const handleVehicleSelect = (vehicle?: VehicleType) => {
    setFilters({ ...filters, vehicleType: vehicle });
  };

  const handleBackhaulToggle = () => {
    const enabling = !filters.showBackhaul;
    if (enabling && currentLoad?.destination) {
      setFilters({
        ...filters,
        showBackhaul: true,
        backhaulCenter: { lat: currentLoad.destination.lat, lng: currentLoad.destination.lng },
        backhaulRadiusMiles: filters.backhaulRadiusMiles ?? 50,
      });
    } else {
      setFilters({ ...filters, showBackhaul: !filters.showBackhaul });
    }
  };

  const handleOpenFilters = () => {
    console.log('Open filters modal');
  };

  const onVoiceToFilters = useCallback((text: string) => {
    try {
      console.log('[Loads] Voice text', text);
      const lower = text.toLowerCase();
      const veh: Record<string, VehicleType> = {
        'flatbed': 'flatbed',
        'reefer': 'reefer',
        'box truck': 'box-truck',
        'boxtruck': 'box-truck',
        'cargo van': 'cargo-van',
        'car hauler': 'car-hauler',
        'enclosed': 'enclosed-trailer',
        'trailer': 'trailer',
        'truck': 'truck',
      };
      let vehicle: VehicleType | undefined = undefined;
      Object.keys(veh).forEach((k) => { if (lower.includes(k)) vehicle = veh[k]; });
      const minRateMatch = lower.match(/\$(\d{2,5})|rate\s*(\d{2,5})|over\s*(\d{2,5})/);
      const minRate = minRateMatch ? Number(minRateMatch[1] || minRateMatch[2] || minRateMatch[3]) : undefined;
      setFilters({
        ...filters,
        vehicleType: vehicle ?? filters.vehicleType,
        minRate: minRate ?? filters.minRate,
      });
    } catch (e) {
      console.log('[Loads] onVoiceToFilters error', e);
    }
  }, [filters, setFilters]);

  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };

  const showSkeletons = useMemo(() => isLoading && filteredLoads.length === 0, [isLoading, filteredLoads.length]);

  useEffect(() => {
    if (isLoading) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        if (isLoading) {
          show('Network seems slow. Still loading…', 'info', 2000);
        }
      }, 1500);
    } else if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    return () => { if (slowTimerRef.current) { clearTimeout(slowTimerRef.current); slowTimerRef.current = null; } };
  }, [isLoading, show]);

  if (showSkeletons) {
    return (
      <View style={styles.container}>
        {[...Array(5)].map((_, i) => (
          <SkeletonLoadCard key={`skeleton-${i}`} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterBar
        selectedVehicle={filters.vehicleType}
        showBackhaul={filters.showBackhaul}
        onVehicleSelect={handleVehicleSelect}
        onBackhaulToggle={handleBackhaulToggle}
        onOpenFilters={handleOpenFilters}
      />
      
      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, flexDirection: 'row', gap: 8 }}>
        <VoiceCapture onTranscribed={onVoiceToFilters} size="sm" label="Voice Search" testID="loads-voice" />
        <Text onPress={() => router.push('/ai-loads')} style={styles.aiLink} accessibilityRole="button" testID="open-ai-loads">AI for Loads</Text>
        <Text onPress={() => router.push({ pathname: '/ai-loads', params: { backhaul: '1' } })} style={[styles.aiLink, { backgroundColor: theme.colors.primary }]} accessibilityRole="button" testID="open-ai-backhaul">AI Backhaul</Text>
      </View>
      <FlatList
        data={filteredLoads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoadCard load={item} onPress={() => handleLoadPress(item.id)} />
        )}
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
        testID="loads-flatlist"
      />
    </View>
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