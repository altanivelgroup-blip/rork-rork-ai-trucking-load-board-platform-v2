import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { MapPin, Calendar, Package, DollarSign, RotateCcw, Filter } from 'lucide-react-native';
import { Load } from '@/types';
import { collection, query, where, orderBy, limit, onSnapshot, startAfter, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { LOADS_COLLECTION, LOAD_STATUS } from '@/lib/loadSchema';
import { useToast } from '@/components/Toast';

interface LoadFilters {
  equipmentTypes: string[];
  maxWeightLbs?: number;
  pickupFrom?: string;
  sortBy: 'createdAt' | 'pickupDate';
}

export default function LoadsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { show } = useToast();
  
  // Firestore state
  const [items, setItems] = useState<Load[]>([]);
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
  
  // Check for optimistic load from navigation or temp store
  useEffect(() => {
    const tempLoad = params.tempLoad ? JSON.parse(params.tempLoad as string) : null;
    if (tempLoad) {
      setItems(prev => [tempLoad, ...prev.filter(l => l.id !== tempLoad.id)]);
    }
  }, [params.tempLoad]);
  
  // Normalize Firestore document to Load interface
  const normalizeFirestoreLoad = useCallback((doc: any): Load => {
    const data = doc.data();
    return {
      id: doc.id,
      shipperId: data.createdBy || '',
      shipperName: data.shipperName || 'Unknown Shipper',
      origin: typeof data.origin === 'string' 
        ? { address: data.origin, city: data.originCity || '', state: data.originState || '', zipCode: data.originZip || '', lat: data.latOrigin || 0, lng: data.lngOrigin || 0 }
        : data.origin || { address: '', city: '', state: '', zipCode: '', lat: 0, lng: 0 },
      destination: typeof data.destination === 'string'
        ? { address: data.destination, city: data.destCity || '', state: data.destState || '', zipCode: data.destZip || '', lat: data.latDest || 0, lng: data.lngDest || 0 }
        : data.destination || { address: '', city: '', state: '', zipCode: '', lat: 0, lng: 0 },
      distance: data.distance || 0,
      weight: Number(data.weightLbs || data.weight || 0),
      vehicleType: data.vehicleType || data.equipmentType || 'truck',
      rate: Number(data.rate || data.rateTotalUSD || data.rateAmount || 0),
      ratePerMile: Number(data.ratePerMileUSD || data.ratePerMile || 0),
      pickupDate: data.pickupDate instanceof Timestamp ? data.pickupDate.toDate() : new Date(data.pickupDate || Date.now()),
      deliveryDate: data.deliveryDate instanceof Timestamp ? data.deliveryDate.toDate() : new Date(data.deliveryDate || Date.now()),
      status: data.status || 'OPEN',
      description: data.description || data.title || '',
      special_requirements: data.special_requirements || [],
      assignedDriverId: data.assignedDriverId,
      isBackhaul: data.isBackhaul || false,
      aiScore: data.aiScore
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
        where('status', '==', LOAD_STATUS.OPEN),
        orderBy(orderField, 'desc'),
        limit(25)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loads = snapshot.docs.map(normalizeFirestoreLoad);
        
        // Dedupe against any optimistic items
        const deduped = loads.filter(load => !items.some(item => item.id === load.id));
        const combined = [...items.filter(item => item.status !== 'OPEN'), ...deduped];
        
        setItems(combined);
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
  }, [filters.sortBy, normalizeFirestoreLoad, show, items]);
  
  // Load more data for pagination
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isEnd || !lastDoc) return;
    
    try {
      setIsLoadingMore(true);
      
      const { db } = getFirebase();
      const orderField = filters.sortBy === 'pickupDate' ? 'pickupDate' : 'createdAt';
      
      const q = query(
        collection(db, LOADS_COLLECTION),
        where('status', '==', LOAD_STATUS.OPEN),
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
  }, [loadInitialData]);
  
  // Apply client-side filters
  const filteredLoads = useMemo(() => {
    return items.filter(load => {
      if (filters.equipmentTypes.length > 0 && !filters.equipmentTypes.includes(load.vehicleType)) {
        return false;
      }
      if (filters.maxWeightLbs && load.weight > filters.maxWeightLbs) {
        return false;
      }
      if (filters.pickupFrom) {
        const originText = typeof load.origin === 'string' ? load.origin : `${load.origin.city}, ${load.origin.state}`;
        if (!originText.toLowerCase().includes(filters.pickupFrom.toLowerCase())) {
          return false;
        }
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
    // Reset pagination when sort changes
    setItems([]);
    setLastDoc(null);
    setIsEnd(false);
  }, []);
  
  const loads = filteredLoads;
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  const handleOpenFilters = () => {
    // TODO: Implement filters modal
    console.log('Open filters modal');
  };
  
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
              <Text style={styles.emptyTitle}>No loads found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters or check back later</Text>
            </View>
          ) : (
            <>
              {loads.map((load) => {
                const originText =
                  typeof load.origin === 'string'
                    ? load.origin
                    : `${load.origin?.city ?? ''}, ${load.origin?.state ?? ''}`;

                const destText =
                  typeof load.destination === 'string'
                    ? load.destination
                    : `${load.destination?.city ?? ''}, ${load.destination?.state ?? ''}`;

                const rateVal = load.rate ?? 0;
                const weightVal = load.weight ?? 0;

                return (
                  <TouchableOpacity
                    key={load.id}
                    style={styles.loadCard}
                    onPress={() => handleLoadPress(load.id)}
                    testID={`load-${load.id}`}
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
                    
                    <View style={styles.loadDetails}>
                      <View style={styles.detailRow}>
                        <MapPin size={16} color={theme.colors.gray} />
                        <Text style={styles.detailText}>{load.distance || 0} miles</Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Calendar size={16} color={theme.colors.gray} />
                        <Text style={styles.detailText}>
                          Pickup: {load.pickupDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Package size={16} color={theme.colors.gray} />
                        <Text style={styles.detailText}>{weightVal.toLocaleString()} lbs</Text>
                      </View>
                    </View>
                    
                    {load.description && (
                      <Text style={styles.loadDescription} numberOfLines={2}>
                        {load.description}
                      </Text>
                    )}
                  </TouchableOpacity>
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