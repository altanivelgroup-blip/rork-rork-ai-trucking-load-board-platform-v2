import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { VEHICLE_TYPES, TRUCK_SUBTYPES, TRAILER_SUBTYPES, AnySubtype } from '@/constants/vehicleOptions';
import { theme } from '@/constants/theme';

export interface TypeSubtypeSelectorProps {
  type: 'truck' | 'trailer';
  subtype: string;
  onTypeChange: (t: 'truck' | 'trailer') => void;
  onSubtypeChange: (s: AnySubtype) => void;
  testIDPrefix?: string;
}

export default function TypeSubtypeSelector({ type, subtype, onTypeChange, onSubtypeChange, testIDPrefix = 'vehicle' }: TypeSubtypeSelectorProps) {
  const subtypes = useMemo<readonly AnySubtype[]>(() => {
    const result = type === 'truck' ? TRUCK_SUBTYPES : TRAILER_SUBTYPES;
    console.log(`[TypeSubtypeSelector] Subtypes for ${type}:`, result);
    return result;
  }, [type]);
  
  console.log(`[TypeSubtypeSelector] Render - type: ${type}, subtype: ${subtype}`);

  return (
    <View style={styles.row}>
      <View style={[styles.field, { flex: 1 }]}>
        <Text style={styles.label}>Type *</Text>
        <View style={styles.segmentedControl}>
          {VEHICLE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              accessibilityRole="button"
              testID={`${testIDPrefix}-type-${t.value}`}
              style={[styles.segmentButton, type === t.value && styles.segmentButtonActive]}
              onPress={() => {
                console.log(`[TypeSubtypeSelector] Type button pressed: ${t.value}, current: ${type}`);
                if (type !== t.value) {
                  console.log(`[TypeSubtypeSelector] Calling onTypeChange with: ${t.value}`);
                  onTypeChange(t.value);
                } else {
                  console.log(`[TypeSubtypeSelector] Type unchanged, not calling onTypeChange`);
                }
              }}
            >
              <Text style={[styles.segmentButtonText, type === t.value && styles.segmentButtonTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={[styles.field, { flex: 2 }]}>
        <Text style={styles.label}>Subtype *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subtypeScroll}>
          <View style={styles.subtypeContainer}>
            {subtypes.map((s) => {
              const sStr = String(s);
              const active = subtype === sStr;
              return (
                <TouchableOpacity
                  key={sStr}
                  accessibilityRole="button"
                  testID={`${testIDPrefix}-subtype-${sStr.replace(/\s+/g,'-').toLowerCase()}`}
                  style={[styles.subtypeButton, active && styles.subtypeButtonActive]}
                  onPress={() => {
                    console.log(`[TypeSubtypeSelector] Subtype button pressed: ${sStr}, active: ${active}`);
                    if (!active) {
                      console.log(`[TypeSubtypeSelector] Calling onSubtypeChange with: ${sStr}`);
                      onSubtypeChange(s);
                    } else {
                      console.log(`[TypeSubtypeSelector] Subtype already active, not calling onSubtypeChange`);
                    }
                  }}
                >
                  <Text style={[styles.subtypeButtonText, active && styles.subtypeButtonTextActive]}>
                    {sStr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  field: { marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600' as const, color: theme.colors.dark, marginBottom: theme.spacing.xs },
  segmentedControl: { flexDirection: 'row', backgroundColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, padding: 2 },
  segmentButton: { flex: 1, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.sm, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: theme.colors.white, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentButtonText: { fontSize: theme.fontSize.sm, fontWeight: '500' as const, color: theme.colors.gray },
  segmentButtonTextActive: { color: theme.colors.dark, fontWeight: '600' as const },
  subtypeScroll: { maxHeight: 40 },
  subtypeContainer: { flexDirection: 'row', gap: theme.spacing.xs },
  subtypeButton: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.lightGray, borderWidth: 1, borderColor: theme.colors.border },
  subtypeButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  subtypeButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.gray, fontWeight: '500' as const },
  subtypeButtonTextActive: { color: theme.colors.white, fontWeight: '600' as const },
  spacer: { width: 12 },
});
