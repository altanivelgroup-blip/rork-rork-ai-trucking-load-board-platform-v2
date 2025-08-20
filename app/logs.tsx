import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { lightTheme as theme } from '@/constants/theme';
import Logger, { LogEvent } from '@/utils/logger';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Trash2, Download, RefreshCcw } from 'lucide-react-native';

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await Logger.getBuffer();
      setLogs(data.sort((a, b) => b.ts - a.ts));
      console.log('[LogsScreen] Loaded logs', data.length);
    } catch (e) {
      console.log('[LogsScreen] Failed to load logs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    Logger.logScreenView('Logs').catch(() => {});
  }, [load]);

  const levelColor = useCallback((level: LogEvent['level']) => {
    if (level === 'error') return '#DC2626';
    if (level === 'warn') return '#D97706';
    if (level === 'info') return '#2563EB';
    return '#6B7280';
  }, []);

  const onClear = useCallback(() => {
    Alert.alert('Clear Logs', 'This will remove all stored logs. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        try {
          await Logger.clear();
          await load();
        } catch (e) {
          console.log('[LogsScreen] Clear failed', e);
        }
      } },
    ]);
  }, [load]);

  const onExport = useCallback(async () => {
    try {
      const data = await Logger.getBuffer();
      const payload = JSON.stringify({ exportedAt: new Date().toISOString(), count: data.length, logs: data }, null, 2);
      const fileName = `logs-${Date.now()}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[LogsScreen] Exported logs on web');
        return;
      }

      const path = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(path, payload, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Share logs' });
      } else {
        console.log('[LogsScreen] Sharing not available');
      }
    } catch (e) {
      console.log('[LogsScreen] Export failed', e);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: LogEvent }) => {
    const ts = new Date(item.ts).toLocaleString();
    return (
      <View style={styles.item} testID={`log-${item.id}`}>
        <View style={[styles.levelDot, { backgroundColor: levelColor(item.level) }]} />
        <View style={styles.itemBody}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemMeta}>{item.type} • {item.level} • {ts}</Text>
          </View>
          {item.data ? (
            <Text style={styles.itemData} numberOfLines={4}>{safeStringify(item.data)}</Text>
          ) : null}
        </View>
      </View>
    );
  }, [levelColor]);

  const keyExtractor = useCallback((it: LogEvent) => it.id, []);

  const headerRight = useMemo(() => (
    <View style={styles.headerButtons}>
      <TouchableOpacity onPress={load} style={styles.iconBtn} testID="logs-refresh">
        <RefreshCcw size={20} color={theme.colors.dark} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onExport} style={styles.iconBtn} testID="logs-export">
        <Download size={20} color={theme.colors.dark} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onClear} style={styles.iconBtn} testID="logs-clear">
        <Trash2 size={20} color={theme.colors.danger} />
      </TouchableOpacity>
    </View>
  ), [load, onExport, onClear]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Logs', headerRight: () => headerRight }} />
      {logs.length === 0 && !loading ? (
        <View style={styles.empty} testID="logs-empty">
          <Text style={styles.emptyTitle}>No logs yet</Text>
          <Text style={styles.emptySub}>Actions and screen views will appear here</Text>
          <TouchableOpacity onPress={load} style={styles.reloadBtn} testID="logs-reload">
            <Text style={styles.reloadBtnText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          testID="logs-list"
        />
      )}
    </View>
  );
}

function safeStringify(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return '[unserializable data]';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  list: { padding: theme.spacing.md },
  item: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  levelDot: { width: 10, height: 10, borderRadius: 5, marginRight: theme.spacing.md, marginTop: 4 },
  itemBody: { flex: 1 },
  itemHeader: { marginBottom: 6 },
  itemTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  itemMeta: { fontSize: theme.fontSize.xs, color: theme.colors.gray },
  itemData: { fontFamily: 'System', fontSize: theme.fontSize.sm, color: theme.colors.dark, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  emptyTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  emptySub: { marginTop: 6, color: theme.colors.gray },
  reloadBtn: { marginTop: theme.spacing.md, backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  reloadBtnText: { color: theme.colors.white, fontWeight: '700' },
});
