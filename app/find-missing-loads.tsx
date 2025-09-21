import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoads } from '@/hooks/useLoads';
import { mockLoads } from '@/mocks/loads';
import { getCache, setCache, clearCache } from '@/utils/simpleCache';
import { Load } from '@/types';
import { RefreshCw, Search, Database, Upload } from 'lucide-react-native';

interface StorageInfo {
  key: string;
  count: number;
  data: any[];
  source: string;
}

export default function FindMissingLoadsScreen() {
  const router = useRouter();
  const { loads: currentLoads, refreshLoads, addLoadsBulk } = useLoads();
  const [storageInfo, setStorageInfo] = useState<StorageInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [totalFound, setTotalFound] = useState(0);

  const scanAllStorage = async () => {
    setIsScanning(true);
    const info: StorageInfo[] = [];
    let total = 0;

    try {
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

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Find Missing Loads',
          headerRight: () => (
            <TouchableOpacity 
              onPress={scanAllStorage}
              disabled={isScanning}
              style={{ padding: 8 }}
            >
              <RefreshCw 
                size={20} 
                color={theme.colors.primary}
                style={isScanning ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 Load Recovery Tool</Text>
          <Text style={styles.subtitle}>
            Current loads in memory: {currentLoads.length}
          </Text>
          <Text style={styles.subtitle}>
            Total found in storage: {totalFound}
          </Text>
        </View>

        {isScanning ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Scanning storage...</Text>
          </View>
        ) : (
          <View style={styles.storageList}>
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