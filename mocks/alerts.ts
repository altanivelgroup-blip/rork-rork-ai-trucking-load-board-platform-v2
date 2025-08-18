import { AlertItem } from '@/types';

export const seedAlerts: AlertItem[] = [
  {
    id: 'alert-1',
    severity: 'high',
    title: 'Severe Weather Alert',
    body: 'Thunderstorms expected along I-40, consider rerouting.',
    createdAt: new Date(new Date().getTime() - 1000 * 60 * 50),
    read: false,
  },
  {
    id: 'alert-2',
    severity: 'medium',
    title: 'Weigh Station Open',
    body: 'Weigh station open 20 miles ahead.',
    createdAt: new Date(new Date().getTime() - 1000 * 60 * 30),
    read: false,
    relatedLoadId: 'LD-200',
  },
  {
    id: 'alert-3',
    severity: 'low',
    title: 'Document Expiry Reminder',
    body: 'Insurance certificate expires in 10 days.',
    createdAt: new Date(new Date().getTime() - 1000 * 60 * 10),
    read: true,
  },
];
