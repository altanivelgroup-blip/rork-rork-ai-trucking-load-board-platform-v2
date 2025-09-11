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
    console.log('[InitAuth] Already initialized, skipping');
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initPromise) {
    console.log('[InitAuth] Initialization in progress, waiting...');
    return initPromise;
  }

  // Start initialization
  initPromise = performInitAuth();
  
  try {
    await initPromise;
    isInitialized = true;
    console.log('[InitAuth] Initialization completed successfully');
  } catch (error) {
    console.warn('[InitAuth] Initialization failed:', error);
    // Reset promise so we can retry later
    initPromise = null;
    throw error;
  }
}

async function performInitAuth(): Promise<void> {
  try {
    console.log('[InitAuth] Starting Firebase auth initialization...');
    
    const { auth } = getFirebase();
    
    // 1) Persist sessions on web so reloads keep the same UID
    if (Platform.OS === 'web') {
      console.log('[InitAuth] Setting up web persistence...');
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('[InitAuth] Web persistence configured');
      } catch (persistError: any) {
        console.warn('[InitAuth] Failed to set persistence, continuing anyway:', persistError.message);
      }
    }

    // 2) Only create an anonymous user if there is NO current user.
    //    This prevents a new UID on every load.
    if (!auth.currentUser) {
      // ❗ Only create an anonymous session if explicitly allowed
      if (ALLOW_GUEST) {
        console.log('[InitAuth] No current user, signing in anonymously...');
        
        try {
          const result = await signInAnonymously(auth);
          console.log('[InitAuth] Anonymous sign-in successful:', result.user.uid);
        } catch (signInError: any) {
          console.warn('[InitAuth] Anonymous sign-in failed:', signInError.message);
          // Don't throw here - app can still work without auth
        }
      } else {
        console.log('[InitAuth] Guest login disabled. Waiting for real sign-in...');
      }
    } else {
      console.log('[InitAuth] User already authenticated:', auth.currentUser.uid);
    }

    // 3) Set up auth state listener (only once)
    setupAuthStateListener(auth);
    
    // 4) Set up login tracking (fire and forget) - delay to avoid conflicts
    setTimeout(() => {
      try {
        watchAndRecordLogin();
      } catch (e) {
        console.warn('[InitAuth] Login tracking setup failed:', e);
      }
    }, 1000);
    
  } catch (error: any) {
    console.error('[InitAuth] Critical initialization error:', error);
    throw error;
  }
}

// Set up the auth state change listener
let listenerSetup = false;
function setupAuthStateListener(auth: any) {
  if (listenerSetup) return;
  listenerSetup = true;
  
  console.log('[InitAuth] Setting up auth state listener...');
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('[InitAuth] Auth ready. UID:', user.uid, 'isAnonymous:', user.isAnonymous);
      
      // Optional: Store user info for quick access
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('lastAuthUID', user.uid);
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    } else {
      console.log('[InitAuth] User signed out');
      
      // Clean up stored user info
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('lastAuthUID');
        } catch (e) {
          // Ignore localStorage errors
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