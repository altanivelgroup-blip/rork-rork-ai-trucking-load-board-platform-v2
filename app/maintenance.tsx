import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Modal, TextInput, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { CheckCircle2, CalendarClock, Settings2, ClipboardList, ListChecks, Gauge, Truck, Wrench, PanelsTopLeft, ArrowLeft } from 'lucide-react-native';
import { useMaintenance } from '@/hooks/useMaintenance';
type TruckItem = { id: string; name: string };

type TabKey = 'overview' | 'checklist' | 'logs' | 'schedule';

const TRUCKS: TruckItem[] = [
  { id: 't1', name: 'Main Hotshot' },
  { id: 't2', name: 'City Runner' },
  { id: 't3', name: 'Heavy Hauler' },
];

const TRUCK_TO_TRAILER: Record<string, string> = {
  t1: 'flatbed',
  t2: 'dump',
  t3: 'car',
};

export default function MaintenanceScreen() {
  const { getTrailerOdometer, getNextServiceDate, getLastServiceDate, categories, addLog, addSchedule } = useMaintenance();
  const [selectedTruckId, setSelectedTruckId] = useState<string>(TRUCKS[1]?.id ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editKind, setEditKind] = useState<'last' | 'next' | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [mileageInput, setMileageInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedTruck = useMemo(() => TRUCKS.find(t => t.id === selectedTruckId), [selectedTruckId]);

  const renderCategory = useCallback(({ item }: { item: import('@/hooks/useMaintenance').MaintenanceCategory }) => {
    const trailerId = TRUCK_TO_TRAILER[selectedTruckId] ?? selectedTruckId;
    const last = getLastServiceDate(trailerId, item.id) ?? '—';
    return (
      <View key={item.id} style={styles.catCard} testID={`cat-${item.id}`}>
        <View style={styles.catHeader}>
          <Settings2 color={theme.colors.primary} size={18} />
          <Text style={styles.catTitle}>{item.title}</Text>
        </View>
        <Text style={styles.linkText}>{item.guideline}</Text>
        <View style={styles.catFooterRow}>
          <Text style={styles.catLast}>Last: {last}</Text>
          <View style={styles.catActions}>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                setEditKind('last');
                setEditCategoryId(item.id);
                setMileageInput('');
                setDateInput(new Date().toISOString().slice(0,10));
              }}
              testID={`add-last-${item.id}`}
            >
              <Text style={styles.smallBtnText}>Add Last</Text>
            </Pressable>
            <Pressable
              style={[styles.smallBtn, styles.smallBtnOutline]}
              onPress={() => {
                setEditKind('next');
                setEditCategoryId(item.id);
                setDateInput('');
              }}
              testID={`add-next-${item.id}`}
            >
              <Text style={[styles.smallBtnText, styles.smallBtnTextOutline]}>Add Next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }, [getLastServiceDate, selectedTruckId]);

  const onAskAI = useCallback(() => {
    try {
      router.push('/(tabs)/service-finder');
    } catch (e) {
      console.log('Navigate AI error', e);
    }
  }, []);

  const Overview = useMemo(() => {
    const trailerId = TRUCK_TO_TRAILER[selectedTruckId] ?? selectedTruckId;
    const odo = getTrailerOdometer(trailerId);
    const next = getNextServiceDate(trailerId) ?? '—';
    const lastAny = categories.length > 0 ? getLastServiceDate(trailerId, categories[0]?.id) : undefined;
    const last = lastAny ?? '—';
    return (
      <View style={styles.section}>
        <View style={styles.healthCard} testID="health-card">
          <View style={styles.healthLeft}>
            <View style={styles.healthRow}>
              <CheckCircle2 color={theme.colors.secondary} size={20} />
              <Text style={styles.healthLabel}>Overall Health</Text>
            </View>
            <Text style={styles.healthValue}>Good</Text>
          </View>
          <View style={styles.healthStats}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Current Odometer</Text>
              <Text style={styles.statValue}>{odo !== undefined ? `${odo.toLocaleString()} mi` : '—'}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Next Service</Text>
              <Text style={styles.statValueStrong}>{next}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Last Service</Text>
              <Text style={styles.statValueStrong}>{last}</Text>
            </View>
          </View>
          <Pressable onPress={onAskAI} style={styles.aiButton} testID="ask-ai">
            <Text style={styles.aiText}>Ask AI</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Maintenance Categories</Text>
        <FlatList
          data={categories}
          keyExtractor={(it) => it.id}
          renderItem={renderCategory}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.gridContent}
          scrollEnabled={false}
        />
      </View>
    );
  }, [onAskAI, renderCategory, categories, getLastServiceDate, getNextServiceDate, getTrailerOdometer, selectedTruckId]);

  const renderTabContent = useCallback(() => {
    if (activeTab === 'overview') return Overview;
    if (activeTab === 'checklist') {
      return (
        <View style={styles.placeholder} testID="tab-checklist">
          <ClipboardList color={theme.colors.gray} size={24} />
          <Text style={styles.placeholderText}>Checklist coming next</Text>
        </View>
      );
    }
    if (activeTab === 'logs') {
      return (
        <View style={styles.placeholder} testID="tab-logs">
          <ListChecks color={theme.colors.gray} size={24} />
          <Text style={styles.placeholderText}>Service logs will appear here</Text>
        </View>
      );
    }
    return (
      <View style={styles.placeholder} testID="tab-schedule">
        <CalendarClock color={theme.colors.gray} size={24} />
        <Text style={styles.placeholderText}>Scheduling UI coming</Text>
      </View>
    );
  }, [Overview, activeTab]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Truck Maintenance',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerBtn} testID="back-btn-truck">
              <ArrowLeft color={theme.colors.primary} size={20} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Truck color={theme.colors.primary} size={20} />
          <Text style={styles.title} testID="maint-title">Select Truck:</Text>
        </View>

        <View style={styles.infoBar} testID="route-hint">
          <Text style={styles.infoTitle}>Open: Tabs → Maintenance</Text>
          <Text style={styles.infoDesc}>Live data: Odometer, Last service per category, and Next service dates are synced.</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {TRUCKS.map((t) => {
            const active = t.id === selectedTruckId;
            return (
              <Pressable
                key={t.id}
                onPress={() => setSelectedTruckId(t.id)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`truck-${t.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <PanelsTopLeft color={active ? theme.colors.white : theme.colors.primary} size={16} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.tabs}>
          {(
            [
              { key: 'overview', label: 'Overview', icon: Gauge },
              { key: 'checklist', label: 'Checklist', icon: ClipboardList },
              { key: 'logs', label: 'Logs', icon: ListChecks },
              { key: 'schedule', label: 'Schedule', icon: CalendarClock },
            ] as { key: TabKey; label: string; icon: any }[]
          ).map(({ key, label, icon: Icon }) => {
            const active = key === activeTab;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={styles.tabBtn}
                testID={`tab-${key}`}
              >
                <Icon color={active ? theme.colors.primary : theme.colors.gray} size={18} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                {active && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>

        {selectedTruck?.id ? (
          <View>
            {renderTabContent()}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Wrench color={theme.colors.gray} size={24} />
            <Text style={styles.placeholderText}>Select a truck to begin</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!editKind} animationType="slide" transparent testID="edit-modal">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editKind === 'last' ? 'Add Last Service' : 'Add Next Service'}</Text>
            {editKind === 'last' ? (
              <>
                <Text style={styles.inputLabel}>Mileage</Text>
                <TextInput
                  testID="input-mileage"
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 152000"
                  value={mileageInput}
                  onChangeText={setMileageInput}
                />
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  testID="input-date-last"
                  style={styles.input}
                  placeholder="2025-01-14"
                  value={dateInput}
                  onChangeText={setDateInput}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  testID="input-date-next"
                  style={styles.input}
                  placeholder="2025-02-01"
                  value={dateInput}
                  onChangeText={setDateInput}
                />
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => {
                  setEditKind(null);
                  setEditCategoryId('');
                  setMileageInput('');
                  setDateInput('');
                }}
                testID="cancel-edit"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalSave]}
                disabled={submitting}
                onPress={async () => {
                  try {
                    const trailerId = TRUCK_TO_TRAILER[selectedTruckId] ?? selectedTruckId;
                    setSubmitting(true);
                    if (editKind === 'last') {
                      const mileage = mileageInput ? Number(mileageInput) : undefined;
                      if (mileageInput && Number.isNaN(Number(mileageInput))) {
                        Alert.alert('Invalid mileage', 'Please enter a number');
                        setSubmitting(false);
                        return;
                      }
                      await addLog({ trailerId, categoryId: editCategoryId, summary: 'Manual entry', mileage, date: dateInput || undefined });
                    } else if (editKind === 'next') {
                      const due = dateInput.trim();
                      if (!due) {
                        Alert.alert('Missing date', 'Please enter a due date');
                        setSubmitting(false);
                        return;
                      }
                      await addSchedule({ trailerId, categoryId: editCategoryId, title: 'Scheduled service', dueDate: due });
                    }
                    setEditKind(null);
                    setEditCategoryId('');
                    setMileageInput('');
                    setDateInput('');
                  } catch (e) {
                    Alert.alert('Error', 'Could not save. Please try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                testID="save-edit"
              >
                <Text style={styles.modalSaveText}>{submitting ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  chips: { paddingVertical: theme.spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    marginRight: 8,
    gap: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.primary, fontWeight: '700' },
  chipTextActive: { color: theme.colors.white },

  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  tabText: { color: theme.colors.gray, marginTop: 2, fontSize: theme.fontSize.sm },
  tabTextActive: { color: theme.colors.primary, fontWeight: '700' },
  tabUnderline: { height: 2, backgroundColor: theme.colors.primary, width: '80%', borderRadius: 1, marginTop: 4 },

  section: { marginTop: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '800', color: theme.colors.dark, marginBottom: theme.spacing.sm },

  healthCard: {
    position: 'relative',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  healthLeft: { marginBottom: theme.spacing.sm },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthLabel: { color: theme.colors.gray, fontWeight: '600' },
  healthValue: { color: theme.colors.success, fontWeight: '800', fontSize: theme.fontSize.xl, marginTop: 2 },
  healthStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statBlock: { flex: 1 },
  statLabel: { color: theme.colors.gray, marginBottom: 4 },
  statValue: { color: theme.colors.dark, fontWeight: '700' },
  statValueStrong: { color: theme.colors.dark, fontWeight: '800' },
  aiButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  aiText: { color: theme.colors.white, fontWeight: '700' },

  gridContent: { gap: 12 },
  column: { gap: 12 },
  catCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  catTitle: { fontWeight: '800', color: theme.colors.dark },
  linkText: { color: theme.colors.primary, fontWeight: '700', marginBottom: 6 },
  catFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catActions: { flexDirection: 'row', gap: 8 },
  catLast: { color: theme.colors.gray },
  smallBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.md },
  smallBtnOutline: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.primary },
  smallBtnText: { color: theme.colors.white, fontWeight: '700' },
  smallBtnTextOutline: { color: theme.colors.primary, fontWeight: '700' },

  placeholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  placeholderText: { color: theme.colors.gray, marginTop: 8 },

  infoBar: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoTitle: { fontWeight: '800', color: theme.colors.dark, marginBottom: 4 },
  infoDesc: { color: theme.colors.gray },

  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontWeight: '800', color: theme.colors.dark, fontSize: theme.fontSize.md, marginBottom: theme.spacing.sm },
  inputLabel: { color: theme.colors.gray, marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.colors.white, color: theme.colors.dark },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: theme.spacing.md },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  modalCancel: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  modalSave: { backgroundColor: theme.colors.primary },
  modalCancelText: { color: theme.colors.dark, fontWeight: '700' },
  modalSaveText: { color: theme.colors.white, fontWeight: '800' },
});