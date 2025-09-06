import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { DollarSign, Filter, Phone, Mail, Search } from 'lucide-react-native';
import { useLoads } from '@/hooks/useLoads';
import { useToast } from '@/components/Toast';
import { LoadsFiltersModal } from '@/components/LoadsFiltersModal';

export default function LoadsScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { filteredLoads, isLoading, refreshLoads, filters, setFilters } = useLoads();
  
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<string[]>([]);
  
  const equipmentTypes = ['Backhaul', 'Flatbed', 'Reefer', 'Box Truck', 'Car Hauler', 'Enclosed Trailer'];
  
  const loads = filteredLoads;
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  const handleOpenFilters = useCallback(() => {
    setShowFiltersModal(true);
  }, []);
  
  const handleApplyFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, [setFilters]);
  
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
  
  return (
    <>
      <Stack.Screen options={{ title: 'Available Loads' }} />
      <View style={styles.container}>
        {/* Header Controls */}
        <View style={styles.headerControls}>
          {/* Equipment Type Filters */}
          <View style={styles.equipmentFilters}>
            <TouchableOpacity style={styles.filtersButton} onPress={handleOpenFilters}>
              <Filter size={16} color={theme.colors.primary} />
              <Text style={styles.filtersButtonText}>Filters</Text>
            </TouchableOpacity>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentScrollContent}>
              {equipmentTypes.map((type) => {
                const isSelected = selectedEquipmentTypes.includes(type);
                const isBackhaul = type === 'Backhaul';
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.equipmentChip,
                      isSelected && styles.equipmentChipActive,
                      isBackhaul && styles.backhaulChip
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedEquipmentTypes(prev => prev.filter(t => t !== type));
                      } else {
                        setSelectedEquipmentTypes(prev => [...prev, type]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.equipmentChipText,
                      isSelected && styles.equipmentChipTextActive,
                      isBackhaul && styles.backhaulChipText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={16} color={theme.colors.gray} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Describe your load (e.g., 'Dallas to ATL, ≥$800, 48k lbs')"
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor={theme.colors.gray}
              />
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={() => {
              // Apply search filter logic here
              console.log('Search applied:', searchText);
            }}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
          
          {/* Sort and AI Loads */}
          <View style={styles.bottomControls}>
            <View style={styles.sortControls}>
              <Text style={styles.sortLabel}>Highest $/mi</Text>
              <Text style={styles.sortLabel}>Near me</Text>
              <Text style={styles.sortLabel}>Lightest</Text>
              <Text style={styles.sortLabel}>New Today</Text>
              <TouchableOpacity style={styles.aiLoadsButton} onPress={handleOpenAiLoads}>
                <Text style={styles.aiLoadsButtonText}>AI for Loads</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiBackhaulButton}>
                <Text style={styles.aiBackhaulButtonText}>AI Backhaul</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sortByText}>Sort: Best</Text>
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
            loads.map((load) => {
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
  quickFilters: {
    marginBottom: theme.spacing.sm,
  },
  quickFiltersContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  quickFilterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  quickFilterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickFilterText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  quickFilterTextActive: {
    color: theme.colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
  },
  aiButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  aiButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
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

  // New styles for the restored UI
  equipmentFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  filtersButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  equipmentScrollContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  equipmentChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  equipmentChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  backhaulChip: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  equipmentChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  equipmentChipTextActive: {
    color: theme.colors.white,
  },
  backhaulChipText: {
    color: theme.colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  applyButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  applyButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sortLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  aiLoadsButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  aiLoadsButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  aiBackhaulButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.dark,
    borderRadius: theme.borderRadius.sm,
  },
  aiBackhaulButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  sortByText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500',
  },

});