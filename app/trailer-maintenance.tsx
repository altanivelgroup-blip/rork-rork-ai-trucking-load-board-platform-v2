import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Modal, TextInput, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import {
  CheckCircle2,
  CalendarClock,
  Bell,
  ClipboardList,
  ListChecks,
  Gauge,
  PanelsTopLeft,
  Settings2,
  Bot,
  Plus,
  ArrowLeft,
} from 'lucide-react-native';
import { useMaintenance } from '@/hooks/useMaintenance';

type TabKey = 'overview' | 'logs' | 'alerts' | 'schedule';

export default function TrailerMaintenanceScreen() {
  const { trailers, categories, logs, alerts, schedule, getLastServiceDate, addLog, addSchedule } = useMaintenance();
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>(trailers[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editKind, setEditKind] = useState<'last' | 'next' | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [mileageInput, setMileageInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedTrailer = useMemo(() => trailers.find(t => t.id === selectedTrailerId), [trailers, selectedTrailerId]);

  const onAskAI = useCallback(() => {
    try {
      const trailer = selectedTrailer?.name ?? 'Trailer';
      const q = encodeURIComponent(`${trailer} maintenance recommendations within 100 miles`);
      router.push(`/(tabs)/service-finder?q=${q}`);
    } catch (e) {
      console.log('Navigate AI error', e);
    }
  }, [selectedTrailer?.name]);

  const onAddService = useCallback(() => {
    try {
      console.log('Add service tapped');
    } catch (e) {
      console.log('Add service error', e);
    }
  }, []);

  const onOpenCategory = useCallback((cat: { id: string; title: string }) => {
    try {
      router.push({ pathname: '/trailer-maintenance/[category]', params: { category: cat.id, title: cat.title, trailerId: selectedTrailerId } });
    } catch (e) {
      console.log('Open category error', e);
    }
  }, [selectedTrailerId]);

  const renderCategory = useCallback(({ item }: { item: { id: string; title: string; guideline: string } }) => (
    <View key={item.id} style={styles.catCard} testID={`cat-${item.id}`}>
      <View style={styles.catHeader}>
        <Settings2 color={theme.colors.primary} size={18} />
        <Text style={styles.catTitle}>{item.title}</Text>
      </View>
      <Text style={styles.linkText}>{item.guideline}</Text>
      <View style={styles.catFooterRow}>
        <Text style={styles.catLast}>Last: {getLastServiceDate(selectedTrailerId, item.id) ?? 'Never'}</Text>
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
  ), [getLastServiceDate, selectedTrailerId]);

  const Overview = useMemo(() => (
    <View style={styles.section}>
      <View style={styles.healthCard} testID="health-card">
        <View style={styles.healthLeft}>
          <View style={styles.healthRow}>
            <CheckCircle2 color={theme.colors.success} size={20} />
            <Text style={styles.healthLabel}>Overall Health</Text>
          </View>
          <Text style={styles.healthValue}>Excellent</Text>
        </View>
        <View style={styles.healthStats}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Next Inspection</Text>
            <Text style={styles.statValueStrong}>1/14/2025</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Active Alerts</Text>
            <Text style={[styles.statValueStrong, { color: theme.colors.success }]}>{alerts.filter(a=>a.trailerId===selectedTrailerId).length}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Last Service</Text>
            <Text style={styles.statValueStrong}>{logs.find(l=>l.trailerId===selectedTrailerId)?.date ?? 'N/A'}</Text>
          </View>
        </View>
        <Pressable onPress={onAskAI} style={styles.aiButton} testID="ask-ai">
          <Bot color={theme.colors.white} size={16} />
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
  ), [onAskAI, renderCategory, alerts, logs, categories, selectedTrailerId]);

  const renderTabContent = useCallback(() => {
    if (activeTab === 'overview') return Overview;
    if (activeTab === 'logs') {
      return (
        <View style={styles.section} testID="tab-logs">
          <Text style={styles.sectionTitle}>Logs</Text>
          <FlatList
            data={logs.filter(l=>l.trailerId===selectedTrailerId)}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <ListChecks color={theme.colors.primary} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.summary}</Text>
                  <Text style={styles.itemMeta}>{item.date} • {item.mileage ? `${item.mileage} mi` : ''}</Text>
                </View>
              </View>
            )}
          />
        </View>
      );
    }
    if (activeTab === 'alerts') {
      return (
        <View style={styles.section} testID="tab-alerts">
          <Text style={styles.sectionTitle}>Alerts</Text>
          <FlatList
            data={alerts.filter(a=>a.trailerId===selectedTrailerId)}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Bell color={theme.colors.danger} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.message}</Text>
                  <Text style={styles.itemMeta}>{item.createdAt} • {item.severity.toUpperCase()}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.itemMeta}>No active alerts</Text>}
          />
        </View>
      );
    }
    return (
      <View style={styles.section} testID="tab-schedule">
        <Text style={styles.sectionTitle}>Schedule</Text>
        <FlatList
          data={schedule.filter(s=>s.trailerId===selectedTrailerId)}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <CalendarClock color={theme.colors.gray} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>Due {item.dueDate}</Text>
              </View>
            </View>
          )}
        />
      </View>
    );
  }, [Overview, activeTab, logs, alerts, schedule, selectedTrailerId]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Trailer Maintenance',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerIcon} testID="back-btn-trailer">
              <ArrowLeft color={theme.colors.primary} size={20} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={onAddService} style={styles.headerIcon} testID="add-service">
              <Plus color={theme.colors.primary} size={20} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title} testID="maint-title">Select Trailer:</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {trailers.map((t) => {
            const active = t.id === selectedTrailerId;
            return (
              <Pressable
                key={t.id}
                onPress={() => setSelectedTrailerId(t.id)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`trailer-${t.id}`}
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
              { key: 'logs', label: 'Logs', icon: ListChecks },
              { key: 'alerts', label: 'Alerts', icon: Bell },
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

        {selectedTrailer?.id ? (
          <View>
            {renderTabContent()}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <ClipboardList color={theme.colors.gray} size={24} />
            <Text style={styles.placeholderText}>Select a trailer to begin</Text>
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
                    setSubmitting(true);
                    if (editKind === 'last') {
                      const mileage = mileageInput ? Number(mileageInput) : undefined;
                      if (mileageInput && Number.isNaN(Number(mileageInput))) {
                        Alert.alert('Invalid mileage', 'Please enter a number');
                        setSubmitting(false);
                        return;
                      }
                      await addLog({ trailerId: selectedTrailerId, categoryId: editCategoryId, summary: 'Manual entry', mileage, date: dateInput || undefined });
                    } else if (editKind === 'next') {
                      const due = dateInput.trim();
                      if (!due) {
                        Alert.alert('Missing date', 'Please enter a due date');
                        setSubmitting(false);
                        return;
                      }
                      await addSchedule({ trailerId: selectedTrailerId, categoryId: editCategoryId, title: 'Scheduled service', dueDate: due });
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
  statValueStrong: { color: theme.colors.dark, fontWeight: '800' },
  aiButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiText: { color: theme.colors.white, fontWeight: '700' },

  headerIcon: { paddingHorizontal: 12, paddingVertical: 8 },

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
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 8 },
  itemTitle: { color: theme.colors.dark, fontWeight: '700' },
  itemMeta: { color: theme.colors.gray, marginTop: 2 },

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
