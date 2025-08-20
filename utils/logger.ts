import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  id: string;
  ts: number;
  level: LogLevel;
  type: 'screen' | 'event' | 'error';
  name: string;
  data?: Record<string, unknown>;
}

const MAX_LOGS = 200;
const STORAGE_KEY = 'app.logs.v1';

let buffer: LogEvent[] = [];
let initialized = false;

async function loadBuffer() {
  if (initialized) return;
  initialized = true;
  try {
    if (Platform.OS === 'web') {
      const raw = (globalThis as any)?.localStorage?.getItem(STORAGE_KEY);
      buffer = raw ? (JSON.parse(raw) as LogEvent[]) : [];
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      buffer = raw ? (JSON.parse(raw) as LogEvent[]) : [];
    }
  } catch (e) {
    console.log('[Logger] failed to load buffer', e);
    buffer = [];
  }
}

async function persist() {
  try {
    const raw = JSON.stringify(buffer);
    if (Platform.OS === 'web') {
      (globalThis as any)?.localStorage?.setItem(STORAGE_KEY, raw);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, raw);
    }
  } catch (e) {
    console.log('[Logger] failed to persist buffer', e);
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const Logger = {
  getBuffer: async (): Promise<LogEvent[]> => {
    await loadBuffer();
    return [...buffer];
  },
  clear: async (): Promise<void> => {
    await loadBuffer();
    buffer = [];
    await persist();
  },
  log: async (level: LogLevel, type: LogEvent['type'], name: string, data?: Record<string, unknown>): Promise<void> => {
    await loadBuffer();
    const evt: LogEvent = { id: uid(), ts: Date.now(), level, type, name, data };
    buffer.push(evt);
    if (buffer.length > MAX_LOGS) buffer = buffer.slice(-MAX_LOGS);
    try {
      const printable = { ...evt, data: data ?? undefined };
      if (level === 'error') console.error('[Event]', printable);
      else if (level === 'warn') console.warn('[Event]', printable);
      else console.log('[Event]', printable);
    } catch {}
    await persist();
  },
  logScreenView: async (screen: string, data?: Record<string, unknown>): Promise<void> => {
    await Logger.log('info', 'screen', screen, data);
  },
  logEvent: async (name: string, data?: Record<string, unknown>): Promise<void> => {
    await Logger.log('info', 'event', name, data);
  },
  logError: async (name: string, error: unknown, data?: Record<string, unknown>): Promise<void> => {
    const payload: Record<string, unknown> = {
      ...(data ?? {}),
      message: (error as any)?.message ?? String(error),
      stack: (error as any)?.stack,
    };
    await Logger.log('error', 'error', name, payload);
  },
};

export default Logger;
