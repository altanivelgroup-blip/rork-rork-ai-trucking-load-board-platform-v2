import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image, Platform } from 'react-native';
import { Stack } from 'expo-router';
import PhotoUploader from '@/components/PhotoUploader';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function PhotoUploaderDemo() {
  const auth = useAuth();
  const [loadId, setLoadId] = useState<string>(() => `demo-load-${Math.random().toString(36).slice(2, 8)}`);
  const [role, setRole] = useState<'shipper' | 'driver'>('shipper');
  const [items, setItems] = useState<{ id: string; url: string; path: string }[]>([]);
  const [customUserId, setCustomUserId] = useState<string>('');

  const userId = useMemo(() => {
    return auth?.userId ?? (customUserId || '');
  }, [auth?.userId, customUserId]);

  const canUpload = Boolean(loadId && userId);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Photo Uploader Lab',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card} testID="config-card">
          <Text style={styles.cardTitle}>Configuration</Text>

          <Text style={styles.label}>Load ID</Text>
          <View style={styles.row}>
            <TextInput
              value={loadId}
              onChangeText={setLoadId}
              placeholder="Enter or generate a load ID"
              style={styles.input}
              testID="input-load-id"
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => setLoadId(`demo-load-${Math.random().toString(36).slice(2, 8)}`)}
              style={styles.ghostBtn}
              testID="btn-gen-load-id"
            >
              <Text style={styles.ghostBtnText}>Generate</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Role</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => setRole('shipper')}
              style={[styles.pill, role === 'shipper' ? styles.pillActive : styles.pillInactive]}
              testID="pill-role-shipper"
            >
              <Text style={[styles.pillText, role === 'shipper' ? styles.pillTextActive : styles.pillTextInactive]}>Shipper</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole('driver')}
              style={[styles.pill, role === 'driver' ? styles.pillActive : styles.pillInactive]}
              testID="pill-role-driver"
            >
              <Text style={[styles.pillText, role === 'driver' ? styles.pillTextActive : styles.pillTextInactive]}>Driver</Text>
            </Pressable>
          </View>

          {!auth?.userId ? (
            <View style={styles.notice} testID="notice-anon">
              <Text style={styles.noticeTitle}>Not signed in</Text>
              <Text style={styles.noticeText}>
                Storage rules may block uploads without auth. Enter a user ID below to test on emulators, or sign in.
              </Text>
              <TextInput
                value={customUserId}
                onChangeText={setCustomUserId}
                placeholder="manual userId"
                style={styles.input}
                autoCapitalize="none"
                testID="input-user-id"
              />
            </View>
          ) : (
            <View style={styles.notice} testID="notice-auth">
              <Text style={styles.noticeTitle}>Signed in</Text>
              <Text style={styles.noticeText}>userId: {auth.userId}</Text>
            </View>
          )}
        </View>

        <View style={styles.card} testID="uploader-card">
          <Text style={styles.cardTitle}>Uploader</Text>
          <Text style={styles.helper}>Platform: {Platform.OS}</Text>

          {canUpload ? (
            <PhotoUploader
              loadId={loadId}
              userId={userId}
              role={role}
              allowMultiple
              buttonLabel="Pick Photos"
              onUploaded={(newItems) => {
                console.log('[PhotoUploaderDemo] onUploaded', newItems.length);
                setItems((prev) => [...newItems, ...prev]);
              }}
            />
          ) : (
            <Text style={styles.error} testID="error-missing-config">Enter Load ID and User ID to enable uploader</Text>
          )}
        </View>

        <View style={styles.card} testID="results-card">
          <Text style={styles.cardTitle}>Uploaded Results ({items.length})</Text>
          <View style={styles.grid}>
            {items.map((it) => (
              <View key={it.id} style={styles.thumb}>
                <Image source={{ uri: it.url }} style={styles.thumbImg} />
                <Text numberOfLines={1} style={styles.thumbText}>{it.id}</Text>
              </View>
            ))}
          </View>
          {items.length > 0 ? (
            <Pressable onPress={() => setItems([])} style={styles.clearBtn} testID="btn-clear">
              <Text style={styles.clearBtnText}>Clear list</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  card: { backgroundColor: theme.colors.white, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg },
  cardTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark, marginBottom: theme.spacing.md },
  label: { color: theme.colors.gray, marginBottom: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillInactive: { backgroundColor: theme.colors.white, borderColor: theme.colors.border },
  pillText: { fontWeight: '600' },
  pillTextActive: { color: theme.colors.white },
  pillTextInactive: { color: theme.colors.dark },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  ghostBtnText: { color: theme.colors.dark, fontWeight: '600' },
  notice: { marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.lightGray, borderRadius: 10 },
  noticeTitle: { fontWeight: '700', color: theme.colors.dark, marginBottom: 4 },
  noticeText: { color: theme.colors.gray },
  helper: { color: theme.colors.gray, marginBottom: theme.spacing.md },
  error: { color: theme.colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 90, },
  thumbImg: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee' },
  thumbText: { color: theme.colors.gray, fontSize: theme.fontSize.xs },
  clearBtn: { marginTop: theme.spacing.md, alignSelf: 'flex-start', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  clearBtnText: { color: theme.colors.white, fontWeight: '600' },
});