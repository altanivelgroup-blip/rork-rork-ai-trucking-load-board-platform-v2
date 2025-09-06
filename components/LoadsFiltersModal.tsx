import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { X, Filter, Calendar } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoadFilters {
  equipmentTypes: string[];
  maxWeightLbs?: number;
  pickupFrom?: string;
  sortBy: 'createdAt' | 'pickupDate';
}

interface LoadsFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: LoadFilters;
  onApplyFilters: (filters: LoadFilters) => void;
}

const EQUIPMENT_TYPES = [
  { key: 'hotshot', label: 'Hotshot' },
  { key: 'box_truck', label: 'Box Truck' },
  { key: 'cargo_van', label: 'Cargo Van' },
  { key: 'flatbed', label: 'Flatbed' },
  { key: 'stepdeck', label: 'Step Deck' },
];

const FILTERS_STORAGE_KEY = 'loads_filters';

export function LoadsFiltersModal({ visible, onClose, filters, onApplyFilters }: LoadsFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<LoadFilters>(filters);
  const [maxWeightInput, setMaxWeightInput] = useState<string>(
    filters.maxWeightLbs ? filters.maxWeightLbs.toString() : ''
  );

  // Update local state when filters prop changes
  useEffect(() => {
    setLocalFilters(filters);
    setMaxWeightInput(filters.maxWeightLbs ? filters.maxWeightLbs.toString() : '');
  }, [filters]);

  const handleEquipmentToggle = useCallback((equipmentType: string) => {
    setLocalFilters(prev => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.includes(equipmentType)
        ? prev.equipmentTypes.filter(t => t !== equipmentType)
        : [...prev.equipmentTypes, equipmentType]
    }));
  }, []);

  const handleMaxWeightChange = useCallback((text: string) => {
    setMaxWeightInput(text);
    const weight = parseInt(text.replace(/[^0-9]/g, ''), 10);
    setLocalFilters(prev => ({
      ...prev,
      maxWeightLbs: isNaN(weight) ? undefined : weight
    }));
  }, []);

  const handlePickupFromChange = useCallback((text: string) => {
    setLocalFilters(prev => ({
      ...prev,
      pickupFrom: text.trim() || undefined
    }));
  }, []);

  const handleSortChange = useCallback((sortBy: 'createdAt' | 'pickupDate') => {
    setLocalFilters(prev => ({
      ...prev,
      sortBy
    }));
  }, []);

  const handleApply = useCallback(async () => {
    try {
      // Persist filters to AsyncStorage
      await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(localFilters));
    } catch (error) {
      console.warn('Failed to save filters to storage:', error);
    }
    onApplyFilters(localFilters);
    onClose();
  }, [localFilters, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    const resetFilters: LoadFilters = {
      equipmentTypes: [],
      sortBy: 'createdAt'
    };
    setLocalFilters(resetFilters);
    setMaxWeightInput('');
  }, []);



  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Filter size={24} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>Filter Loads</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.gray} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Equipment Type Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment Type</Text>
            <View style={styles.equipmentGrid}>
              {EQUIPMENT_TYPES.map(({ key, label }) => {
                const isSelected = localFilters.equipmentTypes.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.equipmentChip, isSelected && styles.equipmentChipSelected]}
                    onPress={() => handleEquipmentToggle(key)}
                    testID={`equipment-${key}`}
                  >
                    <Text style={[styles.equipmentChipText, isSelected && styles.equipmentChipTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Max Weight Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Max Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10000"
              placeholderTextColor={theme.colors.gray}
              value={maxWeightInput}
              onChangeText={handleMaxWeightChange}
              keyboardType="numeric"
              testID="max-weight-input"
            />
          </View>

          {/* Pickup Location Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              placeholder="City or state name"
              placeholderTextColor={theme.colors.gray}
              value={localFilters.pickupFrom || ''}
              onChangeText={handlePickupFromChange}
              autoCapitalize="words"
              testID="pickup-location-input"
            />
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              <TouchableOpacity
                style={[styles.sortOption, localFilters.sortBy === 'createdAt' && styles.sortOptionSelected]}
                onPress={() => handleSortChange('createdAt')}
                testID="sort-newest"
              >
                <Text style={[styles.sortOptionText, localFilters.sortBy === 'createdAt' && styles.sortOptionTextSelected]}>
                  Newest First
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, localFilters.sortBy === 'pickupDate' && styles.sortOptionSelected]}
                onPress={() => handleSortChange('pickupDate')}
                testID="sort-pickup-date"
              >
                <Calendar size={16} color={localFilters.sortBy === 'pickupDate' ? theme.colors.white : theme.colors.gray} />
                <Text style={[styles.sortOptionText, localFilters.sortBy === 'pickupDate' && styles.sortOptionTextSelected]}>
                  Pickup Date
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Filters are applied client-side to loaded data. Only loads with pickup date ≥ today will be shown.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Helper function to load filters from storage
export async function loadFiltersFromStorage(): Promise<LoadFilters> {
  try {
    const stored = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LoadFilters;
      return {
        equipmentTypes: Array.isArray(parsed.equipmentTypes) ? parsed.equipmentTypes : [],
        maxWeightLbs: typeof parsed.maxWeightLbs === 'number' ? parsed.maxWeightLbs : undefined,
        pickupFrom: typeof parsed.pickupFrom === 'string' ? parsed.pickupFrom : undefined,
        sortBy: parsed.sortBy === 'pickupDate' ? 'pickupDate' : 'createdAt'
      };
    }
  } catch (error) {
    console.warn('Failed to load filters from storage:', error);
  }
  
  return {
    equipmentTypes: [],
    sortBy: 'createdAt'
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    paddingTop: Platform.OS === 'ios' ? 60 : theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginVertical: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  equipmentChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  equipmentChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  equipmentChipText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  equipmentChipTextSelected: {
    color: theme.colors.white,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  sortOptions: {
    gap: theme.spacing.sm,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  sortOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortOptionText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  sortOptionTextSelected: {
    color: theme.colors.white,
  },
  infoSection: {
    marginVertical: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing.lg,
  },
  resetButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  applyButton: {
    flex: 2,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.white,
  },
});