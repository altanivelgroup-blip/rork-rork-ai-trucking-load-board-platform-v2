import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { theme } from '@/constants/theme';
import {
  API_BASE_URL,
  MAPBOX_TOKEN,
  ORS_API_KEY,
  EIA_API_KEY,
  OPENWEATHER_API_KEY,
  hasApiBaseUrl,
  hasMapbox,
  hasORS,
  hasEIA,
  hasOpenWeather,
} from '@/utils/env';

interface CheckResult {
  ok: boolean;
  message: string;
  meta?: Record<string, unknown>;
}

export default function ApiCheckScreen() {
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, CheckResult>>({});

  const setOne = useCallback((key: string, value: CheckResult) => {
    setResults((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runTrpcCheck = useCallback(async () => {
    try {
      const data = await trpcClient.example.hi.mutate({ name: 'LoadRun' });
      setOne('trpc', { ok: true, message: 'tRPC reachable', meta: { date: String(data?.date ?? '') } });
    } catch (e: any) {
      setOne('trpc', { ok: false, message: e?.message ?? 'Failed to reach backend' });
    }
  }, [setOne]);

  const runMapboxCheck = useCallback(async () => {
    if (!hasMapbox) {
      setOne('mapbox', { ok: false, message: 'Missing EXPO_PUBLIC_MAPBOX_TOKEN' });
      return;
    }
    try {
      const data = await trpcClient.geocode.search.query({ q: 'Dallas', provider: 'mapbox', mapboxToken: MAPBOX_TOKEN });
      const first = Array.isArray(data) ? data[0] : null;
      setOne('mapbox', { ok: true, message: 'Mapbox geocode OK', meta: { sample: (first as any)?.address ?? (first as any)?.name ?? 'n/a' } });
    } catch (e: any) {
      setOne('mapbox', { ok: false, message: e?.message ?? 'Mapbox geocode failed' });
    }
  }, [setOne]);

  const runORSCheck = useCallback(async () => {
    if (!hasORS) {
      setOne('ors', { ok: false, message: 'Missing EXPO_PUBLIC_ORS_API_KEY' });
      return;
    }
    try {
      const origin = { lat: 32.7767, lon: -96.7970 }; // Dallas
      const destination = { lat: 29.7604, lon: -95.3698 }; // Houston
      const data = await trpcClient.route.eta.query({ origin, destination, provider: 'ors', orsKey: ORS_API_KEY, profile: 'driving-hgv' });
      const ok = typeof (data as any)?.durationSec === 'number' && typeof (data as any)?.distanceMeters === 'number';
      setOne('ors', { ok, message: ok ? 'ORS directions OK' : 'ORS returned invalid data', meta: data as any });
    } catch (e: any) {
      setOne('ors', { ok: false, message: e?.message ?? 'ORS failed' });
    }
  }, [setOne]);

  const runEiaCheck = useCallback(async () => {
    if (!hasEIA) {
      setOne('eia', { ok: false, message: 'Missing EXPO_PUBLIC_EIA_API_KEY' });
      return;
    }
    try {
      const data = await trpcClient.fuel.eiaDiesel.query({ state: 'Texas', eiaApiKey: EIA_API_KEY });
      const ok = typeof (data as any)?.price === 'number';
      setOne('eia', { ok, message: ok ? 'EIA diesel OK' : 'EIA returned no price', meta: data as any });
    } catch (e: any) {
      setOne('eia', { ok: false, message: e?.message ?? 'EIA failed' });
    }
  }, [setOne]);

  const runWeatherCheck = useCallback(async () => {
    if (!hasOpenWeather) {
      setOne('openweather', { ok: false, message: 'Missing EXPO_PUBLIC_OPENWEATHER_API_KEY' });
      return;
    }
    try {
      const data = await trpcClient.weather.current.query({ lat: 40.7128, lon: -74.0060, openWeatherKey: OPENWEATHER_API_KEY });
      const ok = typeof (data as any)?.tempF === 'number';
      setOne('openweather', { ok, message: ok ? 'OpenWeather current OK' : 'OpenWeather returned no temp', meta: data as any });
    } catch (e: any) {
      setOne('openweather', { ok: false, message: e?.message ?? 'OpenWeather failed' });
    }
  }, [setOne]);

  const runAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setResults({});
    await runTrpcCheck();
    await Promise.all([
      runMapboxCheck(),
      runORSCheck(),
      runEiaCheck(),
      runWeatherCheck(),
    ]);
    setRunning(false);
  }, [running, runTrpcCheck, runMapboxCheck, runORSCheck, runEiaCheck, runWeatherCheck]);

  const envList = useMemo(() => ([
    { key: 'EXPO_PUBLIC_RORK_API_BASE_URL', present: hasApiBaseUrl, sample: API_BASE_URL ?? '' },
    { key: 'EXPO_PUBLIC_MAPBOX_TOKEN', present: hasMapbox, sample: MAPBOX_TOKEN ? `${MAPBOX_TOKEN.slice(0, 8)}…` : '' },
    { key: 'EXPO_PUBLIC_ORS_API_KEY', present: hasORS, sample: ORS_API_KEY ? `${String(ORS_API_KEY).slice(0, 6)}…` : '' },
    { key: 'EXPO_PUBLIC_EIA_API_KEY', present: hasEIA, sample: EIA_API_KEY ? `${String(EIA_API_KEY).slice(0, 6)}…` : '' },
    { key: 'EXPO_PUBLIC_OPENWEATHER_API_KEY', present: hasOpenWeather, sample: OPENWEATHER_API_KEY ? `${String(OPENWEATHER_API_KEY).slice(0, 6)}…` : '' },
  ]), [hasApiBaseUrl, hasMapbox, hasORS, hasEIA, hasOpenWeather]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'API Sanity Check' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Environment</Text>
        {envList.map((env) => (
          <View key={env.key} style={[styles.row, styles.card]} testID={`env-${env.key}`}>
            <Text style={[styles.label, { flex: 1 }]} numberOfLines={2}>{env.key}</Text>
            <Text style={{ color: env.present ? '#16A34A' : '#DC2626', fontWeight: '700' }}>
              {env.present ? 'SET' : 'MISSING'}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={runAll}
          disabled={running}
          style={[styles.primaryBtn, running && styles.btnDisabled]}
          testID="btn-run-all"
        >
          <Text style={styles.btnText}>{running ? 'Running…' : 'Run All Checks'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Results</Text>
        {[
          { k: 'trpc', name: 'Backend (tRPC)' },
          { k: 'mapbox', name: 'Mapbox Geocode' },
          { k: 'ors', name: 'OpenRouteService' },
          { k: 'eia', name: 'EIA Diesel' },
          { k: 'openweather', name: 'OpenWeather' },
        ].map((r) => {
          const res = results[r.k];
          return (
            <View key={r.k} style={[styles.card]} testID={`result-${r.k}`}>
              <View style={styles.row}>
                <Text style={styles.label}>{r.name}</Text>
                <Text style={{ fontWeight: '700', color: res?.ok ? '#16A34A' : res ? '#DC2626' : theme.colors.gray }}>
                  {res ? (res.ok ? 'PASS' : 'FAIL') : '—'}
                </Text>
              </View>
              {res?.message ? <Text style={styles.message} numberOfLines={3}>{res.message}</Text> : null}
              {res?.meta ? (
                <Text style={styles.meta} numberOfLines={2}>{JSON.stringify(res.meta)}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  label: { fontSize: theme.fontSize.md, color: theme.colors.dark, fontWeight: '600' },
  primaryBtn: { marginTop: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, alignItems: 'center', padding: theme.spacing.md },
  btnText: { color: theme.colors.white, fontWeight: '700' },
  btnDisabled: { backgroundColor: theme.colors.gray },
  message: { marginTop: 6, color: theme.colors.dark },
  meta: { marginTop: 4, color: theme.colors.gray, fontSize: theme.fontSize.sm },
});