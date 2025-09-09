import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { stageFormFill, emitFormFill } from '@/lib/formFillBus';
import { useToast } from '@/components/Toast';

export type BulkTabKey = 'form' | 'loads' | 'drivers';

interface TabItem {
  key: BulkTabKey;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'form', label: 'Form Fill' },
  { key: 'loads', label: 'Bulk Loads' },
  { key: 'drivers', label: 'Bulk Drivers' },
];

function parseInputToObject(raw: string): Record<string, any> {
  const text = raw.trim();
  if (!text) return {};
  try {
    const first = text[0];
    if (first === '{' || first === '[') {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.reduce((acc, item) => {
          if (item && typeof item === 'object') Object.assign(acc, item as Record<string, any>);
          return acc;
        }, {} as Record<string, any>);
      }
      return parsed as Record<string, any>;
    }
  } catch (e) {
    console.log('[BulkTools] JSON parse failed, falling back to line parser', e);
  }
  const obj: Record<string, any> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const kvEq = trimmed.split('=');
    const kvComma = trimmed.split(',');
    let key = '';
    let value = '';
    if (kvEq.length >= 2) {
      key = kvEq[0];
      value = kvEq.slice(1).join('=');
    } else if (kvComma.length >= 2) {
      key = kvComma[0];
      value = kvComma.slice(1).join(',');
    } else {
      continue;
    }
    const k = key.trim();
    const v = value.trim();
    if (!k) continue;
    obj[k] = v;
  }
  return obj;
}

export default function BulkToolsScreen() {
  const [active, setActive] = useState<BulkTabKey>('form');
  const [input, setInput] = useState<string>(`originCity=Las Vegas\noriginState=NV\ndestCity=Phoenix\ndestState=AZ\nmiles=290\nrevenue=850\ndeliveryDate=2025-09-10 14:00\ntz=America/Phoenix\nmake=RAM\nmodel=3500\nyear=2024\nfuelType=Diesel\nmpg=10`);
  const toast = useToast();

  const onSelect = useCallback((k: BulkTabKey) => {
    console.log('[BulkTools] select tab', k);
    setActive(k);
  }, []);

  const parsed = useMemo(() => {
    const o = parseInputToObject(input);
    return o;
  }, [input]);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(parsed, null, 2);
    } catch {
      return '{}';
    }
  }, [parsed]);

  const onApply = useCallback(() => {
    const data = parseInputToObject(input);
    console.log('[BulkTools] applying staged form fill', data);
    stageFormFill(data);
    emitFormFill(data);
    toast.show('Staged for next screen. Open Post Load or Driver Profile.', 'success');
  }, [input, toast]);

  const content = useMemo(() => {
    switch (active) {
      case 'form':
        return (
          <ScrollView style={styles.formWrap} contentContainerStyle={styles.formWrapContent} testID="bulktools-form">
            <Text style={styles.blankTitle}>Form Fill</Text>
            <Text style={styles.helper}>Paste key=value lines or JSON below.</Text>
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={12}
              value={input}
              onChangeText={setInput}
              placeholder={'key=value\nkey, value\n{ "key": "value" }'}
              placeholderTextColor={theme.colors.gray}
              testID="formfill-input"
              textAlignVertical="top"
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { console.log('[BulkTools] preview clicked'); }} testID="preview-btn">
                <Text style={styles.secondaryBtnText}>Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={onApply} testID="apply-btn">
                <Text style={styles.primaryBtnText}>Apply to Next Screen</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.previewBox} testID="preview-box">
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewJson}>{pretty}</Text>
            </View>
          </ScrollView>
        );
      case 'loads':
        return (
          <View style={styles.blank} testID="bulktools-loads">
            <Text style={styles.blankTitle}>Bulk Loads</Text>
            <Text style={styles.blankSubtitle}>Blank screen</Text>
          </View>
        );
      case 'drivers':
        return (
          <View style={styles.blank} testID="bulktools-drivers">
            <Text style={styles.blankTitle}>Bulk Drivers</Text>
            <Text style={styles.blankSubtitle}>Blank screen</Text>
          </View>
        );
      default:
        return null;
    }
  }, [active, input, onApply, pretty]);

  return (
    <View style={styles.container} testID="bulktools-root">
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
              onPress={() => onSelect(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              testID={`bulktools-tab-${t.key}`}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabBtnInactive: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
  },
  tabLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: theme.colors.white,
  },
  tabLabelInactive: {
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  blank: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  blankTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  blankSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  formWrap: { flex: 1 },
  formWrapContent: { paddingBottom: 40 },
  helper: { color: theme.colors.gray, marginBottom: 8 },
  textarea: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 160,
    color: theme.colors.dark,
  },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: theme.colors.white, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: { color: theme.colors.dark, fontWeight: '700' },
  previewBox: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previewTitle: { fontWeight: '800', marginBottom: 8, color: theme.colors.dark },
  previewJson: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string, fontSize: 12, color: theme.colors.dark },
});
