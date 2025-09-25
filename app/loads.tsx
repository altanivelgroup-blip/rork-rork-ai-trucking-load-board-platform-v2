import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Truck } from 'lucide-react-native';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadCard } from '@/components/LoadCard';
import { getCache, setCache } from '@/utils/simpleCache';
import { useFocusEffect } from '@react-navigation/native';

export default function LiveLoadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Refetch loads whenever the screen regains focus
  useFocusEffect(
    useCallback(() => {
      console.log('[LiveLoads] focus -> refresh');
      setRefreshTick(t => t + 1);
      return () => {};
    }, [])
  );

  useEffect(() => {
    console.log('[LiveLoads] Setting up loads query');
    setIsLoading(true);

    let unsubscribe: undefined | (() => void);

    (async () => {
      try {
        const cached = await getCache<any[]>('cache:liveLoads:v1');
        if (cached?.length) {
          setItems(cached);
          setFromCache(true);
          console.log('[LiveLoads] set from cache', cached.length);
        }
      } catch (e) {
        console.warn('[LiveLoads] cache read failed', e);
      }

      // Live query
      try {
        const colRef = collection(db, 'loads');
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

        unsubscribe = onSnapshot(
          q,
          async (snap) => {
            const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setItems(rows);
            setIsLoading(false);
            setFromCache(false);
            console.log('[LiveLoads] snapshot rows:', rows.length);
            try { 
              await setCache('cache:liveLoads:v1', rows, 5 * 60 * 1000); 
            } catch (e) {
              console.warn('[LiveLoads] cache write failed', e);
            }
          },
          (err) => {
            console.warn('[LiveLoads] onSnapshot error', err);
            setIsLoading(false);
          }
        );
      } catch (e) {
        console.warn('[LiveLoads] query setup failed', e);
        setIsLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [refreshTick]);
  
  
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
              <Text style={styles.loadingText}>{fromCache ? 'Loading from cache...' : 'Loading loads...'}</Text>
            </View>
          ) : loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No loads available</Text>
            </View>
          ) : (
            <View style={styles.loadsContainer}>
              {loads.map((load: any, index: number) => {
                // Normalize load data to match LoadCard expectations
                const normalizedLoad = {
                  ...load,
                  rate: load.rate ?? load.rateTotalUSD ?? 1200,
                  origin: typeof load.origin === 'string' 
                    ? { city: 'Dallas', state: 'TX' }
                    : load.origin ?? { 
                        city: load.originCity ?? 'Dallas', 
                        state: load.originState ?? 'TX' 
                      },
                  destination: typeof load.destination === 'string'
                    ? { city: 'Chicago', state: 'IL' }
                    : load.destination ?? { 
                        city: load.destCity ?? 'Chicago', 
                        state: load.destState ?? 'IL' 
                      }
                };
                
                return (
                  <View key={load.id}>
                    <View style={styles.loadCardWrapper}>
                      <LoadCard
                        load={normalizedLoad}
                        onPress={() => handleLoadPress(load.id)}
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
  loadCardWrapper: {
    marginHorizontal: 0,
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