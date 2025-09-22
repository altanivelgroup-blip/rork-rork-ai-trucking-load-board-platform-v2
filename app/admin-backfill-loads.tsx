import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDocs, updateDoc, doc, collection } from 'firebase/firestore';
import { db, auth } from '@/utils/firebase';
import HeaderBack from '@/components/HeaderBack';
import { Stack } from 'expo-router';

type BackfillResult = {
  totalDocs: number;
  updatedDocs: number;
  errors: string[];
  details: {
    id: string;
    changes: string[];
  }[];
};

export default function AdminBackfillLoads() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    if (!message?.trim()) return;
    if (message.length > 500) return;
    const sanitized = message.trim();
    console.log('[BACKFILL]', sanitized);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${sanitized}`]);
  };

  const backfillLoadsShape = async (): Promise<BackfillResult> => {
    const result: BackfillResult = {
      totalDocs: 0,
      updatedDocs: 0,
      errors: [],
      details: []
    };

    try {
      addLog('Starting backfill process...');
      
      // Check if user is authenticated
      if (!auth?.currentUser) {
        throw new Error('User must be authenticated to run backfill');
      }

      addLog(`Running as user: ${auth.currentUser.uid}`);
      
      // Get all documents from loads collection
      addLog('Fetching all documents from loads collection...');
      const snap = await getDocs(collection(db, 'loads'));
      result.totalDocs = snap.docs.length;
      
      addLog(`Found ${result.totalDocs} documents to process`);

      for (const docSnap of snap.docs) {
        try {
          const d = docSnap.data() as any;
          const patch: any = {};
          const changes: string[] = [];

          // 1. Ensure createdBy field exists
          if (!d.createdBy && auth.currentUser?.uid) {
            patch.createdBy = auth.currentUser.uid;
            changes.push(`Added createdBy: ${auth.currentUser.uid}`);
          }

          // 2. Ensure status field exists
          if (!d.status) {
            patch.status = 'active';
            changes.push('Added status: active');
          }

          // 3. Normalize origin object
          if (!d.origin && (d.originCity || d.pickupCity)) {
            patch.origin = {
              city: d.originCity || d.pickupCity || '',
              state: d.originState || d.pickupState || '',
              zip: d.originZip || d.pickupZip || '',
            };
            changes.push(`Added origin object: ${JSON.stringify(patch.origin)}`);
          }

          // 4. Normalize destination object
          if (!d.destination && (d.destCity || d.dropoffCity)) {
            patch.destination = {
              city: d.destCity || d.dropoffCity || '',
              state: d.destState || d.dropoffState || '',
              zip: d.destZip || d.dropoffZip || '',
            };
            changes.push(`Added destination object: ${JSON.stringify(patch.destination)}`);
          }

          // 5. Normalize rate field
          if (d.rate == null && (d.rateTotalUSD != null || d.rateAmount != null)) {
            const rateValue = d.rateTotalUSD ?? d.rateAmount;
            patch.rate = Number(String(rateValue).replace(/[^\d.]/g, '')) || 0;
            changes.push(`Added rate: ${patch.rate} (from ${rateValue})`);
          }

          // 6. Ensure shipperId exists (use createdBy as fallback)
          if (!d.shipperId && (patch.createdBy || d.createdBy)) {
            patch.shipperId = patch.createdBy || d.createdBy;
            changes.push(`Added shipperId: ${patch.shipperId}`);
          }

          // Apply updates if there are any changes
          if (Object.keys(patch).length > 0) {
            addLog(`Updating document ${docSnap.id} with ${Object.keys(patch).length} changes`);
            await updateDoc(doc(db, 'loads', docSnap.id), patch);
            result.updatedDocs++;
            result.details.push({
              id: docSnap.id,
              changes
            });
          } else {
            addLog(`Document ${docSnap.id} already normalized, skipping`);
          }
        } catch (docError: any) {
          const errorMsg = `Error processing document ${docSnap.id}: ${docError.message}`;
          addLog(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      addLog(`Backfill complete! Updated ${result.updatedDocs} out of ${result.totalDocs} documents`);
      return result;

    } catch (error: any) {
      const errorMsg = `Backfill failed: ${error.message}`;
      addLog(errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  };

  const handleRunBackfill = async () => {
    // Confirm with user
    // Use platform-compatible confirmation
    const confirmed = confirm('This will update all documents in the loads collection to normalize their structure. This action cannot be undone. Continue?');
    
    if (confirmed) {
      setIsRunning(true);
      setResult(null);
      setLogs([]);
      
      try {
        const backfillResult = await backfillLoadsShape();
        setResult(backfillResult);
      } catch (error: any) {
        addLog(`Unexpected error: ${error.message}`);
      } finally {
        setIsRunning(false);
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Admin: Backfill Loads',
          headerLeft: () => <HeaderBack />
        }} 
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.title}>Load Data Normalization</Text>
          <Text style={styles.description}>
            This admin tool normalizes existing documents in the loads collection to ensure they match the current schema:
          </Text>
          
          <View style={styles.changesList}>
            <Text style={styles.changeItem}>• Adds missing createdBy field</Text>
            <Text style={styles.changeItem}>• Adds missing status field (defaults to &apos;active&apos;)</Text>
            <Text style={styles.changeItem}>• Converts flat origin fields to origin object</Text>
            <Text style={styles.changeItem}>• Converts flat destination fields to destination object</Text>
            <Text style={styles.changeItem}>• Normalizes rate field from rateTotalUSD/rateAmount</Text>
            <Text style={styles.changeItem}>• Adds missing shipperId field</Text>
          </View>

          <Text style={styles.warning}>
            ⚠️ This operation modifies data permanently. Only run if you understand the implications.
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={handleRunBackfill}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Backfill...' : 'Run Backfill'}
            </Text>
          </TouchableOpacity>

          {logs.length > 0 && (
            <TouchableOpacity 
              style={[styles.button, styles.clearButton]}
              onPress={clearLogs}
            >
              <Text style={styles.buttonText}>Clear Logs</Text>
            </TouchableOpacity>
          )}
        </View>

        {result && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Results</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>Total Documents: {result.totalDocs}</Text>
              <Text style={styles.resultText}>Updated Documents: {result.updatedDocs}</Text>
              <Text style={styles.resultText}>Errors: {result.errors.length}</Text>
            </View>

            {result.errors.length > 0 && (
              <View style={styles.errorSection}>
                <Text style={styles.errorTitle}>Errors:</Text>
                {result.errors.map((error, index) => (
                  <Text key={`error-${index}-${error.slice(0, 10)}`} style={styles.errorText}>{error}</Text>
                ))}
              </View>
            )}

            {result.details.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Updated Documents:</Text>
                {result.details.slice(0, 10).map((detail, index) => (
                  <View key={`detail-${detail.id}-${index}`} style={styles.detailCard}>
                    <Text style={styles.detailId}>ID: {detail.id}</Text>
                    {detail.changes.map((change, changeIndex) => (
                      <Text key={`change-${detail.id}-${changeIndex}-${change.slice(0, 10)}`} style={styles.detailChange}>• {change}</Text>
                    ))}
                  </View>
                ))}
                {result.details.length > 10 && (
                  <Text style={styles.moreText}>... and {result.details.length - 10} more</Text>
                )}
              </View>
            )}
          </View>
        )}

        {logs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <View style={styles.logsContainer}>
              {logs.map((log, index) => (
                <Text key={`log-${index}-${log.slice(0, 20)}`} style={styles.logText}>{log}</Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  changesList: {
    marginBottom: 16,
  },
  changeItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 20,
  },
  warning: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '600',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 16,
    color: '#2e7d32',
    marginBottom: 4,
    fontWeight: '500',
  },
  errorSection: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
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
    marginBottom: 4,
  },
  detailsSection: {
    marginTop: 12,
  },
  detailCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  detailId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  detailChange: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  moreText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  logsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});