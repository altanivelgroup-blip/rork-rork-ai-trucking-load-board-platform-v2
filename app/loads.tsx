import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { mockLoads } from '@/mocks/loads';
import { MapPin, Calendar, Package, DollarSign } from 'lucide-react-native';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // use your actual path to the Firestore instance

export default function LoadsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
const [items, setItems] = useState<any[]>([]);

useEffect(() => {
  console.log('[Loads] temp query: createdAt desc');

  const q = query(
    collection(db, 'loads'),
    orderBy('createdAt', 'desc'),
    limit(25)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setItems(arr);
    },
    (err) => {
      console.error('[Loads] snapshot error', err.code, err.message);
    }
  );

  return () => unsub();
}, []);
  
  const loads = useMemo(() => {
    let filtered = mockLoads;
    
    // Apply filters from params if any
    if (params.origin && typeof params.origin === 'string') {
      const originFilter = params.origin.toLowerCase();
      filtered = filtered.filter(load => 
        load.origin?.city?.toLowerCase().includes(originFilter) ||
        load.origin?.state?.toLowerCase().includes(originFilter)
      );
    }
    
    if (params.destination && typeof params.destination === 'string') {
      const destinationFilter = params.destination.toLowerCase();
      filtered = filtered.filter(load => 
        load.destination?.city?.toLowerCase().includes(destinationFilter) ||
        load.destination?.state?.toLowerCase().includes(destinationFilter)
      );
    }
    
    if (params.minWeight && typeof params.minWeight === 'string') {
      const minWeight = parseInt(params.minWeight);
      if (!isNaN(minWeight)) {
        filtered = filtered.filter(load => (load.weight || 0) >= minWeight);
      }
    }
    
    if (params.minPrice && typeof params.minPrice === 'string') {
      const minPrice = parseInt(params.minPrice);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(load => (load.rate || 0) >= minPrice);
      }
    }
    
    return filtered;
  }, [params]);
  
  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  return (
    <>
      <Stack.Screen options={{ title: 'Available Loads' }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No loads found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters or check back later</Text>
            </View>
          ) : (
            loads.map((load) => (
              <TouchableOpacity
                key={load.id}
                style={styles.loadCard}
                onPress={() => handleLoadPress(load.id)}
                testID={`load-${load.id}`}
              >
                <View style={styles.loadHeader}>
                  <Text style={styles.loadTitle} numberOfLines={1}>
                    {load.origin?.city}, {load.origin?.state} → {load.destination?.city}, {load.destination?.state}
                  </Text>
                  <View style={styles.rateChip}>
                    <DollarSign size={16} color={theme.colors.white} />
                    <Text style={styles.rateText}>${load.rate?.toLocaleString() || '0'}</Text>
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
                      Pickup: {new Date(load.pickupDate || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Package size={16} color={theme.colors.gray} />
                    <Text style={styles.detailText}>{load.weight?.toLocaleString() || '0'} lbs</Text>
                  </View>
                </View>
                
                {load.description && (
                  <Text style={styles.loadDescription} numberOfLines={2}>
                    {load.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))
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
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
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
});