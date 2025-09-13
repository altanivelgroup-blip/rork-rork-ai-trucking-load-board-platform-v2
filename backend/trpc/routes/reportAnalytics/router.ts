import { publicProcedure, createTRPCRouter } from '../../create-context';

// Mock data for development - replace with real data sources
const mockGraphData = {
  series: [
    { name: 'Revenue', data: [12000, 15000, 18000, 22000, 19000, 25000, 28000] },
    { name: 'Loads', data: [45, 52, 48, 61, 55, 67, 73] }
  ],
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  range: '7d'
};

const mockMetricsData = {
  kpis: {
    loadsToday: {
      value: 23,
      change: '+12% from yesterday'
    },
    avgRatePerMile: {
      value: '$2.85',
      change: '+$0.15 from last week'
    },
    activeDrivers: {
      value: 156,
      change: '+8 new this week'
    }
  }
};

const mockBottomRowData = {
  recentLoads: [
    { id: 'LD-2024-001', status: 'In Transit', rate: '2,850', driver: 'John D.' },
    { id: 'LD-2024-002', status: 'Delivered', rate: '3,200', driver: 'Sarah M.' },
    { id: 'LD-2024-003', status: 'Pickup', rate: '2,650', driver: 'Mike R.' },
    { id: 'LD-2024-004', status: 'In Transit', rate: '4,100', driver: 'Lisa K.' },
    { id: 'LD-2024-005', status: 'Delivered', rate: '2,950', driver: 'Tom B.' }
  ],
  totals: {
    totalRevenue: 15750,
    totalLoads: 5,
    avgRate: 3150
  }
};

export const reportAnalyticsRouter = createTRPCRouter({
  graph: publicProcedure
    .query(async () => {
      console.log('[ReportAnalytics] Serving graph data');
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockGraphData;
    }),

  metrics: publicProcedure
    .query(async () => {
      console.log('[ReportAnalytics] Serving metrics data');
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockMetricsData;
    }),

  bottomRow: publicProcedure
    .query(async () => {
      console.log('[ReportAnalytics] Serving bottom row data');
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 400));
      return mockBottomRowData;
    })
});