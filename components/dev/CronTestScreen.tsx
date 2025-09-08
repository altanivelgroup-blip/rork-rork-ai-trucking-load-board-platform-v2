import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet, Platform } from 'react-native';

const BASE: string = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '';
const SECRET = 'lrk_prod_cron_secret_6b3a2d1f4e934a9f9a2c8b07f1a6d3f2';

type HitResult = { ok: boolean; json: unknown } | { ok: false; json: unknown };

async function hit(path: string): Promise<HitResult> {
  console.log('[CronTest] Hitting', path, 'BASE=', BASE);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'x-cron-secret': SECRET },
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json } as HitResult;
  } catch (e: unknown) {
    console.error('[CronTest] Request failed', e);
    return { ok: false, json: { error: (e as Error)?.message ?? 'request failed' } };
  }
}

export default function CronTestScreen() {
  const [out, setOut] = useState<unknown>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const disabled = useMemo(() => busy || !BASE, [busy, BASE]);

  const runArchive = useCallback(async () => {
    if (!BASE) {
      setOut({ ok: false, json: { error: 'Missing EXPO_PUBLIC_RORK_API_BASE_URL' } });
      return;
    }
    setBusy(true);
    try {
      const res = await hit('/api/cron/archive-loads');
      setOut(res);
    } finally {
      setBusy(false);
    }
  }, []);

  const runPurge = useCallback(async () => {
    if (!BASE) {
      setOut({ ok: false, json: { error: 'Missing EXPO_PUBLIC_RORK_API_BASE_URL' } });
      return;
    }
    setBusy(true);
    try {
      const res = await hit('/api/cron/purge-loads?days=3');
      setOut(res);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <View style={styles.container} testID="cron-test-container">
      <Text style={styles.title} testID="cron-test-title">Cron Test (Dev)</Text>
      <View style={styles.row}>
        <Button title={busy ? 'Running…' : 'Run Archive Now'} onPress={runArchive} disabled={disabled} />
      </View>
      <View style={styles.row}>
        <Button title={busy ? 'Running…' : 'Run Purge Now (3d)'} onPress={runPurge} disabled={disabled} />
      </View>
      <Text selectable style={styles.output} testID="cron-test-output">
        {JSON.stringify(out, null, 2)}
      </Text>
      <Text style={styles.note} testID="cron-test-note">
        Uses EXPO_PUBLIC_RORK_API_BASE_URL and a dev-only secret. Remove before production build. Platform: {Platform.OS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    backgroundColor: '#F7F7F8',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  row: {
    marginTop: 8,
  },
  output: {
    marginTop: 12,
    fontSize: 12,
    color: '#11181C',
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.7,
    color: '#11181C',
  },
});
