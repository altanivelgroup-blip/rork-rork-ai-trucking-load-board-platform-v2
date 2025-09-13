import { publicProcedure, protectedProcedure, createTRPCRouter } from '../../create-context';
import { z } from 'zod';

// Mock data generator based on time period
const generateMockGraphData = (period: string) => {
  const dataMap = {
    daily: {
      series: [
        { name: 'Revenue', data: [8000, 12000, 15000, 18000, 22000, 19000, 25000, 28000] },
        { name: 'Loads', data: [25, 35, 45, 52, 48, 61, 55, 67] }
      ],
      labels: ['6am', '9am', '12pm', '3pm', '6pm', '9pm', '12am', '3am'],
      range: '24h'
    },
    weekly: {
      series: [
        { name: 'Revenue', data: [12000, 15000, 18000, 22000, 19000, 25000, 28000] },
        { name: 'Loads', data: [45, 52, 48, 61, 55, 67, 73] }
      ],
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      range: '7d'
    },
    monthly: {
      series: [
        { name: 'Revenue', data: [85000, 92000, 88000, 95000, 102000, 98000, 105000, 112000, 108000, 115000, 122000, 118000] },
        { name: 'Loads', data: [320, 350, 330, 380, 410, 390, 420, 450, 430, 460, 490, 470] }
      ],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      range: '12m'
    },
    quarterly: {
      series: [
        { name: 'Revenue', data: [265000, 295000, 315000, 355000] },
        { name: 'Loads', data: [1000, 1160, 1290, 1420] }
      ],
      labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
      range: '4q'
    }
  };
  
  return dataMap[period as keyof typeof dataMap] || dataMap.weekly;
};

const generateMockMetricsData = (period: string) => {
  const dataMap = {
    daily: {
      kpis: {
        loadsToday: {
          value: 23,
          change: '+12% from yesterday'
        },
        avgRatePerMile: {
          value: '$2.85',
          change: '+$0.15 from yesterday'
        },
        activeDrivers: {
          value: 156,
          change: '+8 active today'
        }
      }
    },
    weekly: {
      kpis: {
        loadsToday: {
          value: 167,
          change: '+18% from last week'
        },
        avgRatePerMile: {
          value: '$2.92',
          change: '+$0.22 from last week'
        },
        activeDrivers: {
          value: 156,
          change: '+8 new this week'
        }
      }
    },
    monthly: {
      kpis: {
        loadsToday: {
          value: 742,
          change: '+25% from last month'
        },
        avgRatePerMile: {
          value: '$3.15',
          change: '+$0.45 from last month'
        },
        activeDrivers: {
          value: 189,
          change: '+33 new this month'
        }
      }
    },
    quarterly: {
      kpis: {
        loadsToday: {
          value: 2247,
          change: '+32% from last quarter'
        },
        avgRatePerMile: {
          value: '$3.28',
          change: '+$0.58 from last quarter'
        },
        activeDrivers: {
          value: 234,
          change: '+78 new this quarter'
        }
      }
    }
  };
  
  return dataMap[period as keyof typeof dataMap] || dataMap.weekly;
};

const generateMockBottomRowData = (period: string) => {
  const baseLoads = [
    { id: 'LD-2024-001', status: 'In Transit', rate: '2,850', driver: 'John D.' },
    { id: 'LD-2024-002', status: 'Delivered', rate: '3,200', driver: 'Sarah M.' },
    { id: 'LD-2024-003', status: 'Pickup', rate: '2,650', driver: 'Mike R.' },
    { id: 'LD-2024-004', status: 'In Transit', rate: '4,100', driver: 'Lisa K.' },
    { id: 'LD-2024-005', status: 'Delivered', rate: '2,950', driver: 'Tom B.' }
  ];
  
  const dataMap = {
    daily: {
      recentLoads: baseLoads.slice(0, 3),
      totals: {
        totalRevenue: 8700,
        totalLoads: 3,
        avgRate: 2900
      }
    },
    weekly: {
      recentLoads: baseLoads,
      totals: {
        totalRevenue: 15750,
        totalLoads: 5,
        avgRate: 3150
      }
    },
    monthly: {
      recentLoads: [
        ...baseLoads,
        { id: 'LD-2024-006', status: 'Delivered', rate: '3,450', driver: 'Alex P.' },
        { id: 'LD-2024-007', status: 'In Transit', rate: '2,780', driver: 'Emma W.' },
        { id: 'LD-2024-008', status: 'Pickup', rate: '3,850', driver: 'Chris L.' }
      ],
      totals: {
        totalRevenue: 25830,
        totalLoads: 8,
        avgRate: 3229
      }
    },
    quarterly: {
      recentLoads: [
        ...baseLoads,
        { id: 'LD-2024-006', status: 'Delivered', rate: '3,450', driver: 'Alex P.' },
        { id: 'LD-2024-007', status: 'In Transit', rate: '2,780', driver: 'Emma W.' },
        { id: 'LD-2024-008', status: 'Pickup', rate: '3,850', driver: 'Chris L.' },
        { id: 'LD-2024-009', status: 'Delivered', rate: '4,200', driver: 'Maya S.' },
        { id: 'LD-2024-010', status: 'In Transit', rate: '3,650', driver: 'Ryan T.' }
      ],
      totals: {
        totalRevenue: 33680,
        totalLoads: 10,
        avgRate: 3368
      }
    }
  };
  
  return dataMap[period as keyof typeof dataMap] || dataMap.weekly;
};

const timePeriodSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('weekly')
});

export const reportAnalyticsRouter = createTRPCRouter({
  graph: publicProcedure
    .input(timePeriodSchema)
    .query(async ({ input }) => {
      try {
        console.log(`[ReportAnalytics] ✅ Serving graph data for period: ${input.period}`);
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockGraphData(input.period);
      } catch (error) {
        console.error('[ReportAnalytics] ❌ Error serving graph data:', error);
        throw error;
      }
    }),

  metrics: publicProcedure
    .input(timePeriodSchema)
    .query(async ({ input }) => {
      try {
        console.log(`[ReportAnalytics] ✅ Serving metrics data for period: ${input.period}`);
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));
        return generateMockMetricsData(input.period);
      } catch (error) {
        console.error('[ReportAnalytics] ❌ Error serving metrics data:', error);
        throw error;
      }
    }),

  bottomRow: publicProcedure
    .input(timePeriodSchema)
    .query(async ({ input }) => {
      try {
        console.log(`[ReportAnalytics] ✅ Serving bottom row data for period: ${input.period}`);
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 400));
        return generateMockBottomRowData(input.period);
      } catch (error) {
        console.error('[ReportAnalytics] ❌ Error serving bottom row data:', error);
        throw error;
      }
    })
});