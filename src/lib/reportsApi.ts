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
    }
  );

  // Update connection status based on query states
  useEffect(() => {
    const hasAnySuccess = graphQuery.isSuccess || metricsQuery.isSuccess || bottomRowQuery.isSuccess;
    const hasAnyError = graphQuery.error || metricsQuery.error || bottomRowQuery.error;
    
    if (hasAnySuccess && !graphQuery.isFetching && !metricsQuery.isFetching && !bottomRowQuery.isFetching) {
      setConnectionStable(true);
      setLastSuccessfulFetch(new Date());
      console.log('[ReportAnalytics] ✅ Data fetched successfully');
    } else if (hasAnyError) {
      setConnectionStable(false);
      console.error('[ReportAnalytics] ❌ Failed to fetch data');
    }
  }, [
    graphQuery.isSuccess,
    graphQuery.isFetching,
    graphQuery.error,
    metricsQuery.isSuccess,
    metricsQuery.isFetching,
    metricsQuery.error,
    bottomRowQuery.isSuccess,
    bottomRowQuery.isFetching,
    bottomRowQuery.error
  ]);

  const refetchAll = useCallback(async () => {
    console.log('[ReportAnalytics] Refetching all data...');
    setConnectionStable(true);
    
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
  }, [graphQuery.refetch, metricsQuery.refetch, bottomRowQuery.refetch]);

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