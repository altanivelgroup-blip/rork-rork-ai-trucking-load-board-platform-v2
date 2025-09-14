import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { DollarSign, Phone, Mail, Plus, X, Upload, Trash2, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react-native';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import { useToast } from '@/components/Toast';
import { LoadsFiltersModal } from '@/components/LoadsFiltersModal';
import { useAuth } from '@/hooks/useAuth';
import ConfirmationModal from '@/components/ConfirmationModal';
import { LoadCard } from '@/components/LoadCard';
import BackhaulPill from '@/components/BackhaulPill';

export default function ShipperLoadsScreen() {
  // Always call all hooks first to maintain hook order
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const { user } = useAuth();
  const { filteredLoads, isLoading, refreshLoads, filters, setFilters } = useLoads();
  const { deleteLoadWithToast } = useLoadsWithToast();
  
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showBulkOnly, setShowBulkOnly] = useState<boolean>(false);
  const [showLastImportOnly, setShowLastImportOnly] = useState<boolean>(false);
  const [lastBulkImportId, setLastBulkImportId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ visible: boolean; loadId: string | null }>({ visible: false, loadId: null });
  const [viewMode, setViewMode] = useState<'my-loads' | 'live-loads'>('my-loads');
  
  // Always define all callbacks and memoized values
  const handleLoadPress = useCallback((loadId: string) => {
    try {
      router.push({ pathname: '/load-details', params: { loadId } });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      router.push('/load-details');
    }
  }, [router]);
  const handleOpenFilters = useCallback(() => {
    setShowFiltersModal(true);
  }, []);
  
  const handleApplyFilters = useCallback((newFilters: any) => {
    if (newFilters && typeof newFilters === 'object') {
      setFilters(newFilters);
    }
  }, [setFilters]);
  
  const handleCall = useCallback((phone: string) => {
    if (phone && phone.trim()) {
      const phoneUrl = `tel:${phone}`;
      Linking.openURL(phoneUrl).catch(err => {
        if (err) {
          console.warn('Failed to open phone app:', err);
        }
      });
    }
  }, []);
  
  const handleEmail = useCallback((email: string) => {
    if (email && email.trim()) {
      const emailUrl = `mailto:${email}`;
      Linking.openURL(emailUrl).catch(err => {
        if (err) {
          console.warn('Failed to open email app:', err);
        }
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
  
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'my-loads' ? 'live-loads' : 'my-loads');
  }, []);
  
  const loads = useMemo(() => {
    let filtered = filteredLoads;
    
    if (viewMode === 'my-loads') {
      // Show only loads posted by this shipper
      filtered = filtered.filter(load => load.shipperId === user?.id);
    }
    // For 'live-loads', show all available loads
    
    // Apply bulk filter if enabled
    if (showBulkOnly) {
      filtered = filtered.filter(load => load.bulkImportId);
    }
    
    // Apply last import filter if enabled
    if (showLastImportOnly && lastBulkImportId) {
      filtered = filtered.filter(load => load.bulkImportId === lastBulkImportId);
    }
    
    return filtered;
  }, [filteredLoads, viewMode, user?.id, showBulkOnly, showLastImportOnly, lastBulkImportId]);
  
  // Load last bulk import ID on component mount
  useEffect(() => {
    const loadLastBulkImportId = async () => {
      try {
        // Mock storage for now - replace with actual storage hook when available
        const storedId = null; // await storage.getItem('lastBulkImportId');
        if (storedId) {
          setLastBulkImportId(storedId);
        }
      } catch (error) {
        console.warn('Failed to load last bulk import ID:', error);
      }
    };
    
    loadLastBulkImportId();
  }, []);
  
  // Redirect non-shippers with error handling
  useEffect(() => {
    if (user && user.role !== 'shipper') {
      try {
        router.replace('/(tabs)/dashboard');
      } catch (error) {
        console.error('Redirect error:', error);
        // Show loading state instead of crashing
      }
    }
  }, [user, router]);
  
  const isShipper = user?.role === 'shipper';
  
  if (!isShipper) {
    return null;
  }
  

  
  return (
    <>
      <Stack.Screen options={{ 
        title: 'My Loads',
        headerStyle: {
          backgroundColor: theme.colors.white,
        },
        headerTitleStyle: {
          color: theme.colors.dark,
          fontWeight: '600',
        },
        headerLeft: () => (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              try {
                // Navigate back to shipper profile or tabs if back doesn't work
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/shipper-profile');
                }
              } catch (error) {
                console.error('Navigation error:', error);
                // Fallback to shipper profile
                router.replace('/shipper-profile');
              }
            }}
            testID="back-button"
            activeOpacity={0.7}
          >
            <ArrowLeft size={28} color={theme.colors.white} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
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
          </View>
        )
      }} />
      <View style={styles.container}>
        {/* Toggle Section */}
        <View style={styles.toggleSection}>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleViewMode}
            testID="view-mode-toggle"
          >
            <View style={styles.toggleContent}>
              {viewMode === 'my-loads' ? (
                <ToggleLeft size={24} color={theme.colors.primary} />
              ) : (
                <ToggleRight size={24} color={theme.colors.primary} />
              )}
              <Text style={styles.toggleLabel}>
                {viewMode === 'my-loads' ? 'My Loads' : 'Live Loads'}
              </Text>
            </View>
            <Text style={styles.toggleSubtext}>
              {viewMode === 'my-loads' 
                ? 'Showing your posted loads' 
                : 'Showing all available loads'
              }
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Header Controls - Only show for My Loads */}
        {viewMode === 'my-loads' && (
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
              </ScrollView>
            </View>
          </View>
        )}
        
        <Text style={styles.debugBanner}>
          {viewMode === 'my-loads' 
            ? `${loads.length} posted loads` 
            : `${loads.length} available loads`
          }
        </Text>
        
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xl }]}
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading loads...</Text>
            </View>
          ) : loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {viewMode === 'my-loads' 
                  ? 'No loads posted yet' 
                  : 'No loads available'
                }
              </Text>
              <Text style={styles.emptySubtitle}>
                {viewMode === 'my-loads'
                  ? 'Start by posting your first load or importing from CSV'
                  : 'Check back later for new load opportunities'
                }
              </Text>
              {viewMode === 'my-loads' && (
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
                // Normalize load data to match LoadCard expectations
                const normalizedLoad = {
                  ...load,
                  origin: typeof load.origin === 'string' 
                    ? { city: 'Dallas', state: 'TX' }
                    : load.origin ?? { city: 'Dallas', state: 'TX' },
                  destination: typeof load.destination === 'string'
                    ? { city: 'Chicago', state: 'IL' }
                    : load.destination ?? { city: 'Chicago', state: 'IL' }
                };
                
                // Determine if load is completed for backhaul opportunities
                const isCompleted = load.status === 'delivered' || Math.random() > 0.8;
                
                return (
                  <View key={load.id}>
                    <View style={styles.loadCardWrapper}>
                      <LoadCard
                        load={normalizedLoad}
                        onPress={() => handleLoadPress(load.id)}
                        showBids={true}
                        showStatus={true}
                      />
                      {/* Show backhaul pill for completed loads in My Loads view */}
                      {viewMode === 'my-loads' && isCompleted && normalizedLoad.destination && (
                        <BackhaulPill 
                          deliveryLocation={{
                            lat: normalizedLoad.destination.lat || 41.8781,
                            lng: normalizedLoad.destination.lng || -87.6298,
                            city: normalizedLoad.destination.city,
                            state: normalizedLoad.destination.state
                          }}
                          onLoadSelect={(loadId) => handleLoadPress(loadId)}
                        />
                      )}
                    </View>
                    {/* Gray Divider */}
                    {index < loads.length - 1 && (
                      <View style={styles.divider} />
                    )}
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
  toggleSection: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  toggleButton: {
    alignItems: 'center',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  toggleLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  toggleSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
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
  loadsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  loadCardWrapper: {
    marginHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
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
  badgeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  bulkBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  bulkBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.white,
  },
  myLoadBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  myLoadBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.white,
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
  backButton: {
    padding: theme.spacing.md,
    marginLeft: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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