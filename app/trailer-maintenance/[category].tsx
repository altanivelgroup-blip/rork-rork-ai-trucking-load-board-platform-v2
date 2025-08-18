import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { ArrowLeft, Save, Wrench, CheckCircle2, AlertTriangle, CalendarClock, Plus } from 'lucide-react-native';
import { useMaintenance } from '@/hooks/useMaintenance';

interface LogItem { id: string; categoryId: string; date: string; summary: string; mileage?: number }

const STORAGE_KEY = 'trailer_maint_logs_v1';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; title?: string; trailerId?: string }>();
  const categoryId = typeof params.category === 'string' ? params.category : '';
  const title = typeof params.title === 'string' ? params.title : 'Category';
  const trailerId = typeof params.trailerId === 'string' ? params.trailerId : '';

  const { addLog, getLogsByCategory } = useMaintenance();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [note, setNote] = useState<string>('');
  const [mileage, setMileage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const arr = getLogsByCategory(trailerId, categoryId);
      setLogs(arr as LogItem[]);
    } catch (e) {
      console.log('[CategoryDetail] hydrate error', e);
      setError('Failed to load logs.');
    }
  }, [trailerId, categoryId, getLogsByCategory]);

  const lastService = useMemo(() => logs[0]?.date, [logs]);

  const saveLog = useCallback(async () => {
    if (!categoryId || !trailerId) return;
    if (!note.trim()) {
      Alert.alert('Add details', 'Please enter a short summary of the work.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const created = await addLog({ trailerId, categoryId, summary: note.trim(), mileage: mileage ? Number(mileage) : undefined });
      if (created) {
        setLogs(prev => [
          { id: created.id, categoryId: created.categoryId, date: created.date, summary: created.summary, mileage: created.mileage },
          ...prev,
        ]);
        setNote('');
        setMileage('');
      }
    } catch (e) {
      console.log('[CategoryDetail] save error', e);
      setError('Could not save. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [categoryId, trailerId, note, mileage, addLog]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBtn}
              testID="back-btn"
            >
              <ArrowLeft color={theme.colors.primary} size={20} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={saveLog} disabled={isSaving} style={styles.headerBtn} testID="save-log-btn">
              <Save color={theme.colors.primary} size={20} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryCard} testID="summary-card">
          <View style={styles.summaryRow}>
            <Wrench size={18} color={theme.colors.primary} />
            <Text style={styles.summaryTitle}>{title}</Text>
          </View>
          <View style={styles.kpis}>
            <View style={styles.kpi}>
              <CheckCircle2 color={theme.colors.success} size={18} />
              <Text style={styles.kpiLabel}>Last Service</Text>
              <Text style={styles.kpiValue}>{lastService ?? 'N/A'}</Text>
            </View>
            <View style={styles.kpi}>
              <AlertTriangle color={theme.colors.danger} size={18} />
              <Text style={styles.kpiLabel}>Alerts</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.success }]}>0</Text>
            </View>
            <View style={styles.kpi}>
              <CalendarClock color={theme.colors.gray} size={18} />
              <Text style={styles.kpiLabel}>Next Due</Text>
              <Text style={styles.kpiValue}>—</Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="What did you do? (e.g., Replaced brake pads)"
              placeholderTextColor={theme.colors.gray}
              value={note}
              onChangeText={setNote}
              autoCapitalize="sentences"
              testID="log-note-input"
            />
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Mileage (optional)"
              placeholderTextColor={theme.colors.gray}
              keyboardType={Platform.OS === 'web' ? 'numeric' as any : 'number-pad'}
              value={mileage}
              onChangeText={setMileage}
              testID="log-mileage-input"
            />
          </View>
          <Pressable
            onPress={saveLog}
            style={[styles.addBtn, isSaving && styles.addBtnDisabled]}
            disabled={isSaving}
            testID="add-log-btn"
          >
            <Plus color={theme.colors.white} size={18} />
            <Text style={styles.addBtnText}>{isSaving ? 'Saving…' : 'Add Log'}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText} testID="error-text">{error}</Text> : null}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  scroll: { padding: theme.spacing.md },

  summaryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryTitle: { fontSize: theme.fontSize.md, fontWeight: '800', color: theme.colors.dark },
  kpis: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kpi: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.lightGray },
  kpiLabel: { color: theme.colors.gray, marginTop: 4 },
  kpiValue: { color: theme.colors.dark, fontWeight: '800', marginTop: 2 },

  form: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '800', color: theme.colors.dark, marginBottom: 8 },
  inputRow: { marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.dark,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 44,
    borderRadius: theme.borderRadius.md,
    marginTop: 8,
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: theme.colors.white, fontWeight: '800' },
  errorText: { color: theme.colors.danger, marginTop: 8 },
});
