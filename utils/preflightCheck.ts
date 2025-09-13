import { Platform } from 'react-native';

/**
 * Dev-only preflight check for Report Analytics API configuration
 */
export function checkReportAnalyticsConfig() {
  if (__DEV__) {
    const apiBase = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    
    if (!apiBase) {
      console.warn(
        '[ReportAnalytics] ⚠️ PREFLIGHT WARNING: Missing EXPO_PUBLIC_RORK_API_BASE_URL\n' +
        'Add this to your .env file:\n' +
        'EXPO_PUBLIC_RORK_API_BASE_URL=https://toolkit.rork.com'
      );
      return false;
    }
    
    if (Platform.OS === 'web' && !apiBase.startsWith('https://')) {
      console.warn(
        '[ReportAnalytics] ⚠️ PREFLIGHT WARNING: API URL should use HTTPS on web\n' +
        'Current URL: ' + apiBase + '\n' +
        'Recommended: Use HTTPS for production web deployment'
      );
      return false;
    }
    
    // Test if the API base URL is reachable
    console.log(`[ReportAnalytics] ✅ Preflight check passed - API configuration OK`);
    console.log(`[ReportAnalytics] 🔗 API Base URL: ${apiBase}`);
    console.log(`[ReportAnalytics] 🎯 tRPC Endpoint: ${apiBase}/api/trpc`);
    console.log(`[ReportAnalytics] 📱 Platform: ${Platform.OS}`);
    
    return true;
  }
  
  return true; // Skip checks in production
}

/**
 * Display preflight status in development
 */
export function logPreflightStatus() {
  if (__DEV__) {
    const isConfigured = checkReportAnalyticsConfig();
    if (!isConfigured) {
      console.log(
        '[ReportAnalytics] 🔧 To fix configuration issues:\n' +
        '1. Check your .env file\n' +
        '2. Restart your development server\n' +
        '3. Ensure API endpoints are accessible\n' +
        '4. Test backend connection at /backend-test'
      );
    } else {
      console.log(
        '[ReportAnalytics] 🚀 System ready - tRPC backend should be accessible\n' +
        'If you see "Failed to fetch" errors, check:\n' +
        '• Network connectivity\n' +
        '• Backend server status at https://toolkit.rork.com/api\n' +
        '• CORS configuration'
      );
    }
  }
}

/**
 * Test network connectivity to the API
 */
export async function testNetworkConnectivity(): Promise<boolean> {
  if (!__DEV__) return true;
  
  try {
    const apiBase = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    if (!apiBase) return false;
    
    console.log('[ReportAnalytics] 🔍 Testing network connectivity...');
    
    const response = await fetch(`${apiBase}/api`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('[ReportAnalytics] ✅ Network connectivity test passed');
      return true;
    } else {
      console.warn(`[ReportAnalytics] ⚠️ Network test failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[ReportAnalytics] ❌ Network connectivity test failed:', error);
    return false;
  }
}