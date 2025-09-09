import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';

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

export default function BulkToolsScreen() {
  const [active, setActive] = useState<BulkTabKey>('form');

  const onSelect = useCallback((k: BulkTabKey) => {
    console.log('[BulkTools] select tab', k);
    setActive(k);
  }, []);

  const content = useMemo(() => {
    switch (active) {
      case 'form':
        return (
          <View style={styles.blank} testID="bulktools-form">
            <Text style={styles.blankTitle}>Form Fill</Text>
            <Text style={styles.blankSubtitle}>Blank screen</Text>
          </View>
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
  }, [active]);

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
});
