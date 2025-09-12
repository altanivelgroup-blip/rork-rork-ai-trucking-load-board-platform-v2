import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Truck } from 'lucide-react-native';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LiveLoadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

useEffect(() => {
  console.log('[LiveLoads] temp query: createdAt desc');
  setIsLoading(true);

  const q = query(
    collection(db, 'loads'),
    orderBy('createdAt', 'desc'),
    limit(25)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      console.log('[LiveLoads] fetched', arr.length);
      setItems(arr);
      setIsLoading(false);
    },
    (err) => {
      console.error('[LiveLoads] snapshot error', err.code, err.message);
      setIsLoading(false);
    }
  );

  return () => unsub();
}, []);
  
  
const loads = useMemo(() => {
  // Show all available loads (excluding completed ones)
  return items.filter(load => load.status !== 'completed');
}, [items]);

  const handleLoadPress = (loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  };
  
  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Truck size={32} color={theme.colors.primary} />
              <Text style={styles.aiLabel}>AI</Text>
            </View>
          </View>
        </View>
        
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Live Loads</Text>
          <Text style={styles.headerSubtitle}>Updated via API</Text>
        </View>
        
        {/* Content Section */}
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
              <Text style={styles.emptyTitle}>No loads available</Text>
            </View>
          ) : (
            <View style={styles.loadsContainer}>
              {loads.map((load: any, index: number) => {
                const rateVal = load.rate ?? load.rateTotalUSD ?? 1200;
                const bidsCount = Math.floor(Math.random() * 3) + 1;
                
                // Determine load status and properties
                const isRushDelivery = load.isRushDelivery || Math.random() > 0.7;
                const statusText = load.status === 'awaiting-bids' ? 'Pending' : 
                                 load.status === 'in-transit' ? 'In Transit' : 
                                 load.status === 'ready-pickup' ? 'Ready for Pickup' : 'Pending';
                
                const originText = typeof load.origin === 'string'
                  ? load.origin
                  : `${load.origin?.city ?? load.originCity ?? 'Dallas'}, ${load.origin?.state ?? load.originState ?? 'TX'}`;
                
                const destText = typeof load.destination === 'string'
                  ? load.destination
                  : `${load.destination?.city ?? load.destCity ?? 'Chicago'}, ${load.destination?.state ?? load.destState ?? 'IL'}`;
                
                return (
                  <View key={load.id}>
                    <TouchableOpacity
                      style={styles.uniformLoadCard}
                      onPress={() => handleLoadPress(load.id)}
                      testID={`load-${load.id}`}
                    >
                      {/* Status Pills */}
                      <View style={styles.statusRow}>
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                        
                        {isRushDelivery && (
                          <View style={styles.rushPill}>
                            <Text style={styles.rushPillText}>Rush Delivery</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Load Details */}
                      <Text style={styles.statusText}>Status: {statusText}</Text>
                      <Text style={styles.rateText}>Rate: ${rateVal}</Text>
                      <Text style={styles.routeText}>Route: {originText} {'>'} {destText}</Text>
                      <Text style={styles.bidsText}>Bids: {bidsCount}</Text>
                      
                      {/* Tap for Details Button */}
                      <TouchableOpacity 
                        style={styles.detailsButton}
                        onPress={() => handleLoadPress(load.id)}
                        testID={`details-${load.id}`}
                      >
                        <Text style={styles.detailsButtonText}>Tap for Details</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {/* Gray Divider */}
                    {index < loads.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  logoSection: {
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F5F5F5',
  },
  logoContainer: {
    marginBottom: theme.spacing.sm,
  },
  logoIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aiLabel: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
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
    textAlign: 'center',
  },
  loadsContainer: {
    paddingVertical: theme.spacing.sm,
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
  rateText: {
    fontSize: 16,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
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
});