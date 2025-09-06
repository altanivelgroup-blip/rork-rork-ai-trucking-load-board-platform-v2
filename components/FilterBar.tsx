import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { X, LocateFixed, MapPin } from 'lucide-react-native';
import { VehicleType } from '@/types';
import { theme } from '@/constants/theme';

interface FilterBarProps {
  selectedVehicle?: VehicleType;
  showBackhaul?: boolean;
  onVehicleSelect: (vehicle?: VehicleType) => void;
  onBackhaulToggle: () => void;
  onOpenFilters: () => void;
  // Top tab bar props
  onApplyChip?: (chip: 'highest' | 'near' | 'lightest' | 'new') => void;
  onOpenAiLoads?: () => void;
  onOpenAiBackhaul?: () => void;
  currentSort?: string;
  hasLocationPerm?: boolean;
  radiusMiles?: number;
  onSetRadius?: (radius: number) => void;
  onOpenGeoFencing?: () => void;
  geoFencingActive?: boolean;
}

const vehicleTypes: VehicleType[] = [
  'flatbed',
  'reefer',
  'box-truck',
  'car-hauler',
  'enclosed-trailer',
];

const FilterBarComponent: React.FC<FilterBarProps> = ({
  selectedVehicle,
  showBackhaul,
  onVehicleSelect,
  onBackhaulToggle,
  onOpenFilters,
  onApplyChip,
  onOpenAiLoads,
  onOpenAiBackhaul,
  currentSort,
  hasLocationPerm,
  radiusMiles,
  onSetRadius,
  onOpenGeoFencing,
  geoFencingActive,
}) => {
  return (
    <View>
      {/* Original Filter Bar - Now at Top */}
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          <TouchableOpacity
            style={[styles.chip, styles.backhaulChip, showBackhaul && styles.backhaulChipActive]}
            onPress={onBackhaulToggle}
            testID="backhaul-toggle"
          >
            <LocateFixed size={16} color={theme.colors.secondary} />
            <Text style={[styles.chipText, styles.backhaulChipText]}>
              Backhaul
            </Text>
          </TouchableOpacity>

          {vehicleTypes.map((vehicle) => (
            <TouchableOpacity
              key={vehicle}
              style={[styles.chip, selectedVehicle === vehicle && styles.chipActive]}
              onPress={() => onVehicleSelect(selectedVehicle === vehicle ? undefined : vehicle)}
              testID={`vehicle-chip-${vehicle}`}
            >
              <Text style={[styles.chipText, selectedVehicle === vehicle && styles.chipTextActive]}>
                {vehicle.replace('-', ' ')}
              </Text>
              {selectedVehicle === vehicle && (
                <X size={14} color={theme.colors.white} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Top Tab Bar - Now at Bottom */}
      <View style={styles.topTabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTabScroll}>
          <TouchableOpacity 
            style={[styles.topTab, currentSort === 'Highest $' && styles.topTabActive]} 
            onPress={() => onApplyChip?.('highest')}
            testID="chipHighest"
          >
            <Text style={[styles.topTabText, currentSort === 'Highest $' && styles.topTabTextActive]}>Highest $/mi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.topTab, styles.topTabNear, currentSort === 'Nearest' && styles.topTabActive]} 
            onPress={() => onApplyChip?.('near')}
            testID="chipNearMe"
          >
            <Text style={[styles.topTabText, styles.topTabNearText, currentSort === 'Nearest' && styles.topTabTextActive]}>Near me</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.topTab, currentSort === 'Lightest' && styles.topTabActive]} 
            onPress={() => onApplyChip?.('lightest')}
            testID="chipLightest"
          >
            <Text style={[styles.topTabText, currentSort === 'Lightest' && styles.topTabTextActive]}>Lightest</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.topTab, styles.topTabNew]} 
            onPress={() => onApplyChip?.('new')}
            testID="chipNew"
          >
            <Text style={[styles.topTabText, styles.topTabNewText]}>New Today</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.topTab, styles.topTabGeo, geoFencingActive && styles.topTabActive]} 
            onPress={onOpenGeoFencing}
            testID="open-geo-fencing"
          >
            <MapPin size={14} color={geoFencingActive ? theme.colors.white : theme.colors.white} />
            <Text style={[styles.topTabText, styles.topTabGeoText, geoFencingActive && styles.topTabTextActive]}>Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.topTab, styles.topTabAi]} 
            onPress={onOpenAiBackhaul}
            testID="open-ai-backhaul"
          >
            <Text style={[styles.topTabText, styles.topTabAiText]}>AI Backhaul</Text>
          </TouchableOpacity>
          
          {hasLocationPerm && currentSort === 'Nearest' && [25,50,100,250].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.topTab, r === radiusMiles && styles.topTabActive]}
              onPress={() => onSetRadius?.(r)}
              testID={r === 25 ? 'pillRadius25' : r === 50 ? 'pillRadius50' : r === 100 ? 'pillRadius100' : 'pillRadius250'}
            >
              <Text style={[styles.topTabText, r === radiusMiles && styles.topTabTextActive]}>{r} mi</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

FilterBarComponent.displayName = 'FilterBar';

export const FilterBar = React.memo<React.FC<FilterBarProps>>(FilterBarComponent);

const styles = StyleSheet.create({
  topTabContainer: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  topTabScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  topTab: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  topTabNear: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  topTabNew: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  topTabAi: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  topTabGeo: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topTabText: {
    color: theme.colors.dark,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  topTabTextActive: {
    color: theme.colors.white,
  },
  topTabNearText: {
    color: theme.colors.white,
  },
  topTabNewText: {
    color: theme.colors.white,
  },
  topTabAiText: {
    color: theme.colors.white,
  },
  topTabGeoText: {
    color: theme.colors.white,
  },
  container: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  scroll: {
    paddingHorizontal: theme.spacing.md,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.lightGray,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  backhaulChip: {
    backgroundColor: '#ea580c',
    borderWidth: 0,
    borderColor: '#ea580c',
  },
  backhaulChipActive: {
    backgroundColor: '#c2410c',
    borderWidth: 0,
  },
  backhaulChipText: {
    color: theme.colors.white,
  },
  backhaulChipTextActive: {
    color: theme.colors.white,
  },
});