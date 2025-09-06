import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { MapPin, Calendar, Package, DollarSign } from 'lucide-react-native';
import { FilterBar } from '@/components/FilterBar';
import { VehicleType } from '@/types';
import { useLoads } from '@/hooks/useLoads';

export default function LoadsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Read live loads and normalize field names so filters/UI work
const rawLoads = useLoads();

const normalizedLoads = useMemo(() => {
  return (rawLoads ?? []).map((l: any) => ({
    ...l,
    // Your docs use 'pickup' / 'delivery' strings
    origin: typeof l.origin !== 'undefined' ? l.origin : l.pickup,
    destination: typeof l.destination !== 'undefined' ? l.destination : l.delivery,
    // Your docs use 'rateAmount' and 'weight'
    rate: typeof l.rate !== 'undefined' ? l.rate : l.rateAmount,
    weightLbs: typeof l.weightLbs !== 'undefined' ? l.weightLbs : l.weight,
    photos: l.photos ?? l.photoUrls,
  }));
}, [rawLoads]);

  // Filter states
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | undefined>();
  const [showBackhaul, setShowBackhaul] = useState<boolean>(false);
  const [currentSort, setCurrentSort] = useState<string>('Best');
  const [hasLocationPerm, setHasLocationPerm] = useState<boolean>(false);
  const [radiusMiles, setRadiusMiles] = useState<number>(50);
  const [geoFencingActive, setGeoFencingActive] = useState<boolean>(false);
  
  const loads = useMemo(() => {
    let filtered = mockLoads;
    

    // Apply vehicle type filter
    if (selectedVehicle) {
      filtered = filtered.filter(load => load.vehicleType === selectedVehicle);
    }
    
    // Apply backhaul filter
    if (showBackhaul) {
      filtered = filtered.filter(load => load.isBackhaul === true);
    }
    
    // Apply params filters
    if (params.origin && typeof params.origin === 'string') {
      const originFilter = params.origin.toLowerCase();
      filtered = filtered.filter(load => 
        load.origin?.city?.toLowerCase().includes(originFilter) ||
        load.origin?.state?.toLowerCase().includes(originFilter)
      );
    }
    
    if (params.destination && typeof params.destination === 'string') {
      const destinationFilter = params.destination.toLowerCase();
      filtered = filtered.filter(load => 
        load.destination?.city?.toLowerCase().includes(destinationFilter) ||
        load.destination?.state?.toLowerCase().includes(destinationFilter)
      );
    }
    
    if (params.minWeight && typeof params.minWeight === 'string') {
      const minWeight = parseInt(params.minWeight);
      if (!isNaN(minWeight)) {
        filtered = filtered.filter(load => (load.weight || 0) >= minWeight);
      }
    }
    
    if (params.minPrice && typeof params.minPrice === 'string') {
      const minPrice = parseInt(params.minPrice);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(load => (load.rate || 0) >= minPrice);
      }
    }
    
    // Apply sorting
    if (currentSort === 'Highest $') {
      filtered = filtered.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    } else if (currentSort === 'Lightest') {
      filtered = filtered.sort((a, b) => (a.weight || 0) - (b.weight || 0));
    } else if (currentSort === 'Nearest') {
      filtered = filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return filtered;
  }, [params, selectedVehicle, showBackhaul, currentSort]);
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  const handleVehicleSelect = (vehicle?: VehicleType) => {
    setSelectedVehicle(vehicle);
  };
  
  const handleBackhaulToggle = () => {
    setShowBackhaul(!showBackhaul);
  };
  
  const handleOpenFilters = () => {
    console.log('Open filters modal');
  };
  
  const handleApplyChip = (chip: 'highest' | 'near' | 'lightest' | 'new') => {
    switch (chip) {
      case 'highest':
        setCurrentSort('Highest $');
        break;
      case 'near':
        setCurrentSort('Nearest');
        break;
      case 'lightest':
        setCurrentSort('Lightest');
        break;
      case 'new':
        setCurrentSort('New Today');
        break;
    }
  };
  
  const handleOpenAiLoads = () => {
    router.push('/ai-loads');
  };
  
  const handleOpenAiBackhaul = () => {
    console.log('Open AI Backhaul');
  };
  
  const handleSetRadius = (radius: number) => {
    setRadiusMiles(radius);
  };
  
  const handleOpenGeoFencing = () => {
    setGeoFencingActive(!geoFencingActive);
  };
  
  return (
    <>
      <Stack.Screen options={{ title: 'Available Loads' }} />
      <View style={styles.container}>

        {/* Filter Bars */}
        <FilterBar
          selectedVehicle={selectedVehicle}
          showBackhaul={showBackhaul}
          onVehicleSelect={handleVehicleSelect}
          onBackhaulToggle={handleBackhaulToggle}
          onOpenFilters={handleOpenFilters}
          onApplyChip={handleApplyChip}
          onOpenAiLoads={handleOpenAiLoads}
          onOpenAiBackhaul={handleOpenAiBackhaul}
          currentSort={currentSort}
          hasLocationPerm={hasLocationPerm}
          radiusMiles={radiusMiles}
          onSetRadius={handleSetRadius}
          onOpenGeoFencing={handleOpenGeoFencing}
          geoFencingActive={geoFencingActive}
        />
        
        <ScrollView contentContainerStyle={styles.content}>
          {loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No loads found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters or check back later</Text>
            </View>
          ) : (
            loads.map((load) => (
              <TouchableOpacity
                key={load.id}
                style={styles.loadCard}
                onPress={() => handleLoadPress(load.id)}
                testID={`load-${load.id}`}
              >
                <View style={styles.loadHeader}>
                  <Text style={styles.loadTitle} numberOfLines={1}>
                    {load.origin?.city}, {load.origin?.state} → {load.destination?.city}, {load.destination?.state}
                  </Text>
                  <View style={styles.rateChip}>
                    <DollarSign size={16} color={theme.colors.white} />
                    <Text style={styles.rateText}>${load.rate?.toLocaleString() || '0'}</Text>
                  </View>
                </View>
                
                <View style={styles.loadDetails}>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={theme.colors.gray} />
                    <Text style={styles.detailText}>{load.distance || 0} miles</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Calendar size={16} color={theme.colors.gray} />
                    <Text style={styles.detailText}>
                      Pickup: {new Date(load.pickupDate || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Package size={16} color={theme.colors.gray} />
                    <Text style={styles.detailText}>{load.weight?.toLocaleString() || '0'} lbs</Text>
                  </View>
                </View>
                
                {load.description && (
                  <Text style={styles.loadDescription} numberOfLines={2}>
                    {load.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },

  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  loadCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  loadTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginRight: theme.spacing.sm,
  },
  rateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  rateText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  loadDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    lineHeight: 20,
  },
});