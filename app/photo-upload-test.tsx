import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import PhotoUploader from '@/components/PhotoUploader';
import { useAuth } from '@/hooks/useAuth';
import { ensureTestLoad } from '@/lib/ensureTestLoad';
import { RefreshCcw } from 'lucide-react-native';

export default function PhotoUploadTestScreen() {
  const { userId, isLoading } = useAuth();
  const [loadId, setLoadId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

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
    <View style={styles.screen}>
      <Text style={styles.header}>Photo Upload Test</Text>
      <Text style={styles.sub}>Uses your private per-user test load.</Text>

      <View style={styles.card} testID="uploader-card">
        {error ? (
          <View>
            <Text style={styles.error}>Error: {error}</Text>
            <Pressable style={styles.retryBtn} onPress={createTestLoad} testID="retry-create-load">
              <RefreshCcw color={'#fff'} size={16} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : loadId ? (
          <PhotoUploader
            loadId={loadId}
            userId={userId}
            role="shipper"
            allowMultiple
            buttonLabel={creating ? 'Preparing…' : 'Pick Photos'}
            onUploaded={(items) => {
              console.log('[PhotoUploadTest] Uploaded', items.length, 'items');
            }}
          />
        ) : (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.muted}>{creating ? 'Creating test load…' : 'Preparing test load…'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.lightGray, padding: theme.spacing.lg },
  header: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  sub: { color: theme.colors.gray, marginTop: 4, marginBottom: theme.spacing.lg },
  card: { backgroundColor: '#fff', padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  muted: { color: theme.colors.gray, marginLeft: 8 },
  error: { color: theme.colors.danger, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { color: '#fff', fontWeight: '600' },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
});