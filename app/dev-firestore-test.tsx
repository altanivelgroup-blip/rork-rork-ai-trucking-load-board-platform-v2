import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { LOADS_COLLECTION } from '@/lib/loadSchema';

interface LoadDoc {
  id: string;
  title?: string;
  origin?: string;
  destination?: string;
  status?: string;
}

interface DiagnosticsInfo {
  projectId?: string;
  authDomain?: string;
  storageBucket?: string;
  userUID?: string;
  rawTestError?: string;
  publicReadCount?: number;
  orderedReadCount?: number;
  orderedReadError?: string;
}

export default function DevFirestoreTest() {
  const [loads, setLoads] = useState<LoadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo>({});
  const [testLoading, setTestLoading] = useState(false);

  const loadDiagnostics = async () => {
    try {
      console.log('Loading diagnostics...');
      const user = await ensureFirebaseAuth();
      const firebase = getFirebase();
      
      const newDiagnostics: DiagnosticsInfo = {
        projectId: firebase.app.options.projectId,
        authDomain: firebase.app.options.authDomain,
        storageBucket: firebase.app.options.storageBucket,
        userUID: user?.uid || 'Anonymous',
      };
      
      // Raw test
      try {
        await getDocs(collection(firebase.db, 'loads'));
        newDiagnostics.rawTestError = 'Success';
      } catch (err: any) {
        newDiagnostics.rawTestError = err.message;
      }
      
      setDiagnostics(newDiagnostics);
    } catch (err: any) {
      console.error('Diagnostics error:', err);
      setDiagnostics({ rawTestError: `Diagnostics failed: ${err.message}` });
    }
  };

  const testPublicRead = async () => {
    setTestLoading(true);
    try {
      const { db } = getFirebase();
      const querySnapshot = await getDocs(collection(db, 'loads'));
      setDiagnostics(prev => ({ ...prev, publicReadCount: querySnapshot.size }));
    } catch (err: any) {
      setDiagnostics(prev => ({ ...prev, publicReadCount: -1, rawTestError: err.message }));
    } finally {
      setTestLoading(false);
    }
  };

  const testOrderedRead = async () => {
    setTestLoading(true);
    try {
      const { db } = getFirebase();
      const q = query(collection(db, 'loads'), orderBy('createdAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);
      setDiagnostics(prev => ({ ...prev, orderedReadCount: querySnapshot.size, orderedReadError: undefined }));
    } catch (err: any) {
      setDiagnostics(prev => ({ ...prev, orderedReadCount: -1, orderedReadError: err.message }));
    } finally {
      setTestLoading(false);
    }
  };

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
    loadDiagnostics();
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
        {/* Diagnostics Panel */}
        <View style={styles.diagnosticsPanel}>
          <Text style={styles.diagnosticsTitle}>Firebase Diagnostics</Text>
          <Text style={styles.diagnosticsText}>Project ID: {diagnostics.projectId || 'Loading...'}</Text>
          <Text style={styles.diagnosticsText}>Auth Domain: {diagnostics.authDomain || 'Loading...'}</Text>
          <Text style={styles.diagnosticsText}>Storage Bucket: {diagnostics.storageBucket || 'Loading...'}</Text>
          <Text style={styles.diagnosticsText}>User UID: {diagnostics.userUID || 'Loading...'}</Text>
          <Text style={styles.diagnosticsText}>Raw Test: {diagnostics.rawTestError || 'Loading...'}</Text>
          
          <View style={styles.testButtons}>
            <TouchableOpacity 
              style={[styles.testButton, testLoading && styles.testButtonDisabled]} 
              onPress={testPublicRead}
              disabled={testLoading}
            >
              <Text style={styles.testButtonText}>
                Try public read (no orderBy)
                {diagnostics.publicReadCount !== undefined && ` (${diagnostics.publicReadCount})`}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, testLoading && styles.testButtonDisabled]} 
              onPress={testOrderedRead}
              disabled={testLoading}
            >
              <Text style={styles.testButtonText}>
                Try ordered read
                {diagnostics.orderedReadCount !== undefined && ` (${diagnostics.orderedReadCount})`}
              </Text>
            </TouchableOpacity>
          </View>
          
          {diagnostics.orderedReadError && (
            <Text style={styles.errorText}>Ordered read error: {diagnostics.orderedReadError}</Text>
          )}
        </View>

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
  diagnosticsPanel: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  diagnosticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  diagnosticsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  testButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 120,
  },
  testButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});