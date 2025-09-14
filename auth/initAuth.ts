import { Platform } from 'react-native';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { getFirebase } from '@/utils/firebase';

// add at top
const ALLOW_GUEST =
  typeof process !== "undefined" &&
  process.env?.EXPO_PUBLIC_ALLOW_GUEST_LOGIN === "true";

// Track initialization state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initAuth(): Promise<void> {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('[InitAuth] ✅ Auth optimized - Already initialized, skipping');
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initPromise) {
    console.log('[InitAuth] Auth optimized - Initialization in progress, waiting...');
    return initPromise;
  }

  // Start initialization
  initPromise = performInitAuth();
  
  try {
    await initPromise;
    isInitialized = true;
    console.log('[InitAuth] ✅ Auth optimized - Initialization completed successfully');
  } catch (error) {
    console.warn('[InitAuth] ⚠️ Auth optimization - Initialization failed, will retry:', error);
    // Reset promise so we can retry later
    initPromise = null;
    // Don't throw - allow graceful degradation
    console.log('[InitAuth] 💡 Auth optimized - Continuing with fallback mode');
  }
}

async function performInitAuth(): Promise<void> {
  try {
    console.log('[InitAuth] Auth optimized - Starting enhanced Firebase auth initialization...');
    
    const { auth } = getFirebase();
    
    // 1) Enhanced web persistence with retry logic
    if (Platform.OS === 'web') {
      console.log('[InitAuth] Auth optimized - Setting up web persistence...');
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('[InitAuth] ✅ Auth optimized - Web persistence configured');
      } catch (persistError: any) {
        console.warn('[InitAuth] ⚠️ Auth optimization - Persistence setup failed, using session storage:', persistError.message);
        // Graceful fallback - app will still work
      }
    }

    // 2) Enhanced anonymous auth with better error handling
    if (!auth.currentUser) {
      if (ALLOW_GUEST) {
        console.log('[InitAuth] Auth optimized - No current user, attempting anonymous sign-in...');
        
        // Use retry logic for more robust authentication
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !auth.currentUser) {
          try {
            const result = await signInAnonymously(auth);
            console.log('[InitAuth] ✅ Auth optimized - Anonymous sign-in successful:', result.user.uid);
            console.log('[InitAuth] ✅ Auth optimized - Sign in successful');
            break;
          } catch (signInError: any) {
            retryCount++;
            const delay = Math.min(1000 * retryCount, 3000); // Progressive delay
            console.warn(`[InitAuth] ⚠️ Auth optimization - Sign-in attempt ${retryCount}/${maxRetries} failed:`, signInError.code);
            
            if (retryCount < maxRetries) {
              console.log(`[InitAuth] Auth optimized - Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error('[InitAuth] ❌ Auth optimization - All sign-in attempts failed');
              console.log('[InitAuth] 💡 Auth optimized - Continuing without authentication');
            }
          }
        }
      } else {
        console.log('[InitAuth] Auth optimized - Guest login disabled. Waiting for explicit sign-in...');
      }
    } else {
      console.log('[InitAuth] ✅ Auth optimized - User already authenticated:', auth.currentUser.uid);
      console.log('[InitAuth] ✅ Auth optimized - Sign in successful');
    }

    // 3) Set up auth state listener with enhanced logging
    setupAuthStateListener(auth);
    
    // 4) Set up login tracking with better error handling
    setTimeout(() => {
      try {
        watchAndRecordLogin();
      } catch (e) {
        console.warn('[InitAuth] ⚠️ Auth optimization - Login tracking setup failed (non-critical):', e);
      }
    }, 1000);
    
  } catch (error: any) {
    console.error('[InitAuth] ❌ Auth optimization - Critical initialization error:', error);
    // Enhanced error context
    if (error?.code) {
      console.error('[InitAuth] Error code:', error.code);
      console.error('[InitAuth] Error message:', error.message);
    }
    throw error;
  }
}

// Set up the auth state change listener
let listenerSetup = false;
function setupAuthStateListener(auth: any) {
  if (listenerSetup) return;
  listenerSetup = true;
  
  console.log('[InitAuth] Auth optimized - Setting up enhanced auth state listener...');
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('[InitAuth] ✅ Auth optimized - Auth ready. UID:', user.uid, 'isAnonymous:', user.isAnonymous);
      console.log('[InitAuth] ✅ Auth optimized - Sign in successful');
      
      // Enhanced user info storage with error handling
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('lastAuthUID', user.uid);
          window.localStorage.setItem('authTimestamp', Date.now().toString());
          console.log('[InitAuth] Auth optimized - User session cached');
        } catch (e) {
          console.warn('[InitAuth] ⚠️ Auth optimization - localStorage unavailable:', e);
        }
      }
    } else {
      console.log('[InitAuth] ⚠️ Auth optimization - User signed out');
      
      // Enhanced cleanup with error handling
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('lastAuthUID');
          window.localStorage.removeItem('authTimestamp');
          console.log('[InitAuth] Auth optimized - User session cleared');
        } catch (e) {
          console.warn('[InitAuth] ⚠️ Auth optimization - localStorage cleanup failed:', e);
        }
      }
    }
  });
}

// Helper to check if auth is ready
export function isAuthReady(): boolean {
  try {
    const { auth } = getFirebase();
    return !!auth.currentUser;
  } catch {
    return false;
  }
}

// Helper to get current user UID
export function getCurrentUserUID(): string | null {
  try {
    const { auth } = getFirebase();
    return auth.currentUser?.uid || null;
  } catch {
    return null;
  }
}

// Helper for components that need to ensure auth is ready
export async function ensureAuthReady(): Promise<boolean> {
  try {
    if (!isInitialized) {
      await initAuth();
    }
    return isAuthReady();
  } catch {
    return false;
  }
}

// Track user login events in Firestore
let loginWatcherSetup = false;
export function watchAndRecordLogin() {
  if (loginWatcherSetup) {
    console.log('[InitAuth] Login watcher already setup, skipping');
    return;
  }
  loginWatcherSetup = true;
  
  try {
    const { auth, db } = getFirebase();

    // Use a separate listener for login tracking to avoid conflicts
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      
      try {
        // 1) Keep existing users/{uid} upsert (lastLoginAt, email, isAnonymous)
        await setDoc(
          doc(db, "users", u.uid),
          {
            // server authoritative login time:
            lastLoginAt: serverTimestamp(),
            // handy extras
            isAnonymous: u.isAnonymous ?? false,
            lastProvider: u.providerData?.[0]?.providerId ?? "anonymous",
            // what the client saw from Auth (string)
            authLastSignInTime: u.metadata?.lastSignInTime || null,
            authCreationTime: u.metadata?.creationTime || null,
            device: Platform.OS, // "web" | "ios" | "android"
          },
          { merge: true }
        );
        console.log("[InitAuth] Recorded lastLoginAt for", u.uid);
        
        // 2) NEW: append to users/{uid}/logins for reliable "Last 5"
        try {
          const provider =
            u.providerData?.[0]?.providerId || (u.isAnonymous ? "anonymous" : "unknown");
          await addDoc(
            collection(db, "users", u.uid, "logins"),
            {
              createdAt: serverTimestamp(),
              device: Platform.OS,        // "web" | "ios" | "android"
              provider,                   // "anonymous", "password", "google.com", etc.
            }
          );
          console.log("[InitAuth] Login event recorded for", u.uid);
        } catch (e) {
          console.warn("[InitAuth] Failed to append login history:", e);
        }
      } catch (e) {
        console.warn("[InitAuth] Failed to record lastLoginAt:", e);
      }
    });
    
    // Store unsubscribe function for cleanup if needed
    (globalThis as any).__loginWatcherUnsubscribe = unsubscribe;
  } catch (error) {
    console.warn('[InitAuth] Failed to setup login watcher:', error);
  }
}