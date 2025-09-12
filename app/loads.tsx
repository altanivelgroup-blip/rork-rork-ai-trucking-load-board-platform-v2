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
            <View style={styles.loadsGrid}>
              {loads.map((load: any, index: number) => {
                const rateVal = load.rate ?? load.rateTotalUSD ?? 1200;
                const bidsCount = Math.floor(Math.random() * 3) + 1;
                
                // Determine load status and properties
                const isRushDelivery = load.isRushDelivery || Math.random() > 0.7;
                const statusText = load.status === 'awaiting-bids' ? 'Awaiting Bids' : 
                                 load.status === 'in-transit' ? 'In Transit' : 
                                 load.status === 'ready-pickup' ? 'Ready for Pickup' : 'Awaiting Bids';
                
                const originText = typeof load.origin === 'string'
                  ? load.origin
                  : `${load.origin?.city ?? load.originCity ?? 'Miami'}, ${load.origin?.state ?? load.originState ?? 'FL'}`;
                
                const destText = typeof load.destination === 'string'
                  ? load.destination
                  : `${load.destination?.city ?? load.destCity ?? 'Atlanta'}, ${load.destination?.state ?? load.destState ?? 'GA'}`;
                
                return (
                  <TouchableOpacity
                    key={load.id}
                    style={[styles.loadCard, index % 2 === 1 && styles.loadCardRight]}
                    onPress={() => handleLoadPress(load.id)}
                    testID={`load-${load.id}`}
                  >
                    {/* Rush Delivery Pill */}
                    {isRushDelivery && (
                      <View style={styles.rushPill}>
                        <Text style={styles.rushPillText}>Rush Delivery</Text>
                      </View>
                    )}
                    
                    {/* Active Status Pill */}
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                    
                    <Text style={styles.rateLabel}>Rate: <Text style={styles.rateValue}>${rateVal}</Text></Text>
                    
                    <Text style={styles.routeLabel}>Route: {originText} {'>'} {destText}</Text>
                    
                    <Text style={styles.bidsLabel}>Bids: {bidsCount}</Text>
                    
                    {load.status !== 'awaiting-bids' && (
                      <Text style={styles.statusLabel}>Status: {statusText}</Text>
                    )}
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.trackButton}
                        onPress={() => handleLoadPress(load.id)}
                        testID={`track-${load.id}`}
                      >
                        <Text style={styles.trackButtonText}>Track Load</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
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
  loadsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadCard: {
    width: '48%',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  loadCardRight: {
    marginLeft: '4%',
  },
  rushPill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
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
    alignSelf: 'flex-end',
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  activePillText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  rateLabel: {
    fontSize: 16,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
    marginTop: theme.spacing.lg,
  },
  rateValue: {
    fontWeight: '700',
  },
  routeLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  bidsLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  statusLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: theme.spacing.sm,
  },
  trackButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});