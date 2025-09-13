import { getIdTokenResult } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';

/**
 * Check if the current user has admin privileges
 * Checks both custom claims (admin: true) and role-based claims (role: 'admin')
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdminClient(): Promise<boolean> {
  try {
    console.log('[ReportAnalytics] Checking admin privileges...');
    
    const { auth } = getFirebase();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log('[ReportAnalytics] No authenticated user');
      return false;
    }
    
    // Get fresh token with claims
    const idTokenResult = await getIdTokenResult(currentUser, true);
    const claims = idTokenResult.claims;
    
    console.log('[ReportAnalytics] User claims:', {
      admin: claims.admin,
      role: claims.role,
      email: currentUser.email
    });
    
    // Check for admin privileges
    const isAdmin = claims.admin === true || claims.role === 'admin';
    
    console.log('[ReportAnalytics] Admin check result:', isAdmin);
    return isAdmin;
    
  } catch (error) {
    console.error('[ReportAnalytics] Error checking admin privileges:', error);
    return false;
  }
}

/**
 * Check if user is authenticated (has any valid user)
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { auth } = getFirebase();
    return !!auth.currentUser;
  } catch (error) {
    console.error('[ReportAnalytics] Error checking authentication:', error);
    return false;
  }
}