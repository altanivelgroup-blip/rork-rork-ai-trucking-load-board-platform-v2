import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExportBundle = {
  version: 1;
  exportedAt: string;
  storage: Record<string, string>;
};

const EXPORT_FILE_PREFIX = 'app-backup';

export async function buildExportBundle(): Promise<ExportBundle> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  const storage: Record<string, string> = {};
  pairs.forEach(([k, v]) => {
    if (k && typeof v === 'string') storage[k] = v;
  });
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    storage,
  };
}

export async function exportData(): Promise<{ uri: string; fileName: string } | null> {
  try {
    const bundle = await buildExportBundle();
    const json = JSON.stringify(bundle, null, 2);
    const fileName = `${EXPORT_FILE_PREFIX}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { uri: url, fileName };
    }

    const fileUri = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${fileName}` : `${FileSystem.cacheDirectory ?? ''}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Data' });
    }
    return { uri: fileUri, fileName };
  } catch (e) {
    console.error('[Export] error', e);
    Alert.alert('Export Failed', 'Could not export data. Please try again.');
    return null;
  }
}

function isExportBundle(data: unknown): data is ExportBundle {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (typeof d.exportedAt !== 'string') return false;
  if (!d.storage || typeof d.storage !== 'object') return false;
  return true;
}

function safeMergeObject<T extends Record<string, unknown>>(current: T | null, incoming: T | null): T | null {
  if (!incoming && !current) return null;
  if (!current) return incoming as T;
  if (!incoming) return current as T;
  return { ...current, ...incoming } as T;
}

export async function importData(): Promise<{ importedKeys: number; skippedKeys: number } | null> {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (res.canceled) return null;
    const asset = res.assets?.[0];
    if (!asset?.uri) return null;

    let jsonStr = '';
    if (Platform.OS === 'web') {
      const r = await fetch(asset.uri);
      jsonStr = await r.text();
    } else {
      jsonStr = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
    }

    const parsed = JSON.parse(jsonStr) as unknown;
    if (!isExportBundle(parsed)) {
      Alert.alert('Invalid File', 'Selected file is not a valid export bundle.');
      return null;
    }

    const existingKeys = await AsyncStorage.getAllKeys();
    let imported = 0;
    let skipped = 0;

    for (const [key, value] of Object.entries(parsed.storage)) {
      try {
        if (!existingKeys.includes(key)) {
          await AsyncStorage.setItem(key, value);
          imported++;
          continue;
        }
        if (key === 'user' || key === 'app_settings_v1') {
          const currentRaw = await AsyncStorage.getItem(key);
          let merged: string | null = null;
          if (key === 'app_settings_v1') {
            const curr = currentRaw ? (JSON.parse(currentRaw) as Record<string, unknown>) : null;
            const inc = value ? (JSON.parse(value) as Record<string, unknown>) : null;
            const resObj = safeMergeObject(curr, inc);
            merged = resObj ? JSON.stringify(resObj) : null;
          } else if (key === 'user') {
            const curr = currentRaw ? (JSON.parse(currentRaw) as Record<string, unknown>) : null;
            const inc = value ? (JSON.parse(value) as Record<string, unknown>) : null;
            const resObj = safeMergeObject(curr, inc);
            merged = resObj ? JSON.stringify(resObj) : null;
          }
          if (merged) {
            await AsyncStorage.setItem(key, merged);
            imported++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (inner) {
        console.error('[Import] key merge error', key, inner);
        skipped++;
      }
    }

    Alert.alert('Import Complete', `Imported ${imported} keys. Skipped ${skipped}.`);
    return { importedKeys: imported, skippedKeys: skipped };
  } catch (e) {
    console.error('[Import] error', e);
    Alert.alert('Import Failed', 'Could not import data. Please try again.');
    return null;
  }
}
