import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type Severity = 'low' | 'medium' | 'high';

export interface MaintenanceCategory { id: string; title: string; guideline: string }
export interface TrailerRef { id: string; name: string }

export interface ServiceLog {
  id: string;
  trailerId: string;
  categoryId: string;
  date: string;
  summary: string;
  mileage?: number;
}

export interface AlertItem {
  id: string;
  trailerId: string;
  categoryId: string;
  severity: Severity;
  message: string;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  trailerId: string;
  categoryId: string;
  title: string;
  dueDate: string;
}

interface MaintenanceState {
  trailers: TrailerRef[];
  categories: MaintenanceCategory[];
  logs: ServiceLog[];
  alerts: AlertItem[];
  schedule: ScheduleItem[];
  isHydrating: boolean;
  addLog: (log: Omit<ServiceLog, 'id' | 'date'> & { date?: string }) => Promise<ServiceLog | null>;
  addAlert: (alert: Omit<AlertItem, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<AlertItem | null>;
  addSchedule: (item: Omit<ScheduleItem, 'id'>) => Promise<ScheduleItem | null>;
  clearAll: () => Promise<void>;
  getLogsByCategory: (trailerId: string, categoryId: string) => ServiceLog[];
  getLastServiceDate: (trailerId: string, categoryId: string) => string | undefined;
  getTrailerOdometer: (trailerId: string) => number | undefined;
  getTrailerLastServiceDate: (trailerId: string) => string | undefined;
  getNextServiceDate: (trailerId: string) => string | undefined;
}

const STORAGE_KEY = 'maintenance_state_v1';

const DEFAULT_TRAILERS: TrailerRef[] = [
  { id: 'flatbed', name: 'Flatbed' },
  { id: 'dump', name: 'Dump' },
  { id: 'car', name: 'Car' },
  { id: 'enclosed', name: 'Enclosed' },
];

const DEFAULT_CATEGORIES: MaintenanceCategory[] = [
  { id: 'tires', title: 'Tires', guideline: 'Weekly' },
  { id: 'brakes', title: 'Brakes', guideline: 'Monthly' },
  { id: 'lights', title: 'Lights', guideline: 'Pre-trip' },
  { id: 'axles', title: 'Axles & Bearings', guideline: '10,000 miles' },
  { id: 'suspension', title: 'Suspension', guideline: 'Monthly' },
  { id: 'frame', title: 'Frame & Coupler', guideline: 'Quarterly' },
  { id: 'deck', title: 'Deck', guideline: 'Weekly' },
  { id: 'electrical', title: 'Electrical', guideline: 'Monthly' },
  { id: 'registration', title: 'Registration/Tags', guideline: 'Annually' },
];

export const [MaintenanceProvider, useMaintenance] = createContextHook<MaintenanceState>(() => {
  const [trailers] = useState<TrailerRef[]>(DEFAULT_TRAILERS);
  const [categories] = useState<MaintenanceCategory[]>(DEFAULT_CATEGORIES);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        console.log('[Maintenance] Hydrating');
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<MaintenanceState>;
          setLogs(Array.isArray(data.logs) ? data.logs : []);
          setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
          setSchedule(Array.isArray(data.schedule) ? data.schedule : []);
        }
      } catch (e) {
        console.log('[Maintenance] hydrate error', e);
      } finally {
        setIsHydrating(false);
      }
    })();
  }, []);

  const persist = useCallback(async (
    next?: Partial<Pick<MaintenanceState, 'logs' | 'alerts' | 'schedule'>>,
  ) => {
    try {
      const payload = {
        logs: next?.logs ?? logs,
        alerts: next?.alerts ?? alerts,
        schedule: next?.schedule ?? schedule,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      console.log('[Maintenance] Saved');
    } catch (e) {
      console.log('[Maintenance] save error', e);
    }
  }, [logs, alerts, schedule]);

  const addLog = useCallback<MaintenanceState['addLog']>(async (log) => {
    try {
      const entry: ServiceLog = {
        id: `${Date.now()}`,
        trailerId: log.trailerId,
        categoryId: log.categoryId,
        date: log.date ?? new Date().toISOString().slice(0, 10),
        summary: log.summary,
        mileage: log.mileage,
      };
      const next = [entry, ...logs];
      setLogs(next);
      await persist({ logs: next });
      return entry;
    } catch (e) {
      console.log('[Maintenance] addLog error', e);
      return null;
    }
  }, [logs, persist]);

  const addAlert = useCallback<MaintenanceState['addAlert']>(async (alert) => {
    try {
      const entry: AlertItem = {
        id: `${Date.now()}`,
        trailerId: alert.trailerId,
        categoryId: alert.categoryId,
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.createdAt ?? new Date().toISOString(),
      };
      const next = [entry, ...alerts];
      setAlerts(next);
      await persist({ alerts: next });
      return entry;
    } catch (e) {
      console.log('[Maintenance] addAlert error', e);
      return null;
    }
  }, [alerts, persist]);

  const addSchedule = useCallback<MaintenanceState['addSchedule']>(async (item) => {
    try {
      const entry: ScheduleItem = {
        id: `${Date.now()}`,
        trailerId: item.trailerId,
        categoryId: item.categoryId,
        title: item.title,
        dueDate: item.dueDate,
      };
      const next = [entry, ...schedule];
      setSchedule(next);
      await persist({ schedule: next });
      return entry;
    } catch (e) {
      console.log('[Maintenance] addSchedule error', e);
      return null;
    }
  }, [schedule, persist]);

  const clearAll = useCallback(async () => {
    try {
      setLogs([]);
      setAlerts([]);
      setSchedule([]);
      await persist({ logs: [], alerts: [], schedule: [] });
    } catch (e) {
      console.log('[Maintenance] clearAll error', e);
    }
  }, [persist]);

  const getLogsByCategory = useCallback<MaintenanceState['getLogsByCategory']>((trailerId, categoryId) => {
    return logs.filter((l) => l.trailerId === trailerId && l.categoryId === categoryId);
  }, [logs]);

  const getLastServiceDate = useCallback<MaintenanceState['getLastServiceDate']>((trailerId, categoryId) => {
    const first = logs.find((l) => l.trailerId === trailerId && l.categoryId === categoryId);
    return first?.date;
  }, [logs]);

  const getTrailerOdometer = useCallback<MaintenanceState['getTrailerOdometer']>((trailerId) => {
    const miles = logs
      .filter((l) => l.trailerId === trailerId && typeof l.mileage === 'number')
      .map((l) => l.mileage as number);
    if (miles.length === 0) return undefined;
    return Math.max(...miles);
  }, [logs]);

  const getTrailerLastServiceDate = useCallback<MaintenanceState['getTrailerLastServiceDate']>((trailerId) => {
    const first = logs.find((l) => l.trailerId === trailerId);
    return first?.date;
  }, [logs]);

  const getNextServiceDate = useCallback<MaintenanceState['getNextServiceDate']>((trailerId) => {
    if (schedule.length === 0) return undefined;
    const items = schedule.filter((s) => s.trailerId === trailerId);
    if (items.length === 0) return undefined;
    const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return sorted[0]?.dueDate;
  }, [schedule]);

  return useMemo<MaintenanceState>(() => ({
    trailers,
    categories,
    logs,
    alerts,
    schedule,
    isHydrating,
    addLog,
    addAlert,
    addSchedule,
    clearAll,
    getLogsByCategory,
    getLastServiceDate,
    getTrailerOdometer,
    getTrailerLastServiceDate,
    getNextServiceDate,
  }), [trailers, categories, logs, alerts, schedule, isHydrating, addLog, addAlert, addSchedule, clearAll, getLogsByCategory, getLastServiceDate, getTrailerOdometer, getTrailerLastServiceDate, getNextServiceDate]);
});
