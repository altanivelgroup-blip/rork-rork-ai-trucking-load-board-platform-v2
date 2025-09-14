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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { usePostLoad } from '@/hooks/usePostLoad';
import { QUICK_TZS, ALL_TZS } from '@/constants/timezones';
import { FORCE_DELIVERY_TZ } from '@/utils/env';

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

type PickerKind = 'pickup' | 'delivery' | 'deliveryLocal';
type TimePickerKind = 'deliveryLocalTime';

type DayCell = {
  date: Date;
  inCurrentMonth: boolean;
  isDisabled: boolean;
};

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

function TimePickerModal({
  visible,
  initialTime,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialTime: string;
  onClose: () => void;
  onConfirm: (time: string) => void;
}) {
  const [hour, setHour] = useState<string>(() => {
    const parts = initialTime.split(':');
    return parts[0] || '17';
  });
  const [minute, setMinute] = useState<string>(() => {
    const parts = initialTime.split(':');
    return parts[1] || '00';
  });

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

  const onUse = useCallback(() => {
    const timeString = `${hour}:${minute}`;
    onConfirm(timeString);
  }, [hour, minute, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.timePickerCard}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <Pressable accessibilityRole="button" onPress={onClose} testID="timePickerClose" style={styles.iconBtnRight}>
              <X color={theme.colors.gray} size={18} />
            </Pressable>
          </View>

          <View style={styles.timePickerContent}>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Hour</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hour}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    if (!isNaN(num) && num >= 0 && num <= 23) {
                      setHour(String(num).padStart(2, '0'));
                    } else if (text === '') {
                      setHour('');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="HH"
                  testID="hourInput"
                />
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Minute</Text>
                <TextInput
                  style={styles.timeInput}
                  value={minute}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    if (!isNaN(num) && num >= 0 && num <= 59) {
                      setMinute(String(num).padStart(2, '0'));
                    } else if (text === '') {
                      setMinute('');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="MM"
                  testID="minuteInput"
                />
              </View>
            </View>

            <View style={styles.quickTimeRow}>
              <Text style={styles.quickTimeLabel}>Quick select:</Text>
              {['08:00', '12:00', '17:00', '18:00'].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => {
                    const [h, m] = time.split(':');
                    setHour(h);
                    setMinute(m);
                  }}
                  style={styles.quickTimePill}
                  accessibilityRole="button"
                  testID={`quickTime-${time}`}
                >
                  <Text style={styles.quickTimeText}>{time}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.modalFooter}>
            <Pressable onPress={onClose} style={styles.secondaryBtn} accessibilityRole="button" testID="cancelTimeBtn">
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onUse} style={styles.primaryBtn} accessibilityRole="button" testID="useTimeBtn">
              <Text style={styles.primaryBtnText}>Use this time</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper functions for default dates
const startOfTodayAt = (h: number) => { 
  const d = new Date(); 
  d.setHours(h, 0, 0, 0); 
  return d; 
};

const getDefaultSchedule = () => {
  const now = new Date();
  const pickup = now.getHours() >= 8 ? now : startOfTodayAt(8);
  const pickupDate = new Date(pickup);
  const deliveryDate = new Date(pickupDate.getTime() + 24 * 3600 * 1000); 
  deliveryDate.setHours(17, 0, 0, 0);
  return { pickup: pickupDate, delivery: deliveryDate };
};

function getDeviceTZ(): string {
  try {
    const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz ? tz : 'America/Phoenix';
  } catch {
    return 'America/Phoenix';
  }
}

function formatLocalNowForTZ(tz: string): string {
  try {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = fmt.formatToParts(d);
    const g = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
  } catch {
    return '';
  }
}

function TZSelector() {
  const { draft, setField } = usePostLoad();
  const [opened, setOpened] = useState<boolean>(false);

  useEffect(() => {
    const forced = FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0 ? FORCE_DELIVERY_TZ : undefined;
    const baseTz = forced ?? draft.deliveryTZ ?? getDeviceTZ();
    if (!draft.deliveryTZ || forced) {
      setField('deliveryTZ', baseTz);
    }
    if (!draft.deliveryDateLocal) {
      const local = formatLocalNowForTZ(baseTz);
      setField('deliveryDateLocal', local);
    }
  }, [draft.deliveryTZ, draft.deliveryDateLocal, setField]);

  const onPick = useCallback((tz: string) => {
    if (FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0) return;
    setField('deliveryTZ', tz);
    const local = formatLocalNowForTZ(tz);
    setField('deliveryDateLocal', local);
    setOpened(false);
  }, [setField]);

  if (FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Delivery Timezone</Text>
        <View style={styles.dateField}>
          <Text style={styles.dateText}>{FORCE_DELIVERY_TZ}</Text>
        </View>
        <Text style={styles.hintText}>Timezone is fixed by organization settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Delivery Timezone</Text>
      <Pressable onPress={() => setOpened(!opened)} style={styles.dateField} accessibilityRole="button" testID="deliveryTZBtn">
        <Text style={styles.dateText}>{draft.deliveryTZ || 'America/Phoenix'}</Text>
      </Pressable>
      {opened && (
        <View style={styles.tzDropdown}>
          <Text style={styles.tzQuickLabel}>Quick select</Text>
          <View style={styles.tzQuickRow}>
            {QUICK_TZS.map((tz: string) => (
              <Pressable key={tz} onPress={() => onPick(tz)} style={styles.tzPill} accessibilityRole="button" testID={`tz-${tz}`}>
                <Text style={styles.tzPillText}>{tz.split('/')[1]?.replace('_',' ') || tz}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.tzList}>
            {ALL_TZS.map((tz: string) => (
              <Pressable key={tz} onPress={() => onPick(tz)} style={styles.tzItem} accessibilityRole="button">
                <Text style={styles.tzItemText}>{tz}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function PostLoadStep3() {
  const router = useRouter();
  const { draft, setField } = usePostLoad();
  
  // Initialize with default dates if none exist
  const defaultDates = useMemo(() => getDefaultSchedule(), []);
  const [pickupDate, setPickupDate] = useState<Date | null>(draft.pickupDate ?? defaultDates.pickup);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(draft.deliveryDate ?? defaultDates.delivery);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [timePicker, setTimePicker] = useState<TimePickerKind | null>(null);
  const [deliveryLocalDate, setDeliveryLocalDate] = useState<Date | null>(() => {
    if (draft.deliveryDateLocal) {
      const parsed = new Date(draft.deliveryDateLocal);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  });
  const [tempTime, setTempTime] = useState<string>('');

  // Update delivery local date when it changes
  useEffect(() => {
    if (draft.deliveryDateLocal) {
      const parsed = new Date(draft.deliveryDateLocal);
      if (!isNaN(parsed.getTime())) {
        setDeliveryLocalDate(parsed);
      }
    }
  }, [draft.deliveryDateLocal]);
  
  // Set default dates in draft if they don't exist
  useEffect(() => {
    if (!draft.pickupDate && pickupDate) {
      console.log('[PostLoadStep3] setting default pickupDate:', pickupDate);
      setField('pickupDate', pickupDate);
    }
    if (!draft.deliveryDate && deliveryDate) {
      console.log('[PostLoadStep3] setting default deliveryDate:', deliveryDate);
      setField('deliveryDate', deliveryDate);
    }
  }, [draft.pickupDate, draft.deliveryDate, pickupDate, deliveryDate, setField]);

  const canProceed = useMemo(() => !!pickupDate && !!deliveryDate, [pickupDate, deliveryDate]);

  const openPicker = useCallback((k: PickerKind) => {
    console.log('[PostLoadStep3] Opening picker for:', k);
    setPicker(k);
  }, []);
  const closePicker = useCallback(() => setPicker(null), []);
  
  const openTimePicker = useCallback((k: TimePickerKind) => {
    console.log('[PostLoadStep3] Opening time picker for:', k);
    const currentTime = (draft.deliveryDateLocal || '').split('T')[1] || '17:00';
    setTempTime(currentTime);
    setTimePicker(k);
  }, [draft.deliveryDateLocal]);
  const closeTimePicker = useCallback(() => setTimePicker(null), []);

  const onConfirm = useCallback((d: Date) => {
    console.log('[PostLoadStep3] Calendar confirmed date:', d, 'for picker:', picker);
    if (picker === 'pickup') {
      setPickupDate(d);
      setField('pickupDate', d);
    } else if (picker === 'delivery') {
      setDeliveryDate(d);
      setField('deliveryDate', d);
    } else if (picker === 'deliveryLocal') {
      setDeliveryLocalDate(d);
      // Update the delivery local date/time in the draft
      const currentTime = draft.deliveryDateLocal ? draft.deliveryDateLocal.split('T')[1] || '17:00' : '17:00';
      const newDateTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${currentTime}`;
      console.log('[PostLoadStep3] Setting deliveryDateLocal to:', newDateTime);
      setField('deliveryDateLocal', newDateTime);
    }
    setPicker(null);
  }, [picker, draft.deliveryDateLocal, setField]);

  useEffect(() => {
    console.log('[PostLoadStep3] setting pickupDate in draft:', pickupDate);
    setField('pickupDate', pickupDate);
  }, [pickupDate, setField]);
  useEffect(() => {
    console.log('[PostLoadStep3] setting deliveryDate in draft:', deliveryDate);
    setField('deliveryDate', deliveryDate);
  }, [deliveryDate, setField]);

  const onPrevious = useCallback(() => { router.back(); }, [router]);
  const onNext = useCallback(() => { 
    console.log('[PostLoadStep3] next', { 
      pickupDate, 
      deliveryDate, 
      draftPickupDate: draft.pickupDate, 
      draftDeliveryDate: draft.deliveryDate,
      pickupDateValid: pickupDate instanceof Date && !isNaN(pickupDate.getTime()),
      deliveryDateValid: deliveryDate instanceof Date && !isNaN(deliveryDate.getTime()),
      deliveryTZ: draft.deliveryTZ,
      deliveryDateLocal: draft.deliveryDateLocal,
    }); 
    if (pickupDate && deliveryDate) { 
      setField('pickupDate', pickupDate);
      setField('deliveryDate', deliveryDate);
      setTimeout(() => {
        router.push('/post-load-step4'); 
      }, 100);
    } 
  }, [pickupDate, deliveryDate, draft.pickupDate, draft.deliveryDate, draft.deliveryTZ, draft.deliveryDateLocal, setField, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="postLoadHeaderTitle">Post Load</Text>
            <Stepper current={3} total={5} />
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

            <TZSelector />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Delivery Local Date/Time</Text>
              <View style={styles.rowGap8}>
                <Pressable style={styles.dateField} accessibilityRole="button" onPress={() => setField('deliveryDateLocal', formatLocalNowForTZ(draft.deliveryTZ || getDeviceTZ()))} testID="deliveryLocalNow">
                  <Text style={styles.dateText}>{draft.deliveryDateLocal || 'YYYY-MM-DDTHH:MM'}</Text>
                </Pressable>
                <View style={styles.timeRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.smallLabel}>Date (YYYY-MM-DD)</Text>
                    <Pressable style={styles.inputLike} accessibilityRole="button" onPress={() => openPicker('deliveryLocal')} testID="deliveryLocalDateBtn">
                      <Text style={styles.dateText} testID="deliveryLocalDateText">
                        {deliveryLocalDate ? formatDateLabel(deliveryLocalDate) : (draft.deliveryDateLocal || '').split('T')[0] || 'Select date'}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.spacer12} />
                  <View style={styles.flex1}>
                    <Text style={styles.smallLabel}>Time (HH:MM)</Text>
                    <Pressable style={styles.inputLike} accessibilityRole="button" onPress={() => openTimePicker('deliveryLocalTime')} testID="deliveryLocalTimeBtn">
                      <Text style={styles.dateText} testID="deliveryLocalTimeText">{(draft.deliveryDateLocal || '').split('T')[1] || 'HH:MM'}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
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
        initialDate={picker === 'pickup' ? pickupDate : picker === 'delivery' ? deliveryDate : deliveryLocalDate}
        onClose={closePicker}
        onConfirm={onConfirm}
        minDate={new Date()}
      />
      
      <TimePickerModal
        visible={timePicker !== null}
        initialTime={tempTime}
        onClose={closeTimePicker}
        onConfirm={(time) => {
          const currentDate = draft.deliveryDateLocal ? draft.deliveryDateLocal.split('T')[0] : new Date().toISOString().split('T')[0];
          const newDateTime = `${currentDate}T${time}`;
          console.log('[PostLoadStep3] Setting deliveryDateLocal time to:', newDateTime);
          setField('deliveryDateLocal', newDateTime);
          setTimePicker(null);
        }}
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
  tzDropdown: { marginTop: 8, backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  tzQuickLabel: { fontWeight: '700', color: theme.colors.dark, marginBottom: 8 },
  tzQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tzPill: { backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, borderColor: '#d1d5db' },
  tzPillText: { color: theme.colors.dark, fontWeight: '700' },
  tzList: { maxHeight: 220 },
  tzItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  tzItemText: { color: theme.colors.dark },
  rowGap8: { gap: 8 },
  hintText: { color: theme.colors.gray, fontSize: theme.fontSize.sm, marginTop: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  smallLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginBottom: 6 },
  inputLike: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }) as number },
  flex1: { flex: 1 },
  spacer12: { width: 12 },
  timePickerCard: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.card, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  timePickerHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  timePickerTitle: { flex: 1, fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  timePickerContent: { padding: 16 },
  timeInputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 24 },
  timeInputGroup: { alignItems: 'center' },
  timeInputLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginBottom: 8 },
  timeInput: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: theme.fontSize.xl, fontWeight: '700', textAlign: 'center', width: 80, color: theme.colors.dark },
  timeSeparator: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.dark, marginHorizontal: 8, marginBottom: 8 },
  quickTimeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  quickTimeLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray, fontWeight: '600' },
  quickTimePill: { backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  quickTimeText: { color: theme.colors.dark, fontWeight: '600', fontSize: theme.fontSize.sm },
});