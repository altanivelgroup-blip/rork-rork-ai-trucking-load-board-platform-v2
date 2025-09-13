import { trpcClient } from '@/lib/trpc';

export const getLiveGraph = async () => {
  console.log('[ReportAnalytics] Fetching graph data via tRPC');
  try {
    const data = await trpcClient.reportAnalytics.graph.query();
    console.log('[ReportAnalytics] ✅ Graph data fetched successfully');
    return data;
  } catch (error: any) {
    console.error('[ReportAnalytics] ❌ Graph fetch error:', error.message);
    throw new Error(`Graph data error: ${error.message}`);
  }
};

export const getBottomRow = async () => {
  console.log('[ReportAnalytics] Fetching bottom row data via tRPC');
  try {
    const data = await trpcClient.reportAnalytics.bottomRow.query();
    console.log('[ReportAnalytics] ✅ Bottom row data fetched successfully');
    return data;
  } catch (error: any) {
    console.error('[ReportAnalytics] ❌ Bottom row fetch error:', error.message);
    throw new Error(`Bottom row data error: ${error.message}`);
  }
};

export const getLiveMetrics = async () => {
  console.log('[ReportAnalytics] Fetching metrics data via tRPC');
  try {
    const data = await trpcClient.reportAnalytics.metrics.query();
    console.log('[ReportAnalytics] ✅ Metrics data fetched successfully');
    return data;
  } catch (error: any) {
    console.error('[ReportAnalytics] ❌ Metrics fetch error:', error.message);
    throw new Error(`Metrics data error: ${error.message}`);
  }
};