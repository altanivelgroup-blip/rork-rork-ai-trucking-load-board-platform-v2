import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Phone, Mail, Plus, Upload, Trash2, Edit, MapPin } from 'lucide-react-native';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function MyLoadsScreen() {
  // Always call all hooks first to maintain hook order
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { filteredLoads, isLoading } = useLoads();
  const { deleteLoadWithToast } = useLoadsWithToast();
  

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ visible: boolean; loadId: string | null }>({ visible: false, loadId: null });
  const [viewMode, setViewMode] = useState<'my-loads' | 'live-loads'>('my-loads');
  
  // Always define all callbacks and memoized values
  const handleCall = useCallback((phone: string) => {
    if (phone && phone.trim()) {
      const phoneUrl = `tel:${phone}`;
      Linking.openURL(phoneUrl).catch(err => {
        console.warn('Failed to open phone app:', err);
      });
    }
  }, []);
  
  const handleEmail = useCallback((email: string) => {
    if (email && email.trim()) {
      const emailUrl = `mailto:${email}`;
      Linking.openURL(emailUrl).catch(err => {
        console.warn('Failed to open email app:', err);
      });
    }
  }, []);
  

  
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
    
    return filtered;
  }, [filteredLoads, viewMode, user?.id]);
  
  // Redirect non-shippers
  useEffect(() => {
    if (user && user.role !== 'shipper') {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, router]);
  
  const isShipper = user?.role === 'shipper';
  
  if (!isShipper) {
    return null;
  }
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  return (
    <>
      <Stack.Screen options={{ 
        title: 'My Loads',
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
            <View style={styles.toggleRow}>
              <View style={[styles.toggleOption, viewMode === 'my-loads' && styles.toggleOptionActive]}>
                <Text style={[styles.toggleText, viewMode === 'my-loads' && styles.toggleTextActive]}>My Loads</Text>
              </View>
              <View style={[styles.toggleOption, viewMode === 'live-loads' && styles.toggleOptionActive]}>
                <Text style={[styles.toggleText, viewMode === 'live-loads' && styles.toggleTextActive]}>Live Loads</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
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
            loads.map((load: any) => {
              const originText = typeof load.origin === 'string'
                ? load.origin
                : `${load.origin?.city ?? ''}, ${load.origin?.state ?? ''}`;
              
              const destText = typeof load.destination === 'string'
                ? load.destination
                : `${load.destination?.city ?? ''}, ${load.destination?.state ?? ''}`;
              
              const rateVal = load.rate ?? 0;
              const weightVal = load.weight ?? 0;
              const isMyLoad = load.shipperId === user?.id;
              
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
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {load.status === 'available' ? 'Active' : load.status === 'completed' ? 'Completed' : 'In Progress'}
                        </Text>
                      </View>
                      <View style={styles.rateChip}>
                        <Text style={styles.rateText}>Rate: ${rateVal.toLocaleString()}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.routeSection}>
                      <View style={styles.routeRow}>
                        <MapPin size={16} color={theme.colors.gray} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          Route: {originText} to {destText}
                        </Text>
                      </View>
                      {viewMode === 'my-loads' && (
                        <Text style={styles.bidsText}>
                          Bids Received: {Math.floor(Math.random() * 5) + 1}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.loadSubtitle}>
                      <Text style={styles.subtitleText}>
                        {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'ASAP'} • {load.vehicleType || 'truck'} • {weightVal.toLocaleString()} lbs
                      </Text>
                      <View style={styles.badgeRow}>
                        {load.bulkImportId && (
                          <View style={styles.bulkBadge}>
                            <Text style={styles.bulkBadgeText}>Bulk</Text>
                          </View>
                        )}
                        {viewMode === 'live-loads' && isMyLoad && (
                          <View style={styles.myLoadBadge}>
                            <Text style={styles.myLoadBadgeText}>My Load</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Action buttons */}
                  <View style={styles.loadActions}>
                    {viewMode === 'live-loads' && !isMyLoad && load.shipperName && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleCall('555-0123')}
                          testID={`call-${load.id}`}
                        >
                          <Phone size={16} color={theme.colors.primary} />
                          <Text style={styles.actionButtonText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEmail('contact@example.com')}
                          testID={`email-${load.id}`}
                        >
                          <Mail size={16} color={theme.colors.primary} />
                          <Text style={styles.actionButtonText}>Email</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {viewMode === 'my-loads' && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push({ pathname: '/load-details', params: { loadId: load.id } })}
                          testID={`track-${load.id}`}
                        >
                          <MapPin size={16} color={theme.colors.primary} />
                          <Text style={styles.actionButtonText}>Track</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push({ pathname: '/load-edit', params: { loadId: load.id } })}
                          testID={`edit-${load.id}`}
                        >
                          <Edit size={16} color={theme.colors.primary} />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {(viewMode === 'my-loads' || (viewMode === 'live-loads' && isMyLoad)) && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => confirmDeleteLoad(load.id)}
                        testID={`delete-${load.id}`}
                      >
                        <Trash2 size={16} color="#EF4444" />
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightGray,
    borderRadius: 25,
    padding: 4,
    width: '100%',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  toggleTextActive: {
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
  statusBadge: {
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  rateChip: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  rateText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  routeSection: {
    marginBottom: theme.spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  routeText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  bidsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
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