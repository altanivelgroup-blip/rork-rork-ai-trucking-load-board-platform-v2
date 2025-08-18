import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AlertItem, LogEntry, ScheduleItem } from '@/types';
import { seedAlerts } from '@/mocks/alerts';
import { seedLogs } from '@/mocks/logs';
import { seedSchedule } from '@/mocks/schedule';

interface OpsState {
  logs: LogEntry[];
  alerts: AlertItem[];
  schedule: ScheduleItem[];
  isHydrating: boolean;
  error?: string | null;
  addLog: (entry: LogEntry) => Promise<void>;
  addAlert: (item: AlertItem) => Promise<void>;
  markAlertRead: (id: string, read?: boolean) => Promise<void>;
  addSchedule: (item: ScheduleItem) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  reseed: () => Promise<void>;
  clear: () => Promise<void>;
}

const LOGS_KEY = 'logs_v1';
const ALERTS_KEY = 'alerts_v1';
const SCHEDULE_KEY = 'schedule_v1';

function reviveDates<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T/.test(v)) {
      const dt = new Date(v);
      if (!Number.isNaN(dt.getTime())) {
        out[k] = dt;
        return;
      }
    }
    out[k] = v as unknown;
  });
  return out as T;
}

function reviveArrayDates<A>(arr: A[]): A[] {
  return arr.map((it) => (typeof it === 'object' && it !== null ? (reviveDates(it as Record<string, unknown>) as A) : it));
}

export const [OpsProvider, useOps] = createContextHook<OpsState>(() => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (key: string, data: unknown) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('[Ops] persist error', key, e);
      setError('Failed to save data');
    }
  }, []);

  const hydrateAll = useCallback(async () => {
    setIsHydrating(true);
    setError(null);
    try {
      console.log('[Ops] Hydrating from storage');
      const [logsRaw, alertsRaw, scheduleRaw] = await Promise.all([
        AsyncStorage.getItem(LOGS_KEY),
        AsyncStorage.getItem(ALERTS_KEY),
        AsyncStorage.getItem(SCHEDULE_KEY),
      ]);

      let logsArr: LogEntry[] = [];
      let alertsArr: AlertItem[] = [];
      let scheduleArr: ScheduleItem[] = [];

      if (logsRaw) {
        logsArr = reviveArrayDates<LogEntry>(JSON.parse(logsRaw) as LogEntry[]);
      } else {
        logsArr = seedLogs;
        await persist(LOGS_KEY, logsArr);
      }
      if (alertsRaw) {
        alertsArr = reviveArrayDates<AlertItem>(JSON.parse(alertsRaw) as AlertItem[]);
      } else {
        alertsArr = seedAlerts;
        await persist(ALERTS_KEY, alertsArr);
      }
      if (scheduleRaw) {
        scheduleArr = reviveArrayDates<ScheduleItem>(JSON.parse(scheduleRaw) as ScheduleItem[]);
      } else {
        scheduleArr = seedSchedule;
        await persist(SCHEDULE_KEY, scheduleArr);
      }

      setLogs(logsArr);
      setAlerts(alertsArr);
      setSchedule(scheduleArr);
    } catch (e) {
      console.error('[Ops] hydrate error', e);
      setError('Failed to load data');
      Alert.alert('Data Error', 'Failed to load local data.');
    } finally {
      setIsHydrating(false);
    }
  }, [persist]);

  useEffect(() => {
    void hydrateAll();
  }, [hydrateAll]);

  const addLog = useCallback(async (entry: LogEntry) => {
    setLogs((prev) => {
      const next = [entry, ...prev];
      void persist(LOGS_KEY, next);
      return next;
    });
  }, [persist]);

  const addAlert = useCallback(async (item: AlertItem) => {
    setAlerts((prev) => {
      const next = [item, ...prev];
      void persist(ALERTS_KEY, next);
      return next;
    });
  }, [persist]);

  const markAlertRead = useCallback(async (id: string, read: boolean = true) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read } : a));
      void persist(ALERTS_KEY, next);
      return next;
    });
  }, [persist]);

  const addSchedule = useCallback(async (item: ScheduleItem) => {
    setSchedule((prev) => {
      const next = [...prev.filter((s) => s.id !== item.id), item].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      void persist(SCHEDULE_KEY, next);
      return next;
    });
  }, [persist]);

  const removeSchedule = useCallback(async (id: string) => {
    setSchedule((prev) => {
      const next = prev.filter((s) => s.id !== id);
      void persist(SCHEDULE_KEY, next);
      return next;
    });
  }, [persist]);

  const reseed = useCallback(async () => {
    try {
      console.log('[Ops] reseed');
      await Promise.all([
        AsyncStorage.setItem(LOGS_KEY, JSON.stringify(seedLogs)),
        AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(seedAlerts)),
        AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(seedSchedule)),
      ]);
      await hydrateAll();
    } catch (e) {
      console.error('[Ops] reseed error', e);
      setError('Failed to reseed');
    }
  }, [hydrateAll]);

  const clear = useCallback(async () => {
    try {
      console.log('[Ops] clear');
      await Promise.all([
        AsyncStorage.removeItem(LOGS_KEY),
        AsyncStorage.removeItem(ALERTS_KEY),
        AsyncStorage.removeItem(SCHEDULE_KEY),
      ]);
      await hydrateAll();
    } catch (e) {
      console.error('[Ops] clear error', e);
      setError('Failed to clear');
    }
  }, [hydrateAll]);

  const value = useMemo<OpsState>(() => ({
    logs,
    alerts,
    schedule,
    isHydrating,
    error,
    addLog,
    addAlert,
    markAlertRead,
    addSchedule,
    removeSchedule,
    reseed,
    clear,
  }), [logs, alerts, schedule, isHydrating, error, addLog, addAlert, markAlertRead, addSchedule, removeSchedule, reseed, clear]);

  return value;
});
