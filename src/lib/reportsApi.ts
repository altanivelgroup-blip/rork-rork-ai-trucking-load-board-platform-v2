import { getAuth } from 'firebase/auth';
import { requireApiBaseUrl } from '@/utils/env';
import { trpc } from '@/lib/trpc';
import { useCallback, useEffect, useState } from 'react';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'quarterly';

// Helper function to make authenticated API requests
async function apiGET(path: string): Promise<any> {
  const API_BASE = requireApiBaseUrl();
  const url = `${API_BASE}${path}`;
  
  console.log(`[ReportAnalytics] Making request to: ${url}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  try {
    const user = getAuth().currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('[ReportAnalytics] Failed to get auth token:', error);
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const bodyText = await response.text().catch(() => 'Unknown error');
    const errorMsg = `[${response.status}] ${response.statusText} ${bodyText.slice(0, 100)}`;
    throw new Error(errorMsg);
  }
  
  return response.json();
}

// API functions
export const getLiveGraph = async (period?: TimeFilter) => {
  const path = period ? `/api/report-analytics/graph?period=${period}` : '/api/report-analytics/graph';
  return apiGET(path);
};

export const getLiveMetrics = async (period?: TimeFilter) => {
  const path = period ? `/api/report-analytics/metrics?period=${period}` : '/api/report-analytics/metrics';
  return apiGET(path);
};

export const getBottomRow = async (period?: TimeFilter) => {
  const path = period ? `/api/report-analytics/bottom-row?period=${period}` : '/api/report-analytics/bottom-row';
  return apiGET(path);
};

export const useReportAnalytics = (timeFilter: TimeFilter = 'weekly') => {
  const [connectionStable, setConnectionStable] = useState(true);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);

  const graphQuery = trpc.reportAnalytics.graph.useQuery(
    { period: timeFilter },
    {
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onError: (error: any) => {
        console.error('[ReportAnalytics] Graph query error:', error);
      },
    }
  );
  
  const metricsQuery = trpc.reportAnalytics.metrics.useQuery(
    { period: timeFilter },
    {
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onError: (error: any) => {
        console.error('[ReportAnalytics] Metrics query error:', error);
      },
    }
  );
  
  const bottomRowQuery = trpc.reportAnalytics.bottomRow.useQuery(
    { period: timeFilter },
    {
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onError: (error: any) => {
        console.error('[ReportAnalytics] Bottom row query error:', error);
      },
    }
  );

  // Handle success/error states with useEffect
  useEffect(() => {
    if (graphQuery.isSuccess && !graphQuery.isFetching) {
      setConnectionStable(true);
      setLastSuccessfulFetch(new Date());
      console.log('[ReportAnalytics] ✅ Graph data fetched successfully');
    }
    if (graphQuery.error) {
      setConnectionStable(false);
      console.error('[ReportAnalytics] ❌ Failed to fetch graph data:', graphQuery.error.message);
    }
  }, [graphQuery.isSuccess, graphQuery.isFetching, graphQuery.error]);

  useEffect(() => {
    if (metricsQuery.isSuccess && !metricsQuery.isFetching) {
      setConnectionStable(true);
      setLastSuccessfulFetch(new Date());
      console.log('[ReportAnalytics] ✅ Metrics data fetched successfully');
    }
    if (metricsQuery.error) {
      setConnectionStable(false);
      console.error('[ReportAnalytics] ❌ Failed to fetch metrics:', metricsQuery.error.message);
    }
  }, [metricsQuery.isSuccess, metricsQuery.isFetching, metricsQuery.error]);

  useEffect(() => {
    if (bottomRowQuery.isSuccess && !bottomRowQuery.isFetching) {
      setConnectionStable(true);
      setLastSuccessfulFetch(new Date());
      console.log('[ReportAnalytics] ✅ Bottom row data fetched successfully');
    }
    if (bottomRowQuery.error) {
      setConnectionStable(false);
      console.error('[ReportAnalytics] ❌ Failed to fetch bottom row data:', bottomRowQuery.error.message);
    }
  }, [bottomRowQuery.isSuccess, bottomRowQuery.isFetching, bottomRowQuery.error]);

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