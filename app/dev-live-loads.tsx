import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot, orderBy, query, limit, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { LOADS_COLLECTION, LoadDoc } from '@/lib/loadSchema';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { useToast } from '@/components/Toast';

interface LoadItem {
  id: string;
  title: string;
  origin: string;
  destination: string;
  status: string;
  rate: number;
  createdAt: any;
}

export default function DevLiveLoadsScreen() {
  const [loads, setLoads] = useState<LoadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { show: showToast } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeFirestore = async () => {
      try {
        console.log('[DevLiveLoads] Initializing Firestore connection...');
        
        // Ensure Firebase auth
        const authSuccess = await ensureFirebaseAuth();
        if (!authSuccess) {
          throw new Error('Firebase authentication failed');
        }

        const { db } = getFirebase();
        
        // Create query for loads collection
        const loadsQuery = query(
          collection(db, LOADS_COLLECTION),
          orderBy('createdAt', 'desc'),
          limit(100)
        );

        console.log('[DevLiveLoads] Setting up real-time listener...');
        
        // Subscribe to real-time updates
        unsubscribe = onSnapshot(
          loadsQuery,
          (snapshot) => {
            console.log('[DevLiveLoads] Received snapshot with', snapshot.size, 'documents');
            
            const loadsList: LoadItem[] = [];
            snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data() as LoadDoc;
              loadsList.push({
                id: doc.id,
                title: data.title || 'Untitled Load',
                origin: data.origin || 'Unknown Origin',
                destination: data.destination || 'Unknown Destination',
                status: data.status || 'UNKNOWN',
                rate: data.rate || 0,
                createdAt: data.createdAt
              });
            });
            
            setLoads(loadsList);
            setLoading(false);
            setError(null);
            
            console.log('[DevLiveLoads] Updated loads list:', loadsList.length, 'items');
          },
          (error) => {
            console.error('[DevLiveLoads] Firestore error:', error);
            setError(error.message);
            setLoading(false);
            showToast(`Firestore error: ${error.message}`, 'error');
          }
        );
        
      } catch (error: any) {
        console.error('[DevLiveLoads] Initialization error:', error);
        setError(error.message);
        setLoading(false);
        showToast(`Initialization error: ${error.message}`, 'error');
      }
    };

    initializeFirestore();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        console.log('[DevLiveLoads] Cleaning up Firestore listener');
        unsubscribe();
      }
    };
  }, [showToast]);

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rate);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Handle Firestore Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      // Handle regular Date or number
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  const renderLoadItem = (load: LoadItem) => (
    <View key={load.id} style={styles.loadCard}>
      <View style={styles.loadHeader}>
        <Text style={styles.loadTitle} numberOfLines={1}>
          {load.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(load.status) }]}>
          <Text style={styles.statusText}>{load.status}</Text>
        </View>
      </View>
      
      <View style={styles.routeContainer}>
        <Text style={styles.routeText} numberOfLines={1}>
          {load.origin} → {load.destination}
        </Text>
      </View>
      
      <View style={styles.loadFooter}>
        <Text style={styles.rateText}>{formatRate(load.rate)}</Text>
        <Text style={styles.dateText}>{formatDate(load.createdAt)}</Text>
      </View>
      
      <Text style={styles.idText}>ID: {load.id}</Text>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN': return '#10B981';
      case 'ASSIGNED': return '#F59E0B';
      case 'IN_TRANSIT': return '#3B82F6';
      case 'DELIVERED': return '#6B7280';
      default: return '#EF4444';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading live loads...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorSubtext}>Check console for details</Text>
        </View>
      );
    }

    if (loads.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No loads found</Text>
          <Text style={styles.emptySubtext}>Loads will appear here in real-time</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Loads ({loads.length})</Text>
          <Text style={styles.headerSubtitle}>Real-time from Firestore</Text>
        </View>
        
        {loads.map(renderLoadItem)}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen 
        options={{
          title: 'Dev: Live Loads',
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: '600' }
        }} 
      />
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  loadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  loadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  routeContainer: {
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  idText: {
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: 'monospace',
  },
});