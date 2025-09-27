import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import PhotoUploader from '@/components/PhotoUploader';
import { useAuth } from '@/hooks/useAuth';
import { ensureTestLoad } from '@/lib/ensureTestLoad';
import { RefreshCcw, CheckCircle, AlertCircle, Upload } from 'lucide-react-native';
import { auth, storage } from '@/utils/firebase';

export default function PhotoUploadTestScreen() {
  const { userId, isLoading, user } = useAuth();
  const [loadId, setLoadId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadResults, setUploadResults] = React.useState<{id: string; url: string; path: string}[]>([]);
  const [diagnostics, setDiagnostics] = React.useState<string>('');

  // Run diagnostics
  React.useEffect(() => {
    const runDiagnostics = () => {
      const authUser = auth.currentUser;
      const info = [
        `Auth Status: ${authUser ? 'Signed In' : 'Not Signed In'}`,
        `User ID: ${userId || 'None'}`,
        `User Email: ${authUser?.email || 'None'}`,
        `User Role: ${user?.role || 'None'}`,
        `Firebase Project: ${storage.app.options.projectId}`,
        `Storage Bucket: ${storage.app.options.storageBucket}`,
      ].join('\n');
      setDiagnostics(info);
    };
    
    runDiagnostics();
    const unsubscribe = auth.onAuthStateChanged(runDiagnostics);
    return unsubscribe;
  }, [userId, user]);

  const createTestLoad = React.useCallback(async () => {
    if (!userId) return;
    setCreating(true);
    setError(null);
    try {
      console.log('[PhotoUploadTest] Ensuring test load for user', userId);
      const id = await ensureTestLoad(userId);
      console.log('[PhotoUploadTest] Test load ready', id);
      setLoadId(id);
    } catch (e: any) {
      console.error('[PhotoUploadTest] ensureTestLoad error', e);
      setError(e?.message ?? 'Failed to create test load');
    } finally {
      setCreating(false);
    }
  }, [userId]);

  React.useEffect(() => {
    if (userId) {
      createTestLoad().catch((e) => console.error('[PhotoUploadTest] init error', e));
    }
  }, [userId, createTestLoad]);

  if (isLoading) {
    return (
      <View style={styles.center} testID="auth-loading">
        <ActivityIndicator />
        <Text style={styles.muted}>Checking auth…</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.center} testID="auth-required">
        <Text style={styles.title}>Photo Upload Test</Text>
        <Text style={styles.error}>Please sign in to test photo uploads.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Photo Upload Test' }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Upload size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Photo Upload Test</Text>
          <Text style={styles.subtitle}>Test your photo uploads here - no 5 steps needed!</Text>
        </View>

        {/* Diagnostics Section */}
        <View style={styles.diagnosticsCard}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <Text style={styles.diagnosticsText}>{diagnostics}</Text>
        </View>

        {/* Upload Section */}
        <View style={styles.uploadCard}>
          <Text style={styles.sectionTitle}>Upload Photos</Text>
          {error ? (
            <View>
              <View style={styles.errorContainer}>
                <AlertCircle size={20} color={theme.colors.danger} />
                <Text style={styles.errorText}>Error: {error}</Text>
              </View>
              <Pressable style={styles.retryBtn} onPress={createTestLoad} testID="retry-create-load">
                <RefreshCcw color={'#fff'} size={16} />
                <Text style={styles.retryText}>Retry Setup</Text>
              </Pressable>
            </View>
          ) : loadId ? (
            <PhotoUploader
              loadId={loadId}
              userId={userId}
              role="driver"
              allowMultiple
              buttonLabel={creating ? 'Preparing…' : 'Test Photo Upload'}
              onUploaded={(items) => {
                console.log('[PhotoUploadTest] Uploaded', items.length, 'items');
                setUploadResults(prev => [...prev, ...items]);
                Alert.alert(
                  'Success!', 
                  `${items.length} photo${items.length > 1 ? 's' : ''} uploaded successfully!`
                );
              }}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {creating ? 'Creating test load…' : 'Preparing test environment…'}
              </Text>
            </View>
          )}
        </View>

        {/* Results Section */}
        {uploadResults.length > 0 && (
          <View style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <CheckCircle size={20} color={theme.colors.success} />
              <Text style={styles.sectionTitle}>Upload Results ({uploadResults.length})</Text>
            </View>
            {uploadResults.map((result, index) => (
              <View key={result.id} style={styles.resultItem}>
                <Text style={styles.resultIndex}>#{index + 1}</Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultId}>ID: {result.id}</Text>
                  <Text style={styles.resultPath}>Path: {result.path}</Text>
                  <Text style={styles.resultUrl} numberOfLines={1}>URL: {result.url}</Text>
                </View>
              </View>
            ))}
            <Pressable 
              style={styles.clearBtn} 
              onPress={() => {
                setUploadResults([]);
                Alert.alert('Cleared', 'Results cleared');
              }}
            >
              <Text style={styles.clearText}>Clear Results</Text>
            </Pressable>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.sectionTitle}>How to Use</Text>
          <Text style={styles.instructionText}>
            1. Make sure you're signed in (check System Status above){"\n"}
            2. Tap "Test Photo Upload" button{"\n"}
            3. Select photos from your device{"\n"}
            4. Wait for upload to complete{"\n"}
            5. Check results below{"\n\n"}
            This bypasses the 5-step load posting process!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  diagnosticsCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionsCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  diagnosticsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.danger,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  resultIndex: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
    minWidth: 24,
  },
  resultDetails: {
    flex: 1,
  },
  resultId: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    marginBottom: 2,
  },
  resultPath: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  resultUrl: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  clearBtn: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  clearText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  // Legacy styles for compatibility
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  muted: { color: theme.colors.gray, marginLeft: 8 },
  error: { color: theme.colors.danger, marginTop: 8 },
  retryBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { color: '#fff', fontWeight: '600' },
});