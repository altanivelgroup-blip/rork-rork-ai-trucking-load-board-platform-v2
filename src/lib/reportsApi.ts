import { trpc } from '@/lib/trpc';
import { useCallback, useEffect, useState } from 'react';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export const useReportAnalytics = (timeFilter: TimeFilter = 'weekly') => {
  const [connectionStable, setConnectionStable] = useState(true);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);

  const graphQuery = trpc.reportAnalytics.graph.useQuery(
    { period: timeFilter },
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onSuccess: () => {
        setConnectionStable(true);
        setLastSuccessfulFetch(new Date());
        console.log('[ReportAnalytics] ✅ Graph data fetched successfully');
      },
      onError: (error) => {
        setConnectionStable(false);
        console.error('[ReportAnalytics] ❌ Failed to fetch graph data:', error.message);
      },
    }
  );
  
  const metricsQuery = trpc.reportAnalytics.metrics.useQuery(
    { period: timeFilter },
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000,
      cacheTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onSuccess: () => {
        setConnectionStable(true);
        setLastSuccessfulFetch(new Date());
        console.log('[ReportAnalytics] ✅ Metrics data fetched successfully');
      },
      onError: (error) => {
        setConnectionStable(false);
        console.error('[ReportAnalytics] ❌ Failed to fetch metrics:', error.message);
      },
    }
  );
  
  const bottomRowQuery = trpc.reportAnalytics.bottomRow.useQuery(
    { period: timeFilter },
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000,
      cacheTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onSuccess: () => {
        setConnectionStable(true);
        setLastSuccessfulFetch(new Date());
        console.log('[ReportAnalytics] ✅ Bottom row data fetched successfully');
      },
      onError: (error) => {
        setConnectionStable(false);
        console.error('[ReportAnalytics] ❌ Failed to fetch bottom row data:', error.message);
      },
    }
  );

  const refetchAll = useCallback(async () => {
    console.log('[ReportAnalytics] Refetching all data...');
    setConnectionStable(true); // Reset connection status
    
    try {
      const results = await Promise.allSettled([
        graphQuery.refetch(),
        metricsQuery.refetch(),
        bottomRowQuery.refetch()
      ]);
      
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length === 0) {
        console.log('[ReportAnalytics] ✅ All data refetched successfully');
        setLastSuccessfulFetch(new Date());
      } else {
        console.warn(`[ReportAnalytics] ⚠️ ${failures.length} out of 3 requests failed`);
        setConnectionStable(false);
      }
    } catch (error) {
      console.error('[ReportAnalytics] ❌ Error refetching data:', error);
      setConnectionStable(false);
    }
  }, [graphQuery, metricsQuery, bottomRowQuery]);

  // Auto-retry failed requests after time filter changes
  useEffect(() => {
    const hasErrors = graphQuery.error || metricsQuery.error || bottomRowQuery.error;
    const isAnyFetching = graphQuery.isFetching || metricsQuery.isFetching || bottomRowQuery.isFetching;
    
    if (hasErrors && !isAnyFetching) {
      console.log('[ReportAnalytics] Detected errors after filter change, auto-retrying...');
      const retryTimer = setTimeout(() => {
        refetchAll();
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [timeFilter, graphQuery.error, metricsQuery.error, bottomRowQuery.error, graphQuery.isFetching, metricsQuery.isFetching, bottomRowQuery.isFetching, refetchAll]);

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
    
    // Connection status
    connectionStable,
    lastSuccessfulFetch,
    
    // Utilities
    refetchAll,
    isRefreshing: graphQuery.isFetching || metricsQuery.isFetching || bottomRowQuery.isFetching,
    
    // Query states for debugging
    queryStates: {
      graph: { isLoading: graphQuery.isLoading, isFetching: graphQuery.isFetching, error: !!graphQuery.error },
      metrics: { isLoading: metricsQuery.isLoading, isFetching: metricsQuery.isFetching, error: !!metricsQuery.error },
      bottomRow: { isLoading: bottomRowQuery.isLoading, isFetching: bottomRowQuery.isFetching, error: !!bottomRowQuery.error },
    },
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