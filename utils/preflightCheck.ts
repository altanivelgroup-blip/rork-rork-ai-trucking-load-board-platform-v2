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
        'EXPO_PUBLIC_RORK_API_BASE_URL=https://your-api-domain.com'
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
    
    console.log('[ReportAnalytics] ✅ Preflight check passed - API configuration OK');
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
        '3. Ensure API endpoints are accessible'
      );
    }
  }
}