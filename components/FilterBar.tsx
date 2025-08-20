import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Filter, X, LocateFixed } from 'lucide-react-native';
import { VehicleType } from '@/types';
import { theme } from '@/constants/theme';

interface FilterBarProps {
  selectedVehicle?: VehicleType;
  showBackhaul?: boolean;
  onVehicleSelect: (vehicle?: VehicleType) => void;
  onBackhaulToggle: () => void;
  onOpenFilters: () => void;
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
}) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <TouchableOpacity style={styles.filterButton} onPress={onOpenFilters} testID="open-filters">
          <Filter size={16} color={theme.colors.primary} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>

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
  );
};

FilterBarComponent.displayName = 'FilterBar';

export const FilterBar = React.memo<React.FC<FilterBarProps>>(FilterBarComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  scroll: {
    paddingHorizontal: theme.spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  filterButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.lightGray,
    marginRight: theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.sm,
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