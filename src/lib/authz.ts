import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

export async function isAdminClient(): Promise<boolean> {
  const u = getAuth().currentUser;
  if (!u) return false;
  const res = await u.getIdTokenResult(true).catch(() => null);
  return !!(res?.claims?.admin || res?.claims?.role === "admin");
}

// Admin role assignment utility
export async function assignAdminRole(targetEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Input validation
    if (!targetEmail?.trim()) {
      return { success: false, error: 'Email is required' };
    }
    if (targetEmail.length > 100) {
      return { success: false, error: 'Email too long' };
    }
    const sanitizedEmail = targetEmail.trim();
    
    console.log('[AdminAssign] Attempting to assign admin role to:', sanitizedEmail);
    
    const functions = getFunctions();
    const setAdminRole = httpsCallable(functions, 'setAdminRole');
    
    const result = await setAdminRole({ email: sanitizedEmail });
    console.log('[AdminAssign] ✅ Admin role assigned successfully:', result.data);
    
    // Refresh the current user's token to get updated claims
    const currentUser = getAuth().currentUser;
    if (currentUser) {
      await currentUser.getIdToken(true);
      console.log('[AdminAssign] Token refreshed for current user');
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[AdminAssign] ❌ Failed to assign admin role:', error);
    
    let errorMessage = 'Unknown error';
    if (error?.code === 'functions/permission-denied') {
      errorMessage = 'Only the owner can assign admin roles';
    } else if (error?.code === 'functions/invalid-argument') {
      errorMessage = 'Invalid email provided';
    } else if (error?.code === 'functions/not-found') {
      errorMessage = 'User not found with that email';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// Utility to refresh admin claims for current user
export async function refreshAdminClaims(): Promise<boolean> {
  try {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return false;
    
    await currentUser.getIdToken(true);
    console.log('[AdminRefresh] Claims refreshed');
    
    return await isAdminClient();
  } catch (error) {
    console.error('[AdminRefresh] Failed to refresh claims:', error);
    return false;
  }
}