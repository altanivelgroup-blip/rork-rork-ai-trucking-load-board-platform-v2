import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { usePostLoad } from '@/hooks/usePostLoad';

type PickerKind = 'pickup' | 'delivery';

type DayCell = {
  date: Date;
  inCurrentMonth: boolean;
  isDisabled: boolean;
};

function Stepper({ current, total }: { current: number; total: number }) {
  const items = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  return (
    <View style={styles.stepper}>
      {items.map((n, idx) => {
        const active = n === current;
        return (
          <View key={n} style={styles.stepItem}>
            <View style={[styles.stepDot, active ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepNumber, active ? styles.stepNumberActive : styles.stepNumberInactive]}>{n}</Text>
            </View>
            {idx < items.length - 1 && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );
}

function formatDateLabel(d: Date | null): string {
  if (!d) return 'Select date';
  const mm = d.toLocaleString(undefined, { month: 'short' });
  const dd = d.getDate();
  const yyyy = d.getFullYear();
  return `${mm} ${dd}, ${yyyy}`;
}

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, months: number): Date { return new Date(d.getFullYear(), d.getMonth() + months, 1); }
function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendar(monthDate: Date, minDate?: Date): DayCell[] {
  const first = startOfMonth(monthDate);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0);
  const prevDays = prevMonth.getDate();
  const grid: DayCell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevDays - i);
    grid.push({ date, inCurrentMonth: false, isDisabled: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
    const isDisabled = !!minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    grid.push({ date, inCurrentMonth: true, isDisabled });
  }
  const rem = 42 - grid.length;
  for (let i = 1; i <= rem; i++) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, i);
    grid.push({ date, inCurrentMonth: false, isDisabled: true });
  }
  return grid;
}

function CalendarModal({
  visible,
  initialDate,
  onClose,
  onConfirm,
  minDate,
}: {
  visible: boolean;
  initialDate: Date | null;
  onClose: () => void;
  onConfirm: (d: Date) => void;
  minDate?: Date;
}) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState<Date>(initialDate ? startOfMonth(initialDate) : startOfMonth(today));
  const [temp, setTemp] = useState<Date | null>(initialDate ?? null);

  const grid = useMemo(() => buildCalendar(viewMonth, minDate ?? today), [viewMonth, minDate, today]);
  const monthLabel = useMemo(() => viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' }), [viewMonth]);

  const onUse = useCallback(() => {
    if (temp) onConfirm(temp);
  }, [temp, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable accessibilityRole="button" onPress={() => setViewMonth(addMonths(viewMonth, -1))} testID="calPrevMonth" style={styles.iconBtn}>
              <ChevronLeft color={theme.colors.dark} size={20} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable accessibilityRole="button" onPress={() => setViewMonth(addMonths(viewMonth, 1))} testID="calNextMonth" style={styles.iconBtn}>
              <ChevronRight color={theme.colors.dark} size={20} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} testID="calClose" style={styles.iconBtnRight}>
              <X color={theme.colors.gray} size={18} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <Text key={d} style={styles.weekHeaderText}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map((cell, idx) => {
              const selected = temp ? isSameDate(cell.date, temp) : false;
              const baseStyle = [styles.dayCell, !cell.inCurrentMonth && styles.dayCellMuted, cell.isDisabled && styles.dayCellDisabled, selected && styles.dayCellSelected];
              return (
                <Pressable
                  key={idx}
                  onPress={() => { if (!cell.isDisabled && cell.inCurrentMonth) setTemp(cell.date); }}
                  disabled={cell.isDisabled}
                  style={baseStyle}
                  accessibilityRole="button"
                  testID={`day-${cell.date.toISOString().slice(0,10)}`}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected, (!cell.inCurrentMonth || cell.isDisabled) && styles.dayTextMuted]}>
                    {cell.date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.modalFooter}>
            <Pressable onPress={() => { setTemp(today); }} style={styles.secondaryBtn} accessibilityRole="button" testID="todayBtn">
              <Text style={styles.secondaryBtnText}>Today</Text>
            </Pressable>
            <Pressable onPress={onUse} disabled={!temp} style={[styles.primaryBtn, !temp && styles.primaryBtnDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !temp }} testID="useDateBtn">
              <Text style={styles.primaryBtnText}>Use this date</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PostLoadStep4Dates() {
  const router = useRouter();
  const { draft, setField } = usePostLoad();
  const [pickupDate, setPickupDate] = useState<Date | null>(draft.pickupDate ?? null);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(draft.deliveryDate ?? null);
  const [picker, setPicker] = useState<PickerKind | null>(null);

  const canProceed = useMemo(() => !!pickupDate && !!deliveryDate, [pickupDate, deliveryDate]);

  const openPicker = useCallback((k: PickerKind) => setPicker(k), []);
  const closePicker = useCallback(() => setPicker(null), []);

  const onConfirm = useCallback((d: Date) => {
    if (picker === 'pickup') setPickupDate(d); else if (picker === 'delivery') setDeliveryDate(d);
    setPicker(null);
  }, [picker]);

  useEffect(() => {
    if (pickupDate) setField('pickupDate', pickupDate);
  }, [pickupDate, setField]);
  useEffect(() => {
    if (deliveryDate) setField('deliveryDate', deliveryDate);
  }, [deliveryDate, setField]);

  const onPrevious = useCallback(() => { router.back(); }, [router]);
  const onNext = useCallback(() => { console.log('[PostLoadStep4Dates] next', { pickupDate, deliveryDate }); if (pickupDate && deliveryDate) { router.push('/post-load-step5'); } }, [pickupDate, deliveryDate, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="postLoadHeaderTitle">Post Load</Text>
            <Stepper current={4} total={5} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Schedule</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Pickup Date</Text>
              <Pressable onPress={() => openPicker('pickup')} style={styles.dateField} accessibilityRole="button" testID="pickupDateBtn">
                <Text style={styles.dateText}>{formatDateLabel(pickupDate)}</Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Delivery Date</Text>
              <Pressable onPress={() => openPicker('delivery')} style={styles.dateField} accessibilityRole="button" testID="deliveryDateBtn">
                <Text style={styles.dateText}>{formatDateLabel(deliveryDate)}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footerRow}>
          <Pressable onPress={onPrevious} style={styles.secondaryBtn} accessibilityRole="button" testID="prevButton">
            <Text style={styles.secondaryBtnText}>Previous</Text>
          </Pressable>
          <Pressable onPress={onNext} style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]} disabled={!canProceed} accessibilityRole="button" accessibilityState={{ disabled: !canProceed }} testID="nextButton">
            <Text style={styles.primaryBtnText}>Next</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CalendarModal
        visible={picker !== null}
        initialDate={picker === 'pickup' ? pickupDate : deliveryDate}
        onClose={closePicker}
        onConfirm={onConfirm}
        minDate={new Date()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scrollContent: { padding: 16, paddingBottom: 24 },
  header: { alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark, marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepDotInactive: { backgroundColor: '#cbd5e1' },
  stepNumber: { fontSize: theme.fontSize.md, fontWeight: '700' },
  stepNumberActive: { color: theme.colors.white },
  stepNumberInactive: { color: theme.colors.dark, opacity: 0.7 },
  stepConnector: { width: 24, height: 4, backgroundColor: '#cbd5e1', marginHorizontal: 8, borderRadius: 2 },
  card: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  sectionTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.dark, textAlign: 'center', marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: 8 },
  dateField: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }) as number },
  dateText: { fontSize: theme.fontSize.md, color: theme.colors.dark },
  footerRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: Platform.select({ ios: 20, android: 16, default: 16 }) as number, paddingTop: 8, backgroundColor: theme.colors.lightGray },
  primaryBtn: { flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { backgroundColor: '#94a3b8' },
  primaryBtnText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: '800' },
  secondaryBtn: { flex: 1, backgroundColor: '#cbd5e1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: theme.colors.dark, fontSize: theme.fontSize.lg, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, alignItems: 'center', justifyContent: 'center', padding: 16 },
  calendarCard: { width: '100%', maxWidth: 680, backgroundColor: theme.colors.card, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  monthTitle: { flex: 1, textAlign: 'center', fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.dark },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconBtnRight: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8 },
  weekHeaderText: { flex: 1, textAlign: 'center', color: theme.colors.gray, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 12 },
  dayCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellMuted: { opacity: 0.35 },
  dayCellDisabled: { opacity: 0.5 },
  dayCellSelected: { backgroundColor: theme.colors.primary },
  dayText: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  dayTextMuted: { color: theme.colors.gray },
  dayTextSelected: { color: theme.colors.white },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
});