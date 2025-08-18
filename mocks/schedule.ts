import { ScheduleItem } from '@/types';

export const seedSchedule: ScheduleItem[] = [
  {
    id: 'sch-1',
    title: 'Pickup - Acme Co.',
    type: 'pickup',
    start: new Date(new Date().setHours(new Date().getHours() + 2)),
    end: new Date(new Date().setHours(new Date().getHours() + 3)),
    location: '123 Warehouse Rd, Dallas, TX',
    notes: 'Dock 4, call on arrival',
    relatedLoadId: 'LD-200',
  },
  {
    id: 'sch-2',
    title: 'Delivery - Beta Inc.',
    type: 'delivery',
    start: new Date(new Date().setHours(new Date().getHours() + 8)),
    end: new Date(new Date().setHours(new Date().getHours() + 10)),
    location: '789 Distribution Ave, Austin, TX',
    notes: 'Requires appointment',
    relatedLoadId: 'LD-200',
  },
  {
    id: 'sch-3',
    title: 'Oil Change - TRK-100',
    type: 'maintenance',
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    location: 'Speedy Lube, Waco, TX',
  },
];
