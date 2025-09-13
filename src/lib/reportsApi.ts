import { getAuth } from "firebase/auth";

// Get base URL and strip trailing slash
const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!url) {
    throw new Error('Missing EXPO_PUBLIC_RORK_API_BASE_URL environment variable');
  }
  return url.replace(/\/$/, '');
})();

/**
 * Generic API GET helper with Firebase ID token authentication
 */
async function apiGET(path: string): Promise<any> {
  const fullUrl = `${API_BASE}${path}`;
  console.log(`[ReportAnalytics] Making API request to: ${fullUrl}`);
  
  try {
    // Get Firebase ID token
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[ReportAnalytics] API response received for ${path}`);
    return data;
  } catch (error: any) {
    console.error(`[ReportAnalytics] API request failed for ${path}:`, error.message);
    throw new Error(`Failed to fetch ${path}: ${error.message}`);
  }
}

/**
 * Get live graph data for report analytics
 */
export async function getLiveGraph(): Promise<any> {
  return apiGET('/api/report-analytics/graph');
}

/**
 * Get bottom row data (latest loads/anomalies)
 */
export async function getBottomRow(): Promise<any> {
  return apiGET('/api/report-analytics/bottom-row');
}

/**
 * Get live metrics (KPIs)
 */
export async function getLiveMetrics(): Promise<any> {
  return apiGET('/api/report-analytics/metrics');
}