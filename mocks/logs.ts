import { LogEntry } from '@/types';

export const seedLogs: LogEntry[] = [
  {
    id: 'log-1',
    level: 'info',
    message: 'App initialized',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60),
    meta: { version: '1.0.0' },
  },
  {
    id: 'log-2',
    level: 'warning',
    message: 'Low fuel detected near Dallas, TX',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 45),
    meta: { vehicleId: 'TRK-100' },
  },
  {
    id: 'log-3',
    level: 'error',
    message: 'Failed to sync loads, offline mode active',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 20),
  },
];
