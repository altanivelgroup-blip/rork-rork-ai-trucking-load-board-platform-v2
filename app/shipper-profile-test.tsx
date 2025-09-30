import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface FirestoreDoc {
  [key: string]: unknown;
}

export default function ShipperProfileTestScreen() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<FirestoreDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const safeAlert = (title: string, message: string) => {
    try {
      Alert.alert(title, message);
    } catch (e) {
      console.error('[ShipperProfileTest] Alert failed', e);
    }
  };

  const fetchProfile = async () => {
    console.log('[ShipperProfileTest] Fetching shipper profile...');
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const user = auth.currentUser;
      if (!user || !user.uid) {
        const msg = 'Not signed in';
        setUid(null);
        setError(msg);
        safeAlert('Not signed in', msg);
        return;
      }
      setUid(user.uid);

      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const msg = `Profile document users/${user.uid} does not exist.`;
        setError(msg);
        safeAlert('Missing Profile', msg);
        return;
      }

      const data = snap.data() as FirestoreDoc;
      setProfile(data);
      console.log('[ShipperProfileTest] Profile fetched:', data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching profile';
      console.error('[ShipperProfileTest] Fetch error:', err);
      setError(message);
      safeAlert('Fetch Error', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container} testID="shipperProfileTestScreen">
      <Text style={styles.title} testID="shipperProfileTestTitle">Shipper Profile Test</Text>

      <View style={styles.metaRow} testID="uidRow">
        <Text style={styles.metaLabel}>Current UID:</Text>
        <Text style={styles.metaValue}>{uid ?? '—'}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow} testID="loading">
          <ActivityIndicator size="small" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox} testID="errorBox">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow} testID="buttonRow">
        <View style={styles.buttonWrapper}>
          <Button title="Back" onPress={() => router.back()} testID="backButton" />
        </View>
        <View style={styles.buttonWrapper}>
          <Button title="Fetch again" onPress={fetchProfile} disabled={loading} testID="refetchButton" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Profile JSON</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} testID="profileScroll">
        <View style={styles.codeBox} testID="profileJsonBox">
          <Text selectable style={styles.codeText}>
            {profile ? JSON.stringify(profile, null, 2) : 'No profile loaded.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const fontWeightBold = '700' as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: fontWeightBold,
    color: '#111827',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 14,
    color: '#374151',
  },
  metaValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: fontWeightBold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#374151',
  },
  errorBox: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  buttonWrapper: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: fontWeightBold,
    color: '#111827',
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 12,
  },
  codeBox: {
    minHeight: 120,
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    color: '#111827',
  },
});
