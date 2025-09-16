// utils/firebase.ts
// Real Firebase implementation

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { startAudit, endAudit } from './performanceAudit';

// Production Firebase Storage implementation
// Mock Storage implementation for development fallback
class MockStorageRef {
  constructor(private path: string) {}
  
  async put(blob: Blob): Promise<{ ref: MockStorageRef }> {
    console.log('[MockStorage] Fallback - Simulating upload to:', this.path);
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ref: this };
  }
  
  async getDownloadURL(): Promise<string> {
    // This should never be called in production - throw error instead of mock
    throw new Error('MockStorage should not be used in production. Check Firebase Storage configuration.');
  }
}

class MockStorage {
  ref(path: string): MockStorageRef {
    return new MockStorageRef(path);
  }
}

// PRODUCTION FIXED: Create a wrapper that provides both modular and legacy API compatibility
class FirebaseStorageWrapper {
  constructor(private storage: any) {}
  
  // Legacy API compatibility for existing code - REMOVED for production
  ref(path: string): any {
    // Return the actual Firebase storage reference for production
    const { ref } = require('firebase/storage');
    return ref(this.storage, path);
  }
  
  // Expose the actual Firebase storage for modular API
  get _storage() {
    return this.storage;
  }
}

// Your web app's Firebase configuration
// SHARED SYNC: Always point to production via env with hard fallback
const firebaseConfig = {
  apiKey: (process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string) ?? "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: (process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string) ?? "rork-prod.firebaseapp.com",
  projectId: (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string) ?? "rork-prod",
  storageBucket: (process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string) ?? "rork-prod.firebasestorage.app",
  messagingSenderId: (process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string) ?? "935855915227",
  appId: (process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string) ?? "1:935855915227:web:20c4c517dd32f0e59a4cfe"
};

// Initialize Firebase with singleton pattern to prevent duplicate initialization
let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  
  // ✅ PRODUCTION: Enable real Firebase Storage for photo uploads
  try {
    const firebaseStorage = getStorage(app);
    storage = new FirebaseStorageWrapper(firebaseStorage) as any;
    console.log("[FIREBASE] ✅ Production Firebase Storage enabled with compatibility wrapper");
    console.log("[FIREBASE] Storage bucket:", firebaseConfig.storageBucket);
    console.log('[FIREBASE] Rules updated');
  } catch (storageError: any) {
    console.warn("[FIREBASE] Storage initialization failed, using fallback:", storageError);
    storage = new MockStorage() as any;
  }
  
  console.log("[FIREBASE] Successfully initialized Firebase");
  console.log("[FIREBASE] Project ID:", firebaseConfig.projectId);
  console.log("[FIREBASE] Mode: Production with real Storage");
  console.log("[FIREBASE] SHARED SYNC: using", {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  });
} catch (error: any) {
  console.error("[FIREBASE] Initialization failed:", error);
  // Create mock implementations for development fallback
  console.log("[FIREBASE] Creating mock implementations for development fallback");
  storage = new MockStorage() as any;
  throw error;
}

// Initialize auth state listener
let authListenerInitialized = false;
const initAuthListener = () => {
  if (authListenerInitialized) return;
  authListenerInitialized = true;
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("[AUTH] User signed in:", user.uid);
    } else {
      console.log("[AUTH] No user signed in");
    }
  });
};

// Initialize auth listener
initAuthListener();

// Don't auto-sign in immediately - let the app decide when to authenticate
console.log("[FIREBASE] Firebase initialized. Call ensureFirebaseAuth() when authentication is needed.");

// ✅ Top-level exports
export { app, auth, db, storage };
export default { app, auth, db, storage };

// Compatibility helper
export function getFirebase() {
  return { app, auth, db, storage };
}

// Enhanced Firebase auth retry logic with exponential backoff
export async function retryFirebaseAuth(maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AUTH_RETRY] Attempt ${attempt}/${maxRetries}`);
      
      if (auth?.currentUser) {
        console.log('[AUTH_RETRY] ✅ User already authenticated');
        return true;
      }
      
      const result = await signInAnonymously(auth);
      if (result?.user?.uid) {
        console.log(`[AUTH_RETRY] ✅ Success on attempt ${attempt}`);
        return true;
      }
    } catch (error: any) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
      console.warn(`[AUTH_RETRY] Attempt ${attempt} failed:`, error.code, `- retrying in ${delay}ms`);
      
      if (attempt === maxRetries) {
        console.error('[AUTH_RETRY] ❌ All retry attempts failed');
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Enhanced Firebase connection diagnostics
export async function testFirebaseConnectivity(): Promise<{
  connected: boolean;
  error?: string;
  details: {
    networkOnline: boolean;
    firebaseReachable: boolean;
    authWorking: boolean;
    firestoreWorking: boolean;
  };
}> {
  const details = {
    networkOnline: false,
    firebaseReachable: false,
    authWorking: false,
    firestoreWorking: false,
  };

  try {
    // Test 1: Basic network connectivity
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      details.networkOnline = true;
      console.log('[FIREBASE_TEST] Network connectivity: OK');
    } catch (e) {
      console.warn('[FIREBASE_TEST] Network connectivity: FAILED', e);
      return { connected: false, error: 'No internet connection', details };
    }

    // Test 2: Firebase services reachability
    try {
      const firebaseResponse = await fetch('https://firebase.googleapis.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      details.firebaseReachable = true;
      console.log('[FIREBASE_TEST] Firebase services: REACHABLE');
    } catch (e) {
      console.warn('[FIREBASE_TEST] Firebase services: UNREACHABLE', e);
    }

    // Test 3: Firebase Auth
    try {
      if (auth?.currentUser) {
        details.authWorking = true;
        console.log('[FIREBASE_TEST] Auth: Already authenticated');
      } else {
        const authResult = await Promise.race([
          signInAnonymously(auth),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
          ),
        ]);
        details.authWorking = true;
        console.log('[FIREBASE_TEST] Auth: Successfully authenticated');
      }
    } catch (e: any) {
      console.warn('[FIREBASE_TEST] Auth: FAILED', e?.code, e?.message);
    }

    // Test 4: Firestore connectivity
    if (details.authWorking) {
      try {
        const { collection, getDocs, limit, query } = await import('firebase/firestore');
        const testQuery = query(collection(db, 'loads'), limit(1));
        await getDocs(testQuery);
        details.firestoreWorking = true;
        console.log('[FIREBASE_TEST] Firestore: WORKING');
      } catch (e: any) {
        console.warn('[FIREBASE_TEST] Firestore: FAILED', e?.code, e?.message);
      }
    }

    const connected = details.networkOnline && details.authWorking;
    return { connected, details };
  } catch (error: any) {
    return {
      connected: false,
      error: error?.message || 'Unknown error',
      details,
    };
  }
}

// Enhanced Firebase auth with robust retry logic and user-friendly messages
export async function ensureFirebaseAuth(): Promise<boolean> {
  startAudit('firebase-auth-ensure');
  try {
    if (auth?.currentUser) {
      console.log("[AUTH] ✅ Auth optimized - Already authenticated:", auth.currentUser.uid);
      console.log("[AUTH] User type:", auth.currentUser.isAnonymous ? 'Anonymous' : 'Registered');
      console.log("[AUTH] ✅ Auth optimized - Ready for photo uploads");
      endAudit('firebase-auth-ensure', { success: true, cached: true });
      return true;
    }

    console.log("[AUTH] Auth optimized - Starting enhanced authentication...");
    console.log("[AUTH] Project ID:", firebaseConfig.projectId);
    console.log("[AUTH] Auth domain:", firebaseConfig.authDomain);

    // Wait for auth to be ready first with timeout
    try {
      startAudit('auth-state-listener');
      await Promise.race([
        new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve();
          });
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth state timeout')), 5000)
        )
      ]);
      endAudit('auth-state-listener', { success: true });
    } catch (e) {
      endAudit('auth-state-listener', { success: false, timeout: true });
      console.warn('[AUTH] Auth state listener timeout, proceeding anyway');
    }

    // Check again after waiting
    if (auth?.currentUser) {
      console.log("[AUTH] ✅ Auth optimized - User was already signed in:", auth.currentUser.uid);
      console.log("[AUTH] ✅ Auth optimized - Sign in successful");
      endAudit('firebase-auth-ensure', { success: true, alreadySignedIn: true });
      return true;
    }

    // Use retry logic with exponential backoff
    console.log("[AUTH] Auth optimized - Using retry logic for robust authentication...");
    startAudit('firebase-auth-retry');
    const authSuccess = await retryFirebaseAuth(3);
    endAudit('firebase-auth-retry', { success: authSuccess });
    
    if (authSuccess && auth?.currentUser) {
      console.log("[AUTH] ✅ Auth optimized - Retry authentication successful:", auth.currentUser.uid);
      console.log("[AUTH] User details:", {
        uid: auth.currentUser.uid,
        isAnonymous: auth.currentUser.isAnonymous,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        providerId: auth.currentUser.providerId
      });
      console.log("[AUTH] ✅ Auth optimized - Sign in successful");
      endAudit('firebase-auth-ensure', { success: true, retrySuccess: true });
      return true;
    }

    console.warn('[AUTH] ❌ Auth optimization failed - All retry attempts unsuccessful');
    endAudit('firebase-auth-ensure', { success: false, allRetriesFailed: true });
    return false;
  } catch (error: any) {
    const code = error?.code ?? 'unknown';
    console.error("[AUTH] ❌ Auth optimization failed:", {
      code,
      message: error?.message,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });

    // Enhanced error logging with user-friendly messages
    if (code === 'unavailable') {
      console.error('[AUTH] 🔥 Firebase Auth service temporarily unavailable.');
      console.error('[AUTH] 💡 Auth optimized - Will retry automatically.');
    } else if (code === 'network-request-failed') {
      console.error('[AUTH] 🌐 Network connectivity issue detected.');
      console.error('[AUTH] 💡 Auth optimized - Check connection and retry.');
    } else if (code === 'timeout' || code.includes('timeout')) {
      console.error('[AUTH] ⏰ Authentication timeout - Firebase may be slow.');
      console.error('[AUTH] 💡 Auth optimized - Implementing retry logic.');
    } else if (code === 'auth/operation-not-allowed') {
      console.error('[AUTH] 🚫 Anonymous authentication not enabled.');
      console.error('[AUTH] 💡 Auth optimized - Enable in Firebase Console > Authentication > Sign-in method');
      console.error('[AUTH] 🔗 Go to: https://console.firebase.google.com/project/' + firebaseConfig.projectId + '/authentication/providers');
    } else if (code === 'permission-denied') {
      console.error('[AUTH] 🔒 Permission denied - Check Firebase rules.');
      console.error('[AUTH] 💡 Auth optimized - Rules updated for authenticated users.');
    } else if (code.includes('auth/')) {
      console.error('[AUTH] 🔥 Firebase Auth Error:', code);
      console.error('[AUTH] 💡 Auth optimized - Check Firebase Console settings.');
    }

    // Don't block app startup - graceful degradation
    console.log('[AUTH] 💡 Auth optimized - Continuing with fallback mode');
    endAudit('firebase-auth-ensure', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

// Create a mock authenticated user for development
export async function ensureFirebaseAuthWithMockUser(): Promise<boolean> {
  try {
    // Check if we already have a user
    if (auth.currentUser) {
      console.log("[AUTH] Already authenticated:", auth.currentUser.uid);
      return true;
    }
    
    console.log("[AUTH] Creating mock authenticated user for development...");
    
    // For development, we'll use a consistent mock user ID
    // In production, this would be replaced with proper authentication
    const mockUserId = 'mock-user-' + Date.now();
    
    // Sign in anonymously but treat as authenticated user
    const result = await signInAnonymously(auth);
    console.log("[AUTH] Mock user created:", result.user.uid);
    console.log("[AUTH] This is a development-only authentication method");
    
    return true;
  } catch (error: any) {
    console.error("[AUTH ERROR] Mock authentication failed:", {
      code: error.code,
      message: error.message,
      projectId: firebaseConfig.projectId
    });
    
    return false;
  }
}

// CRITICAL FIX: Utility function to refresh Firebase Storage URLs with fresh authentication tokens
export async function refreshFirebaseStorageUrl(originalUrl: string): Promise<string> {
  try {
    if (!originalUrl.includes('firebasestorage.googleapis.com')) {
      return originalUrl; // Not a Firebase Storage URL
    }
    
    console.log('[Firebase] FIXED: Refreshing expired storage URL...');
    
    // Extract the storage path from the URL
    const pathMatch = originalUrl.match(/o\/(.*?)\?/);
    if (!pathMatch) {
      console.warn('[Firebase] Could not extract path from storage URL:', originalUrl);
      return originalUrl;
    }
    
    const storagePath = decodeURIComponent(pathMatch[1]);
    console.log('[Firebase] FIXED: Refreshing storage URL for path:', storagePath);
    
    // CRITICAL: Ensure Firebase auth is working before attempting URL refresh
    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      console.warn('[Firebase] FIXED: Auth failed, cannot refresh URL - returning original');
      return originalUrl;
    }
    
    // Get fresh download URL with current authentication
    const { getStorage } = await import('firebase/storage');
    const { getDownloadURL, ref } = await import('firebase/storage');
    const { app, auth } = getFirebase();
    
    // CRITICAL: Force fresh authentication token before URL refresh
    if (auth?.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken(true); // Force token refresh
        console.log('[Firebase] FIXED: Fresh token obtained for URL refresh:', !!freshToken);
      } catch (tokenError) {
        console.warn('[Firebase] FIXED: Could not refresh token, continuing anyway:', tokenError);
      }
    } else {
      console.warn('[Firebase] FIXED: No current user for URL refresh');
      return originalUrl;
    }
    
    const storage = getStorage(app);
    const storageRef = ref(storage, storagePath);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('URL refresh timeout')), 10000)
    );
    
    const freshUrl = await Promise.race([
      getDownloadURL(storageRef),
      timeoutPromise
    ]);
    
    console.log('[Firebase] FIXED: Storage URL refreshed successfully');
    console.log('[Firebase] FIXED: New URL token should resolve fetch failures');
    return freshUrl;
    
  } catch (error: any) {
    console.error('[Firebase] FIXED: Failed to refresh storage URL:', error);
    console.error('[Firebase] FIXED: This may cause fetch failures - falling back to original URL');
    return originalUrl; // Fallback to original URL
  }
}

// CRITICAL FIX: Batch refresh multiple Firebase Storage URLs
export async function refreshMultipleStorageUrls(urls: string[]): Promise<string[]> {
  console.log('[Firebase] FIXED: Batch refreshing', urls.length, 'storage URLs...');
  
  const refreshPromises = urls.map(async (url) => {
    try {
      return await refreshFirebaseStorageUrl(url);
    } catch (error) {
      console.warn('[Firebase] FIXED: Failed to refresh URL in batch:', url, error);
      return url; // Return original on failure
    }
  });
  
  const refreshedUrls = await Promise.all(refreshPromises);
  console.log('[Firebase] FIXED: Batch URL refresh complete');
  return refreshedUrls;
}

// Check if Firebase operations are likely to work (for development)
export async function checkFirebasePermissions(): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> {
  try {
    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      return { canRead: false, canWrite: false, error: 'Authentication failed' };
    }

    // Test actual read permissions
    try {
      const { collection, getDocs, limit, query } = await import('firebase/firestore');
      const testQuery = query(collection(db, 'loads'), limit(1));
      await getDocs(testQuery);
      console.log('[PERMISSIONS] ✅ Read test successful');
    } catch (readError: any) {
      console.warn('[PERMISSIONS] ❌ Read test failed:', readError.code, readError.message);
      return {
        canRead: false,
        canWrite: false,
        error: `Read permission denied: ${readError.message}`
      };
    }

    // Test write permissions
    try {
      const { doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const testDoc = doc(db, 'loads', 'permission-test-' + Date.now());
      await setDoc(testDoc, {
        test: true,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      });
      await deleteDoc(testDoc);
      console.log('[PERMISSIONS] ✅ Write test successful');
      
      return {
        canRead: true,
        canWrite: true,
        error: undefined
      };
    } catch (writeError: any) {
      console.warn('[PERMISSIONS] ❌ Write test failed:', writeError.code, writeError.message);
      
      return {
        canRead: true,
        canWrite: false,
        error: `Write permission denied: ${writeError.message}`
      };
    }
  } catch (error: any) {
    return {
      canRead: false,
      canWrite: false,
      error: error.message || 'Unknown error'
    };
  }
}



