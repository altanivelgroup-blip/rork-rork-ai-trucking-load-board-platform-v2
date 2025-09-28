import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoads } from '@/hooks/useLoads';
import { mockLoads } from '@/mocks/loads';
import { getCache, setCache, clearCache } from '@/utils/simpleCache';
import { Load } from '@/types';
import { RefreshCw, Search, Database, Upload, FileText, Clock, MapPin } from 'lucide-react-native';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import HeaderBack from '@/components/HeaderBack';

interface StorageInfo {
  key: string;
  count: number;
  data: any[];
  source: string;
}

interface FirestoreSearchResult {
  id: string;
  title?: string;
  origin?: any;
  destination?: any;
  rate?: number;
  createdAt?: any;
  bulkImportId?: string;
  status?: string;
  createdBy?: string;
}

export default function FindMissingLoadsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const { loads: currentLoads, refreshLoads, addLoadsBulk } = useLoads();
  const [storageInfo, setStorageInfo] = useState<StorageInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [firestoreResults, setFirestoreResults] = useState<FirestoreSearchResult[]>([]);
  const [isSearchingFirestore, setIsSearchingFirestore] = useState(false);
  const [lastBulkImportId, setLastBulkImportId] = useState<string | null>(null);

  const searchFirestore = async () => {
    setIsSearchingFirestore(true);
    const results: FirestoreSearchResult[] = [];
    
    try {
      console.log('[FIND LOADS] 🔍 Starting Firestore search...');
      
      const { db } = getFirebase();
      
      // Search for all loads (no user filter first)
      console.log('[FIND LOADS] Searching all loads in Firestore...');
      const allLoadsQuery = query(
        collection(db, 'loads'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const allLoadsSnap = await getDocs(allLoadsQuery);
      console.log('[FIND LOADS] Found', allLoadsSnap.docs.length, 'total loads in Firestore');
      
      allLoadsSnap.docs.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          title: data.title,
          origin: data.origin || data.originCity,
          destination: data.destination || data.destCity,
          rate: data.rate || data.rateTotalUSD,
          createdAt: data.createdAt,
          bulkImportId: data.bulkImportId,
          status: data.status,
          createdBy: data.createdBy
        });
      });
      
      // Search for bulk import loads specifically
      if (lastBulkImportId) {
        console.log('[FIND LOADS] Searching for bulk import loads with ID:', lastBulkImportId);
        const bulkLoadsQuery = query(
          collection(db, 'loads'),
          where('bulkImportId', '==', lastBulkImportId)
        );
        const bulkLoadsSnap = await getDocs(bulkLoadsQuery);
        console.log('[FIND LOADS] Found', bulkLoadsSnap.docs.length, 'loads with bulk import ID');
      }
      
      // If we have a user, also search for user-specific loads
      if (user?.id) {
        console.log('[FIND LOADS] Searching user-specific loads for:', user.id);
        const userLoadsQuery = query(
          collection(db, 'loads'),
          where('createdBy', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const userLoadsSnap = await getDocs(userLoadsQuery);
        console.log('[FIND LOADS] Found', userLoadsSnap.docs.length, 'user-specific loads');
      }
      
      setFirestoreResults(results);
      show(`Found ${results.length} loads in Firestore`, 'success');
      
    } catch (error: any) {
      console.warn('[FIND LOADS] Firestore search failed:', error);
      show(`Firestore search failed: ${error.message}`, 'error');
    } finally {
      setIsSearchingFirestore(false);
    }
  };

  const scanAllStorage = async () => {
    setIsScanning(true);
    const info: StorageInfo[] = [];
    let total = 0;

    try {
      // Get last bulk import ID
      const bulkId = await AsyncStorage.getItem('lastBulkImportId');
      setLastBulkImportId(bulkId);
      
      // Check all possible storage keys
      const keysToCheck = [
        'userPostedLoads',
        'cache:loads:open:v1',
        'acceptedLoads',
        'lastBulkImportId',
        'loads',
        'persistedLoads',
        'firebaseLoads',
        'bulkImportLoads'
      ];

      for (const key of keysToCheck) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            let data = [];
            let count = 0;

            if (Array.isArray(parsed)) {
              data = parsed;
              count = parsed.length;
            } else if (parsed?.data && Array.isArray(parsed.data)) {
              data = parsed.data;
              count = parsed.data.length;
            } else if (typeof parsed === 'object' && parsed !== null) {
              data = [parsed];
              count = 1;
            }

            if (count > 0) {
              info.push({
                key,
                count,
                data,
                source: 'AsyncStorage'
              });
              total += count;
            }
          }
        } catch (e) {
          console.warn(`Failed to check key ${key}:`, e);
        }
      }

      // Check cache
      try {
        const cacheResult = await getCache<Load[]>('cache:loads:open:v1');
        if (cacheResult.hit && cacheResult.data && Array.isArray(cacheResult.data)) {
          info.push({
            key: 'cache:loads:open:v1',
            count: cacheResult.data.length,
            data: cacheResult.data,
            source: 'Cache'
          });
          total += cacheResult.data.length;
        }
      } catch (e) {
        console.warn('Failed to check cache:', e);
      }

      // Add mock loads info
      info.push({
        key: 'mockLoads',
        count: mockLoads.length,
        data: mockLoads,
        source: 'Mock Data'
      });
      total += mockLoads.length;

      setStorageInfo(info);
      setTotalFound(total);
      
      // Also search Firestore
      await searchFirestore();
      
    } catch (error) {
      console.error('Storage scan failed:', error);
      Alert.alert('Error', 'Failed to scan storage');
    } finally {
      setIsScanning(false);
    }
  };

  const restoreFromStorage = async (storageItem: StorageInfo) => {
    try {
      const loads = storageItem.data.filter(item => {
        // Basic validation that this looks like a load
        return item && 
               typeof item === 'object' && 
               item.id && 
               (item.origin || item.originCity) && 
               (item.destination || item.destCity || item.destinationCity);
      });

      if (loads.length === 0) {
        Alert.alert('No Valid Loads', 'No valid load data found in this storage item.');
        return;
      }

      // Transform data to match Load interface if needed
      const transformedLoads = loads.map((item: any) => {
        // If it's already in the right format, use it
        if (item.origin && item.destination && item.rate) {
          return item;
        }

        // Transform from other formats
        return {
          id: item.id || `restored-${Date.now()}-${Math.random()}`,
          shipperId: item.shipperId || item.createdBy || 'unknown',
          shipperName: item.shipperName || '',
          origin: {
            address: item.origin?.address || '',
            city: item.origin?.city || item.originCity || item.title?.split(' to ')[0] || 'Unknown',
            state: item.origin?.state || item.originState || '',
            zipCode: item.origin?.zipCode || '',
            lat: item.origin?.lat || 0,
            lng: item.origin?.lng || 0,
          },
          destination: {
            address: item.destination?.address || '',
            city: item.destination?.city || item.destCity || item.destinationCity || item.title?.split(' to ')[1] || 'Unknown',
            state: item.destination?.state || item.destState || item.destinationState || '',
            zipCode: item.destination?.zipCode || '',
            lat: item.destination?.lat || 0,
            lng: item.destination?.lng || 0,
          },
          distance: Number(item.distance || item.distanceMi || 0),
          weight: Number(item.weight || item.weightLbs || 0),
          vehicleType: (item.vehicleType || item.equipmentType || item.equipment || 'cargo-van') as any,
          rate: Number(item.rate || item.payUSD || item.rateTotalUSD || item.revenueUsd || 0),
          ratePerMile: Number(item.ratePerMile || 0),
          pickupDate: new Date(item.pickupDate || Date.now()),
          deliveryDate: new Date(item.deliveryDate || Date.now()),
          status: (item.status || 'available') as any,
          description: String(item.description || item.title || ''),
          special_requirements: item.special_requirements,
          isBackhaul: Boolean(item.isBackhaul),
          aiScore: item.aiScore,
          bulkImportId: item.bulkImportId,
        };
      });

      await addLoadsBulk(transformedLoads);
      Alert.alert(
        'Success', 
        `Restored ${transformedLoads.length} loads from ${storageItem.key}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Error', 'Failed to restore loads from storage');
    }
  };

  const forceRestoreAllLoads = async () => {
    Alert.alert(
      'Restore All Missing Loads',
      'This will restore all loads from all available sources (storage, cache, Firestore, and mock data). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore All',
          style: 'default',
          onPress: async () => {
            try {
              console.log('[RESTORE ALL] 🚀 Starting comprehensive load restoration...');
              
              let allLoadsToRestore: any[] = [];
              
              // 1. Add mock loads as base
              allLoadsToRestore = [...mockLoads];
              console.log(`[RESTORE ALL] Added ${mockLoads.length} mock loads`);
              
              // 2. Add all storage items
              for (const item of storageInfo) {
                if (item.source !== 'Mock Data' && item.data.length > 0) {
                  const validLoads = item.data.filter(load => 
                    load && typeof load === 'object' && load.id
                  );
                  allLoadsToRestore = [...allLoadsToRestore, ...validLoads];
                  console.log(`[RESTORE ALL] Added ${validLoads.length} loads from ${item.key}`);
                }
              }
              
              // 3. Add Firestore loads
              if (firestoreResults.length > 0) {
                const transformedFirestoreLoads = firestoreResults.map((item: any) => ({
                  id: item.id,
                  shipperId: item.createdBy || 'unknown',
                  shipperName: '',
                  origin: {
                    address: '',
                    city: formatLocation(item.origin),
                    state: '',
                    zipCode: '',
                    lat: 0,
                    lng: 0,
                  },
                  destination: {
                    address: '',
                    city: formatLocation(item.destination),
                    state: '',
                    zipCode: '',
                    lat: 0,
                    lng: 0,
                  },
                  distance: 0,
                  weight: 0,
                  vehicleType: 'cargo-van' as any,
                  rate: Number(item.rate || 0),
                  ratePerMile: 0,
                  pickupDate: new Date(),
                  deliveryDate: new Date(),
                  status: 'available' as any,
                  description: String(item.title || ''),
                  isBackhaul: false,
                  bulkImportId: item.bulkImportId,
                }));
                allLoadsToRestore = [...allLoadsToRestore, ...transformedFirestoreLoads];
                console.log(`[RESTORE ALL] Added ${transformedFirestoreLoads.length} Firestore loads`);
              }
              
              // 4. Remove duplicates by ID
              const uniqueLoads = new Map();
              allLoadsToRestore.forEach(load => {
                if (load.id && !uniqueLoads.has(load.id)) {
                  uniqueLoads.set(load.id, load);
                }
              });
              const finalLoads = Array.from(uniqueLoads.values());
              
              console.log(`[RESTORE ALL] Final count: ${finalLoads.length} unique loads`);
              
              // 5. Restore all loads
              await addLoadsBulk(finalLoads);
              
              Alert.alert(
                'Success!', 
                `Restored ${finalLoads.length} loads from all sources!\n\nMock: ${mockLoads.length}\nStorage: ${storageInfo.reduce((sum, item) => sum + (item.source !== 'Mock Data' ? item.count : 0), 0)}\nFirestore: ${firestoreResults.length}`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
              
            } catch (error) {
              console.error('Comprehensive restore failed:', error);
              Alert.alert('Error', 'Failed to restore all loads');
            }
          }
        }
      ]
    );
  };

  const forceResetLoads = async () => {
    Alert.alert(
      'Reset All Loads',
      'This will clear all cached data and restore the full load dataset. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all load-related storage
              await AsyncStorage.multiRemove([
                'userPostedLoads',
                'cache:loads:open:v1',
                'acceptedLoads',
                'loads',
                'persistedLoads',
                'firebaseLoads',
                'bulkImportLoads'
              ]);
              
              // Clear cache
              await clearCache('cache:loads:open:v1');
              
              // Force refresh loads
              await refreshLoads();
              
              Alert.alert('Success', 'All loads have been reset and restored!');
              scanAllStorage(); // Refresh the storage scan
            } catch (error) {
              console.error('Reset failed:', error);
              Alert.alert('Error', 'Failed to reset loads');
            }
          }
        }
      ]
    );
  };

  const clearStorageItem = async (key: string) => {
    Alert.alert(
      'Clear Storage',
      `Are you sure you want to clear ${key}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(key);
              if (key.startsWith('cache:')) {
                await clearCache(key);
              }
              Alert.alert('Success', `Cleared ${key}`);
              scanAllStorage(); // Refresh the list
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    scanAllStorage();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatLocation = (location: any) => {
    if (typeof location === 'string') return location;
    if (location?.city && location?.state) return `${location.city}, ${location.state}`;
    if (location?.city) return location.city;
    return 'Unknown';
  };

  const restoreFirestoreLoads = async () => {
    if (firestoreResults.length === 0) {
      Alert.alert('No Data', 'No Firestore loads found to restore.');
      return;
    }
    
    try {
      // Transform Firestore results to Load format
      const transformedLoads = firestoreResults.map((item: any) => ({
        id: item.id,
        shipperId: item.createdBy || 'unknown',
        shipperName: '',
        origin: {
          address: '',
          city: formatLocation(item.origin),
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        destination: {
          address: '',
          city: formatLocation(item.destination),
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        distance: 0,
        weight: 0,
        vehicleType: 'cargo-van' as any,
        rate: Number(item.rate || 0),
        ratePerMile: 0,
        pickupDate: new Date(),
        deliveryDate: new Date(),
        status: 'available' as any,
        description: String(item.title || ''),
        isBackhaul: false,
        bulkImportId: item.bulkImportId,
      }));
      
      await addLoadsBulk(transformedLoads);
      Alert.alert(
        'Success', 
        `Restored ${transformedLoads.length} loads from Firestore`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Firestore restore failed:', error);
      Alert.alert('Error', 'Failed to restore loads from Firestore');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Find Missing Loads',
          headerLeft: () => <HeaderBack />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={scanAllStorage}
              disabled={isScanning || isSearchingFirestore}
              style={{ padding: 8 }}
            >
              <RefreshCw 
                size={20} 
                color={theme.colors.primary}
                style={(isScanning || isSearchingFirestore) ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Search size={32} color={theme.colors.primary} />
          <Text style={styles.title}>🔍 Load Recovery Tool</Text>
          <Text style={styles.subtitle}>
            Current loads in memory: {currentLoads.length}
          </Text>
          <Text style={styles.subtitle}>
            Total found in storage: {totalFound}
          </Text>
          <Text style={styles.subtitle}>
            Firestore loads found: {firestoreResults.length}
          </Text>
          {lastBulkImportId && (
            <Text style={styles.subtitle}>
              Last bulk import ID: {lastBulkImportId}
            </Text>
          )}
        </View>

        {(isScanning || isSearchingFirestore) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {isScanning ? 'Scanning storage...' : 'Searching Firestore...'}
            </Text>
          </View>
        ) : (
          <View style={styles.storageList}>
            {/* Firestore Results Section */}
            {firestoreResults.length > 0 && (
              <View style={styles.storageItem}>
                <View style={styles.storageHeader}>
                  <View style={styles.storageInfo}>
                    <Text style={styles.storageKey}>🔥 Firestore Loads</Text>
                    <Text style={styles.storageSource}>Firebase Firestore</Text>
                    <Text style={styles.storageCount}>{firestoreResults.length} loads found</Text>
                    {lastBulkImportId && (
                      <Text style={styles.bulkImportInfo}>
                        Bulk imports with ID: {lastBulkImportId}
                      </Text>
                    )}
                  </View>
                  <View style={styles.storageActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={restoreFirestoreLoads}
                    >
                      <Upload size={16} color={theme.colors.white} />
                      <Text style={styles.actionButtonText}>Restore All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                      onPress={() => router.push('/(tabs)/loads')}
                    >
                      <Database size={16} color={theme.colors.white} />
                      <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Show sample Firestore loads */}
                <View style={styles.sampleData}>
                  <Text style={styles.sampleTitle}>Recent Firestore loads:</Text>
                  {firestoreResults.slice(0, 3).map((load, idx) => (
                    <View key={idx} style={styles.loadPreview}>
                      <View style={styles.loadPreviewHeader}>
                        <Text style={styles.loadPreviewTitle}>{load.title || load.id}</Text>
                        {load.bulkImportId && (
                          <View style={styles.bulkBadge}>
                            <Text style={styles.bulkBadgeText}>BULK</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.loadPreviewDetails}>
                        <MapPin size={12} color={theme.colors.gray} />
                        <Text style={styles.loadPreviewText}>
                          {formatLocation(load.origin)} → {formatLocation(load.destination)}
                        </Text>
                      </View>
                      <Text style={styles.loadPreviewText}>Rate: ${load.rate || 0}</Text>
                      <Text style={styles.loadPreviewText}>Created: {formatDate(load.createdAt)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Local Storage Results */}
            {storageInfo.map((item, index) => (
              <View key={index} style={styles.storageItem}>
                <View style={styles.storageHeader}>
                  <View style={styles.storageInfo}>
                    <Text style={styles.storageKey}>{item.key}</Text>
                    <Text style={styles.storageSource}>{item.source}</Text>
                    <Text style={styles.storageCount}>{item.count} items</Text>
                  </View>
                  <View style={styles.storageActions}>
                    {item.source !== 'Mock Data' && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => restoreFromStorage(item)}
                      >
                        <Upload size={16} color={theme.colors.white} />
                        <Text style={styles.actionButtonText}>Restore</Text>
                      </TouchableOpacity>
                    )}
                    {item.source === 'AsyncStorage' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={() => clearStorageItem(item.key)}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                {item.data.length > 0 && (
                  <View style={styles.sampleData}>
                    <Text style={styles.sampleTitle}>Sample data:</Text>
                    <Text style={styles.sampleText} numberOfLines={3}>
                      {JSON.stringify(item.data[0], null, 2).substring(0, 200)}...
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#10B981' }]}
            onPress={forceRestoreAllLoads}
          >
            <Upload size={20} color={theme.colors.white} />
            <Text style={styles.refreshButtonText}>🚀 Restore All Missing Loads</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={async () => {
              try {
                await refreshLoads();
                Alert.alert('Success', 'Loads refreshed');
              } catch (error) {
                Alert.alert('Error', 'Failed to refresh loads');
              }
            }}
          >
            <RefreshCw size={20} color={theme.colors.white} />
            <Text style={styles.refreshButtonText}>Force Refresh Loads</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#EF4444', marginTop: theme.spacing.md }]}
            onPress={forceResetLoads}
          >
            <Database size={20} color={theme.colors.white} />
            <Text style={styles.refreshButtonText}>Reset All Loads</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  storageList: {
    padding: theme.spacing.lg,
  },
  storageItem: {
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
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  storageInfo: {
    flex: 1,
  },
  storageKey: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  storageSource: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  storageCount: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  storageActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#EF4444',
  },
  clearButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  sampleData: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  sampleText: {
    fontSize: 12,
    color: theme.colors.gray,
    fontFamily: 'monospace',
  },
  bulkImportInfo: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  loadPreview: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  loadPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  loadPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
  },
  bulkBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bulkBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  loadPreviewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  loadPreviewText: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  actions: {
    padding: theme.spacing.lg,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  refreshButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});