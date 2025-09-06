import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { DollarSign, RotateCcw, Filter, Phone, Mail } from 'lucide-react-native';
import { collection, query, where, orderBy, limit, onSnapshot, startAfter, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { LOADS_COLLECTION } from '@/lib/loadSchema';
import { useToast } from '@/components/Toast';
import { LoadsFiltersModal, loadFiltersFromStorage } from '@/components/LoadsFiltersModal';

interface LoadFilters {
  equipmentTypes: string[];
  maxWeightLbs?: number;
  pickupFrom?: string;
  sortBy: 'createdAt' | 'pickupDate';
}

interface NormalizedLoad {
  id: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  pickupDate: string; // YYYY-MM-DD format or 'ASAP'
  equipmentType: string;
  weightLbs: number;
  rateTotalUSD: number;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: Date;
}

export default function LoadsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { show } = useToast();
  
  // Firestore state
  const [items, setItems] = useState<NormalizedLoad[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isEnd, setIsEnd] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Filter states
  const [filters, setFilters] = useState<LoadFilters>({
    equipmentTypes: [],
    sortBy: 'createdAt'
  });
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  
  // Load filters from storage on mount
  useEffect(() => {
    loadFiltersFromStorage().then(setFilters);
  }, []);

  // Check for optimistic load from navigation or temp store
  useEffect(() => {
    const tempLoad = params.tempLoad ? JSON.parse(params.tempLoad as string) : null;
    if (tempLoad) {
      setItems(prev => [tempLoad, ...prev.filter(l => l.id !== tempLoad.id)]);
    }
  }, [params.tempLoad]);
  
  // Normalize Firestore document to NormalizedLoad interface
  const normalizeFirestoreLoad = useCallback((doc: any): NormalizedLoad => {
    const data = doc.data();
    
    // Handle pickup date formatting
    let pickupDateStr = 'ASAP';
    if (data.pickupDate) {
      try {
        const date = data.pickupDate instanceof Timestamp ? data.pickupDate.toDate() : new Date(data.pickupDate);
        if (!isNaN(date.getTime())) {
          pickupDateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      } catch (e) {
        console.warn('Failed to parse pickup date:', e);
      }
    }
    
    return {
      id: doc.id,
      originCity: data.originCity || data.origin?.city || '',
      originState: data.originState || data.origin?.state || '',
      destCity: data.destCity || data.destination?.city || '',
      destState: data.destState || data.destination?.state || '',
      pickupDate: pickupDateStr,
      equipmentType: data.equipmentType || data.vehicleType || 'truck',
      weightLbs: Number(data.weightLbs || data.weight || 0),
      rateTotalUSD: Number(data.rateTotalUSD || data.rate || data.rateAmount || 0),
      contactPhone: data.contactPhone || '',
      contactEmail: data.contactEmail || '',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.clientCreatedAt || Date.now())
    };
  }, []);
  
  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Authentication failed');
      }
      
      const { db } = getFirebase();
      const orderField = filters.sortBy === 'pickupDate' ? 'pickupDate' : 'createdAt';
      
      const q = query(
        collection(db, LOADS_COLLECTION),
        where('status', '==', 'active'),
        orderBy(orderField, 'desc'),
        limit(25)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loads = snapshot.docs.map(normalizeFirestoreLoad);
        
        // Set the loaded items directly (no deduplication needed for fresh queries)
        setItems(loads);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setIsEnd(snapshot.docs.length < 25);
        setIsLoading(false);
      }, (err) => {
        console.error('Firestore subscription error:', err);
        setError('Failed to load data');
        setIsLoading(false);
        show('Failed to load loads', 'error');
      });
      
      return unsubscribe;
    } catch (err: any) {
      console.error('Load initial data error:', err);
      setError(err.message || 'Failed to load data');
      setIsLoading(false);
      show('Failed to connect to database', 'error');
    }
  }, [filters.sortBy, normalizeFirestoreLoad, show]);
  
  // Load more data for pagination
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isEnd || !lastDoc) return;
    
    try {
      setIsLoadingMore(true);
      
      const { db } = getFirebase();
      const orderField = filters.sortBy === 'pickupDate' ? 'pickupDate' : 'createdAt';
      
      const q = query(
        collection(db, LOADS_COLLECTION),
        where('status', '==', 'active'),
        orderBy(orderField, 'desc'),
        startAfter(lastDoc),
        limit(25)
      );
      
      onSnapshot(q, (snapshot) => {
        const newLoads = snapshot.docs.map(normalizeFirestoreLoad);
        
        if (newLoads.length > 0) {
          setItems(prev => [...prev, ...newLoads]);
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }
        
        setIsEnd(snapshot.docs.length < 25);
        setIsLoadingMore(false);
      }, (err) => {
        console.error('Load more error:', err);
        setIsLoadingMore(false);
        show('Failed to load more', 'error');
      });
      
    } catch (err: any) {
      console.error('Load more data error:', err);
      setIsLoadingMore(false);
      show('Failed to load more data', 'error');
    }
  }, [isLoadingMore, isEnd, lastDoc, filters.sortBy, normalizeFirestoreLoad, show]);
  
  // Initialize data loading
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    loadInitialData().then((unsub) => {
      unsubscribe = unsub;
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Reload data when filters change
  useEffect(() => {
    // Reset and reload when sort changes
    setItems([]);
    setLastDoc(null);
    setIsEnd(false);
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sortBy]);
  
  // Apply client-side filters
  const filteredLoads = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return items.filter(load => {
      // Equipment type filter
      if (filters.equipmentTypes.length > 0 && !filters.equipmentTypes.includes(load.equipmentType)) {
        return false;
      }
      
      // Max weight filter
      if (filters.maxWeightLbs && load.weightLbs > filters.maxWeightLbs) {
        return false;
      }
      
      // Pickup location filter
      if (filters.pickupFrom) {
        const originText = `${load.originCity}, ${load.originState}`.toLowerCase();
        if (!originText.includes(filters.pickupFrom.toLowerCase())) {
          return false;
        }
      }
      
      // Pickup date >= today filter (skip 'ASAP' loads)
      if (load.pickupDate !== 'ASAP' && load.pickupDate < today) {
        return false;
      }
      
      return true;
    });
  }, [items, filters]);
  
  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setItems([]);
    setLastDoc(null);
    setIsEnd(false);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);
  
  // Toggle sort
  const toggleSort = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortBy: prev.sortBy === 'createdAt' ? 'pickupDate' : 'createdAt'
    }));
  }, []);
  
  const loads = filteredLoads;
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  const handleOpenFilters = useCallback(() => {
    setShowFiltersModal(true);
  }, []);
  
  const handleApplyFilters = useCallback((newFilters: LoadFilters) => {
    setFilters(newFilters);
  }, []);
  
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
  
  const handleOpenAiLoads = () => {
    router.push('/ai-loads');
  };
  
  return (
    <>
      <Stack.Screen options={{ title: 'Available Loads' }} />
      <View style={styles.container}>
        {/* Header Controls */}
        <View style={styles.headerControls}>
          <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
            <RotateCcw size={16} color={theme.colors.primary} />
            <Text style={styles.sortButtonText}>
              Sort: {filters.sortBy === 'createdAt' ? 'Latest' : 'Pickup Date'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.filterButton} onPress={handleOpenFilters}>
              <Filter size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.aiButton} onPress={handleOpenAiLoads}>
              <Text style={styles.aiButtonText}>AI LOADS</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.debugBanner}>debug: {loads.length} loads</Text>
        
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
            if (isCloseToBottom && !isLoadingMore && !isEnd) {
              loadMoreData();
            }
          }}
          scrollEventThrottle={400}
        >
          {isLoading && items.length === 0 ? (
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
            <>
              {loads.map((load) => {
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
                          {load.originCity}, {load.originState} → {load.destCity}, {load.destState}
                        </Text>
                        <View style={styles.rateChip}>
                          <DollarSign size={16} color={theme.colors.white} />
                          <Text style={styles.rateText}>${load.rateTotalUSD.toLocaleString()}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.loadSubtitle}>
                        <Text style={styles.subtitleText}>
                          {load.pickupDate} • {load.equipmentType} • {load.weightLbs.toLocaleString()} lbs
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Action buttons */}
                    <View style={styles.loadActions}>
                      {load.contactPhone && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleCall(load.contactPhone!)}
                          testID={`call-${load.id}`}
                        >
                          <Phone size={16} color={theme.colors.primary} />
                          <Text style={styles.actionButtonText}>Call</Text>
                        </TouchableOpacity>
                      )}
                      {load.contactEmail && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEmail(load.contactEmail!)}
                          testID={`email-${load.id}`}
                        >
                          <Mail size={16} color={theme.colors.primary} />
                          <Text style={styles.actionButtonText}>Email</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              
              {isLoadingMore && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              )}
              
              {isEnd && loads.length > 0 && (
                <View style={styles.endMessage}>
                  <Text style={styles.endMessageText}>No more loads to show</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        
        <LoadsFiltersModal
          visible={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          filters={filters}
          onApplyFilters={handleApplyFilters}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
  },
  sortButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
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
  errorBanner: {
    backgroundColor: '#fee',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    color: '#c33',
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
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
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  loadingMoreText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  endMessage: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  endMessageText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
});