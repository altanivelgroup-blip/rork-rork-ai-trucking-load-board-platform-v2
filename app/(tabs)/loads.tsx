import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { DollarSign, Filter, Phone, Mail, Plus, X } from 'lucide-react-native';
import { useLoads } from '@/hooks/useLoads';
import { useToast } from '@/components/Toast';
import { LoadsFiltersModal } from '@/components/LoadsFiltersModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoadsScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { filteredLoads, isLoading, refreshLoads, filters, setFilters } = useLoads();
  
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<string[]>([]);
  const [showBulkOnly, setShowBulkOnly] = useState<boolean>(false);
  const [showLastImportOnly, setShowLastImportOnly] = useState<boolean>(false);
  const [lastBulkImportId, setLastBulkImportId] = useState<string | null>(null);
  
  const equipmentTypes = ['Backhaul', 'Flatbed', 'Reefer', 'Box Truck', 'Car Hauler', 'Enclosed Trailer'];
  const sortingOptions = ['Highest $/mi', 'Near me', 'Lightest', 'New Today', 'AI for Loads', 'AI Backhaul'];
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('Backhaul');
  const [selectedSortOptions, setSelectedSortOptions] = useState<string[]>(['Near me', 'New Today', 'AI for Loads', 'AI Backhaul']);

  
  const loads = useMemo(() => {
    let filtered = filteredLoads;
    
    // Apply bulk filter if enabled
    if (showBulkOnly) {
      filtered = filtered.filter(load => load.bulkImportId);
    }
    
    // Apply last import filter if enabled
    if (showLastImportOnly && lastBulkImportId) {
      filtered = filtered.filter(load => load.bulkImportId === lastBulkImportId);
    }
    
    return filtered;
  }, [filteredLoads, showBulkOnly, showLastImportOnly, lastBulkImportId]);
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  const handleOpenFilters = useCallback(() => {
    setShowFiltersModal(true);
  }, []);
  
  const handleApplyFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, [setFilters]);
  
  const handleEquipmentTypeSelect = useCallback((type: string) => {
    setSelectedEquipmentType(type);
  }, []);
  
  const handleSortOptionToggle = useCallback((option: string) => {
    if (selectedSortOptions.includes(option)) {
      setSelectedSortOptions(prev => prev.filter(o => o !== option));
    } else {
      setSelectedSortOptions(prev => [...prev, option]);
    }
  }, [selectedSortOptions]);
  
  const handlePostLoad = useCallback(() => {
    router.push('/post-load');
  }, [router]);
  
  const handleCall = useCallback((phone: string) => {
    if (phone) {
      const phoneUrl = `tel:${phone}`;
      Linking.openURL(phoneUrl).catch(err => {
        console.warn('Failed to open phone app:', err);
      });
    }
  }, []);
  
  const handleEmail = useCallback((email: string) => {
    if (email) {
      const emailUrl = `mailto:${email}`;
      Linking.openURL(emailUrl).catch(err => {
        console.warn('Failed to open email app:', err);
      });
    }
  }, []);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLoads();
    } catch {
      show('Failed to refresh loads', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshLoads, show]);
  
  const handleOpenAiLoads = () => {
    router.push('/ai-loads');
  };
  
  // Load last bulk import ID on component mount
  useEffect(() => {
    const loadLastBulkImportId = async () => {
      try {
        const storedId = await AsyncStorage.getItem('lastBulkImportId');
        if (storedId) {
          setLastBulkImportId(storedId);
        }
      } catch (error) {
        console.warn('Failed to load last bulk import ID:', error);
      }
    };
    
    loadLastBulkImportId();
  }, []);
  
  return (
    <>
      <Stack.Screen options={{ title: 'Available Loads' }} />
      <View style={styles.container}>
        {/* Header Controls */}
        <View style={styles.headerControls}>

          
          {/* Equipment Type Filters */}
          <View style={styles.equipmentFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentFiltersContent}>
              {/* Bulk Filter Chip */}
              <TouchableOpacity
                style={[
                  styles.equipmentFilterChip,
                  styles.bulkFilterChip,
                  showBulkOnly && styles.bulkFilterChipActive
                ]}
                onPress={() => {
                  setShowBulkOnly(!showBulkOnly);
                  if (showLastImportOnly) setShowLastImportOnly(false);
                }}
              >
                <Text style={[
                  styles.equipmentFilterText,
                  styles.bulkFilterText,
                  showBulkOnly && styles.equipmentFilterTextActive
                ]}>
                  Bulk Import
                </Text>
                {showBulkOnly && (
                  <X size={14} color={theme.colors.white} />
                )}
              </TouchableOpacity>
              
              {/* Source: Bulk (last import) Filter Chip */}
              <TouchableOpacity
                style={[
                  styles.equipmentFilterChip,
                  styles.lastImportFilterChip,
                  showLastImportOnly && styles.lastImportFilterChipActive,
                  !lastBulkImportId && styles.lastImportFilterChipDisabled
                ]}
                onPress={() => {
                  if (lastBulkImportId) {
                    setShowLastImportOnly(!showLastImportOnly);
                    if (showBulkOnly) setShowBulkOnly(false);
                  }
                }}
                disabled={!lastBulkImportId}
              >
                <Text style={[
                  styles.equipmentFilterText,
                  styles.lastImportFilterText,
                  showLastImportOnly && styles.equipmentFilterTextActive,
                  !lastBulkImportId && styles.lastImportFilterTextDisabled
                ]}>
                  Source: Bulk (last import)
                </Text>
                {showLastImportOnly && lastBulkImportId && (
                  <X size={14} color={theme.colors.white} />
                )}
              </TouchableOpacity>
              
              {equipmentTypes.map((type) => {
                const isSelected = selectedEquipmentType === type;
                const isBackhaul = type === 'Backhaul';
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.equipmentFilterChip,
                      isSelected && styles.equipmentFilterChipActive,
                      isBackhaul && isSelected && { backgroundColor: '#FF6B35' }
                    ]}
                    onPress={() => handleEquipmentTypeSelect(type)}
                  >
                    <Text style={[
                      styles.equipmentFilterText,
                      isSelected && styles.equipmentFilterTextActive
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          
          {/* Sorting Options */}
          <View style={styles.sortingSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortingContent}>
              {sortingOptions.map((option) => {
                const isSelected = selectedSortOptions.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.sortingChip,
                      isSelected && styles.sortingChipActive
                    ]}
                    onPress={() => handleSortOptionToggle(option)}
                  >
                    <Text style={[
                      styles.sortingText,
                      isSelected && styles.sortingTextActive
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          

        </View>
        
        <Text style={styles.debugBanner}>debug: {loads.length} loads</Text>
        
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading loads...</Text>
            </View>
          ) : loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No active loads match your filters</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters or check back later</Text>
            </View>
          ) : (
            loads.map((load: any) => {
              const originText = typeof load.origin === 'string'
                ? load.origin
                : `${load.origin?.city ?? ''}, ${load.origin?.state ?? ''}`;
              
              const destText = typeof load.destination === 'string'
                ? load.destination
                : `${load.destination?.city ?? ''}, ${load.destination?.state ?? ''}`;
              
              const rateVal = load.rate ?? 0;
              const weightVal = load.weight ?? 0;
              
              return (
                <View
                  key={load.id}
                  style={styles.loadCard}
                  testID={`load-${load.id}`}
                >
                  <TouchableOpacity
                    style={styles.loadContent}
                    onPress={() => handleLoadPress(load.id)}
                  >
                    <View style={styles.loadHeader}>
                      <Text style={styles.loadTitle} numberOfLines={1}>
                        {originText} → {destText}
                      </Text>
                      <View style={styles.rateChip}>
                        <DollarSign size={16} color={theme.colors.white} />
                        <Text style={styles.rateText}>${rateVal.toLocaleString()}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.loadSubtitle}>
                      <Text style={styles.subtitleText}>
                        {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'ASAP'} • {load.vehicleType || 'truck'} • {weightVal.toLocaleString()} lbs
                      </Text>
                      {load.bulkImportId && (
                        <View style={styles.bulkBadge}>
                          <Text style={styles.bulkBadgeText}>Bulk</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* Action buttons */}
                  <View style={styles.loadActions}>
                    {load.shipperName && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleCall('555-0123')}
                        testID={`call-${load.id}`}
                      >
                        <Phone size={16} color={theme.colors.primary} />
                        <Text style={styles.actionButtonText}>Call</Text>
                      </TouchableOpacity>
                    )}
                    {load.shipperName && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEmail('contact@example.com')}
                        testID={`email-${load.id}`}
                      >
                        <Mail size={16} color={theme.colors.primary} />
                        <Text style={styles.actionButtonText}>Email</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        
        {showFiltersModal && (
          <LoadsFiltersModal
            visible={showFiltersModal}
            onClose={() => setShowFiltersModal(false)}
            filters={filters as any}
            onApplyFilters={handleApplyFilters}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  headerControls: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },

  equipmentFilters: {
    marginBottom: theme.spacing.md,
  },
  equipmentFiltersContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  equipmentFilterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  equipmentFilterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  equipmentFilterText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  equipmentFilterTextActive: {
    color: theme.colors.white,
  },
  sortingSection: {
    marginBottom: theme.spacing.md,
  },
  sortingContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  sortingChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  sortingChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortingText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  sortingTextActive: {
    color: theme.colors.white,
  },

  debugBanner: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.lightGray,
  },

  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
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
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadContent: {
    padding: theme.spacing.lg,
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
  loadSubtitle: {
    marginTop: theme.spacing.sm,
  },
  subtitleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  loadActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    paddingTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  postButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  bulkFilterChip: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  bulkFilterChipActive: {
    backgroundColor: '#c2410c',
    borderColor: '#c2410c',
  },
  bulkFilterText: {
    color: theme.colors.white,
  },
  bulkBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  bulkBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.white,
  },
  lastImportFilterChip: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  lastImportFilterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  lastImportFilterText: {
    color: theme.colors.white,
  },
  lastImportFilterChipDisabled: {
    backgroundColor: theme.colors.gray,
    borderColor: theme.colors.gray,
    opacity: 0.5,
  },
  lastImportFilterTextDisabled: {
    color: theme.colors.white,
    opacity: 0.7,
  },

});