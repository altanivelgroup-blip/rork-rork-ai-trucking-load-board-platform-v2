import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { LOADS_COLLECTION } from '@/lib/loadSchema';

interface LoadDoc {
  id: string;
  title?: string;
  origin?: string;
  destination?: string;
  status?: string;
}

export default function DevFirestoreTest() {
  const [loads, setLoads] = useState<LoadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting Firebase auth...');
      await ensureFirebaseAuth();
      
      console.log('Getting Firebase instance...');
      const { db } = getFirebase();
      
      console.log('Querying loads collection:', LOADS_COLLECTION);
      const querySnapshot = await getDocs(collection(db, LOADS_COLLECTION));
      
      const loadsData: LoadDoc[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadsData.push({
          id: doc.id,
          title: data.title || 'No title',
          origin: data.origin || 'Unknown origin',
          destination: data.destination || 'Unknown destination',
          status: data.status || 'No status'
        });
      });
      
      console.log('Fetched loads:', loadsData.length);
      setLoads(loadsData);
      setCount(loadsData.length);
    } catch (err: any) {
      console.error('Firestore error:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Dev: Firestore Test',
          headerStyle: { backgroundColor: '#f8f9fa' },
        }} 
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.countText}>Found {count} loads</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchLoads}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? 'Loading...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading loads...</Text>
          </View>
        )}

        {!loading && !error && (
          <ScrollView style={styles.scrollView}>
            {loads.map((load) => (
              <View key={load.id} style={styles.loadItem}>
                <Text style={styles.loadId}>ID: {load.id}</Text>
                <Text style={styles.loadTitle}>{load.title}</Text>
                <Text style={styles.loadRoute}>
                  {load.origin} → {load.destination}
                </Text>
                <Text style={styles.loadStatus}>Status: {load.status}</Text>
              </View>
            ))}
            
            {loads.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No loads found</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  loadItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  loadId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  loadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  loadRoute: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  loadStatus: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});