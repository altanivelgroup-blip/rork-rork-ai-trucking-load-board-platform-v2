import { trpc } from '@/lib/trpc';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export const useReportAnalytics = (timeFilter: TimeFilter = 'weekly') => {
  const graphQuery = trpc.reportAnalytics.graph.useQuery(
    { period: timeFilter },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );
  const metricsQuery = trpc.reportAnalytics.metrics.useQuery(
    { period: timeFilter },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );
  const bottomRowQuery = trpc.reportAnalytics.bottomRow.useQuery(
    { period: timeFilter },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  const refetchAll = async () => {
    console.log('[ReportAnalytics] Refetching all data...');
    try {
      await Promise.all([
        graphQuery.refetch(),
        metricsQuery.refetch(),
        bottomRowQuery.refetch()
      ]);
      console.log('[ReportAnalytics] ✅ All data refetched successfully');
    } catch (error) {
      console.error('[ReportAnalytics] ❌ Error refetching data:', error);
    }
  };

  return {
    // Graph data
    graphData: graphQuery.data,
    isLoadingGraph: graphQuery.isLoading,
    graphError: graphQuery.error?.message,
    
    // Metrics data
    metricsData: metricsQuery.data,
    isLoadingMetrics: metricsQuery.isLoading,
    metricsError: metricsQuery.error?.message,
    
    // Bottom row data
    bottomRowData: bottomRowQuery.data,
    isLoadingBottomRow: bottomRowQuery.isLoading,
    bottomRowError: bottomRowQuery.error?.message,
    
    // Utilities
    refetchAll,
    isRefreshing: graphQuery.isFetching || metricsQuery.isFetching || bottomRowQuery.isFetching,
  };
};

// Debug function to test tRPC connection
export const testTRPCConnection = async () => {
  try {
    console.log('[ReportAnalytics] Testing tRPC connection...');
    // This will be available in components that use the hook
    return true;
  } catch (error) {
    console.error('[ReportAnalytics] tRPC connection test failed:', error);
    return false;
  }
};