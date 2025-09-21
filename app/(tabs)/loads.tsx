import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import LiveAnalyticsDashboard from '@/components/LiveAnalyticsDashboard';
import { DollarSign, Filter, Phone, Mail, Plus, X, Upload, Trash2, RefreshCw } from 'lucide-react-native';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import { useToast } from '@/components/Toast';
import { LoadsFiltersModal } from '@/components/LoadsFiltersModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import ConfirmationModal from '@/components/ConfirmationModal';
import { LoadCard } from '@/components/LoadCard';
import { startAudit, endAudit } from '@/utils/performanceAudit';

export default function LoadsScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const { filteredLoads, isLoading, refreshLoads, filters, setFilters, deleteLoad } = useLoads();
  const { deleteLoadWithToast } = useLoadsWithToast();
  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';
  
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<string[]>([]);
  const [showBulkOnly, setShowBulkOnly] = useState<boolean>(false);
  const [showLastImportOnly, setShowLastImportOnly] = useState<boolean>(false);
  const [lastBulkImportId, setLastBulkImportId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ visible: boolean; loadId: string | null }>({ visible: false, loadId: null });
  
  const equipmentTypes = ['Cargo Van', 'Flatbed', 'Reefer', 'Box Truck', 'Car Hauler', 'Enclosed Trailer'];
  const sortingOptions = isDriver 
    ? ['Highest $/mi', 'Near me', 'Lightest', 'New Today', 'AI for Loads']
    : ['Newest First', 'Highest Rate', 'Bulk Imports', 'Active Only'];
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('Cargo Van');
  const [selectedSortOptions, setSelectedSortOptions] = useState<string[]>(
    isDriver ? ['Near me', 'New Today', 'AI for Loads'] : ['Newest First', 'Active Only']
  );

  
  const loads = useMemo(() => {
    let filtered = filteredLoads;
    
    if (showBulkOnly) {
      filtered = filtered.filter(load => load.bulkImportId);
    }
    
    if (showLastImportOnly && lastBulkImportId) {
      filtered = filtered.filter(load => load.bulkImportId === lastBulkImportId);
    }
    
    return filtered;
  }, [filteredLoads, showBulkOnly, showLastImportOnly, lastBulkImportId]);
  
  const handleLoadPress = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);
  
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
    startAudit('loads-screen-refresh');
    setRefreshing(true);
    try {
      await refreshLoads();
      endAudit('loads-screen-refresh', { success: true });
    } catch {
      endAudit('loads-screen-refresh', { success: false });
      show('Failed to refresh loads', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshLoads, show]);
  

  
  const handleDeleteLoad = useCallback(async (loadId: string) => {
    try {
      await deleteLoadWithToast(loadId);
      setDeleteConfirmModal({ visible: false, loadId: null });
    } catch (error) {
      console.error('Failed to delete load:', error);
    }
  }, [deleteLoadWithToast]);
  
  const confirmDeleteLoad = useCallback((loadId: string) => {
    setDeleteConfirmModal({ visible: true, loadId });
  }, []);
  
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
      <Stack.Screen options={{ 
        title: isDriver ? 'AI Loads' : isShipper ? 'My Loads' : 'Loads',
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleRefresh}
              disabled={refreshing}
              testID="refresh-loads-btn"
            >
              <RefreshCw 
                size={20} 
                color={refreshing ? theme.colors.gray : theme.colors.primary} 
                style={refreshing ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </TouchableOpacity>
            {isShipper && (
              <>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => router.push('/post-load')}
                >
                  <Plus size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => router.push('/csv-bulk-upload')}
                >
                  <Upload size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )
      }} />
      <View style={styles.container}>
        {/* Header Controls */}
        <View style={styles.headerControls}>

          
          {/* Equipment Type Filters */}
          <View style={styles.equipmentFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentFiltersContent}>
              {/* Bulk Filter Chip - Only show for shippers */}
              {isShipper && (
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
              )}
              
              {/* Source: Bulk (last import) Filter Chip - Only show for shippers */}
              {isShipper && (
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
              )}
              
              {/* Equipment type filters - show for drivers */}
              {isDriver && equipmentTypes.map((type) => {
                const isSelected = selectedEquipmentType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.equipmentFilterChip,
                      isSelected && styles.equipmentFilterChipActive
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
        

        
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {isDriver && loads[0] ? (
            <View style={{ marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
              <LiveAnalyticsDashboard load={loads[0]} compact={false} showTitle={true} enabled={true} />
            </View>
          ) : null}
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading loads...</Text>
            </View>
          ) : loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {isDriver ? 'No loads match your filters' : 'No loads posted yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isDriver 
                  ? 'Try adjusting your filters or check back later' 
                  : 'Start by posting your first load or importing from CSV'
                }
              </Text>
              {isShipper && (
                <View style={styles.emptyActions}>
                  <TouchableOpacity 
                    style={styles.emptyActionButton}
                    onPress={() => router.push('/post-load')}
                  >
                    <Plus size={20} color={theme.colors.white} />
                    <Text style={styles.emptyActionText}>Post Load</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.emptyActionButton, styles.emptyActionButtonSecondary]}
                    onPress={() => router.push('/csv-bulk-upload')}
                  >
                    <Upload size={20} color={theme.colors.primary} />
                    <Text style={[styles.emptyActionText, styles.emptyActionTextSecondary]}>Bulk Upload</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.loadsContainer}>
              {loads.map((load: any, index: number) => {
                const handlePress = () => handleLoadPress(load.id);
                return (
                  <View key={load.id}>
                    <View style={styles.loadCardWrapper}>
                      <LoadCard
                        load={load}
                        onPress={handlePress}
                        showBids={true}
                        showStatus={true}
                      />
                    </View>
                    {/* Gray Divider */}
                    {index < loads.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
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
        
        <ConfirmationModal
          visible={deleteConfirmModal.visible}
          title="Delete Load"
          message="Are you sure you want to delete this load? This action cannot be undone and will remove it from all connected dashboards."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => deleteConfirmModal.loadId && handleDeleteLoad(deleteConfirmModal.loadId)}
          onCancel={() => setDeleteConfirmModal({ visible: false, loadId: null })}
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



  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  loadCardWrapper: {
    marginHorizontal: theme.spacing.lg,
  },
  uniformLoadCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  routeText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  bidsText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },
  // Status Pills
  rushPill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rushPillText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  activePill: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activePillText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  detailsButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 16,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
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
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  emptyActionButtonSecondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  emptyActionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  emptyActionTextSecondary: {
    color: theme.colors.primary,
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#EF4444',
  },

});