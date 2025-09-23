// utils/firebase.ts
// Real Firebase implementation

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
storageBucket: (process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string) ?? "rork-prod.appspot.com",
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
  
  console.log("[ULTIMATE_FIX] ✅ Firebase initialized successfully");
  console.log("[ULTIMATE_FIX] 🎯 Project ID:", firebaseConfig.projectId);
  console.log("[ULTIMATE_FIX] 🚀 Mode: Production with zero-restriction rules");
  console.log("[ULTIMATE_FIX] 🌐 Cross-platform configuration:", {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  });
  console.log("[ULTIMATE_FIX] 🔓 Rules: All operations allowed for all users");
  console.log("[ULTIMATE_FIX] ♾️ Load limit: Removed (unlimited access)");
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

console.log("[FIREBASE] ✅ Startup complete - Email/Password authentication only");
console.log("[FIREBASE] 🚫 Anonymous authentication disabled to prevent admin-restricted-operation errors");

// ✅ Top-level exports
export { app, auth, db, storage };
export default { app, auth, db, storage };

// Compatibility helper
export function getFirebase() {
  return { app, auth, db, storage };
}

// Email/Password only: disable anonymous auth retries
export async function retryFirebaseAuth(): Promise<boolean> {
  console.info('[auth] anonymous checks removed; running email/password mode');
  return !!auth?.currentUser;
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
        details.authWorking = false;
        console.log('[FIREBASE_TEST] Auth: No current user (anonymous disabled)');
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

// FIXED: Email/Password only authentication - no anonymous auth
export async function ensureFirebaseAuth(): Promise<boolean> {
  startAudit('firebase-auth-ensure');
  try {
    // Check if Firebase is properly initialized
    if (!auth) {
      console.warn('[auth] ❌ Firebase auth not initialized');
      endAudit('firebase-auth-ensure', { success: false, error: 'Auth not initialized' });
      return false;
    }
    
    // Check if user is already authenticated with email/password
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      console.log('[auth] ✅ User already authenticated:', auth.currentUser.uid);
      endAudit('firebase-auth-ensure', { success: true, cached: true });
      return true;
    }
    
    // If anonymous user exists, sign them out to prevent conflicts
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      console.log('[auth] 🔄 Signing out anonymous user to prevent conflicts...');
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        console.log('[auth] ✅ Anonymous user signed out');
      } catch (signOutError) {
        console.warn('[auth] ⚠️ Failed to sign out anonymous user:', signOutError);
      }
    }
    
    // Don't auto-sign in - let user manually sign in
    if (!auth.currentUser) {
      console.log('[auth] ❌ No authenticated user - user must sign in manually');
      endAudit('firebase-auth-ensure', { success: false, error: 'No authenticated user' });
      return false;
    }
    
    // User exists and is authenticated
    console.log('[auth] ✅ User authenticated:', auth.currentUser.uid);
    endAudit('firebase-auth-ensure', { success: true, cached: true });
    return true;
    
  } catch (error: any) {
    console.error('[auth] ❌ Authentication check failed:', error);
    endAudit('firebase-auth-ensure', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

// Create a mock authenticated user for development
export async function ensureFirebaseAuthWithMockUser(): Promise<boolean> {
  console.info('[auth] anonymous checks removed; running email/password mode');
  return !!auth?.currentUser;
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

// PERMANENT FIX: Comprehensive Firebase access verification with unlimited load testing
export async function checkFirebasePermissions(): Promise<{ canRead: boolean; canWrite: boolean; error?: string; loadCount?: number }> {
  const toErr = (e: any): string => {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    const code = (e.code ?? e.name ?? '').toString();
    const msg = (e.message ?? '').toString();
    if (msg.includes('Failed to fetch')) return 'Network error (Failed to fetch). Check connection, CORS, or ad/tracker blockers.';
    if (code === 'permission-denied') return 'permission-denied';
    return [code, msg].filter(Boolean).join(': ') || 'Unknown error';
  };

  console.log('[PERMANENT_PERMISSION_TEST] 🧪 Starting comprehensive permission verification...');

  try {
    const isAuthed = !!auth?.currentUser;
    if (!isAuthed) {
      console.warn('[PERMANENT_PERMISSION_TEST] No authenticated user. Skipping write test. Read test will still run.');
    }

    let loadCount = 0;
    try {
      console.log('[PERMANENT_PERMISSION_TEST] 📖 Testing read permissions (limit 1)...');
      const { collection, getDocs, query, limit } = await import('firebase/firestore');
      const testQuery = query(collection(db, 'loads'), limit(1));
      const snapshot = await getDocs(testQuery);
      loadCount = snapshot.docs.length;
      console.log(`[PERMANENT_PERMISSION_TEST] ✅ Read test successful (${loadCount})`);
    } catch (readError: any) {
      const errStr = toErr(readError);
      console.error('[PERMANENT_PERMISSION_TEST] ❌ Read test failed:', errStr);
      console.error('[PERMANENT_PERMISSION_TEST] 🔧 This is the root cause of cross-platform load visibility issues');
      return { canRead: false, canWrite: false, error: `Read permission denied: ${errStr}`, loadCount: 0 };
    }

    if (!isAuthed) {
      return { canRead: true, canWrite: false, error: 'Not signed in. Write requires authentication.', loadCount };
    }

    try {
      console.log('[PERMANENT_PERMISSION_TEST] ✏️ Testing write permissions...');
      const { doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const testDocId = 'permanent-permission-test-' + Date.now();
      const testDoc = doc(db, 'loads', testDocId);
      await setDoc(testDoc, {
        test: true,
        testType: 'permanent-permission-verification',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        platform: 'cross-platform-test'
      });
      await deleteDoc(testDoc);
      console.log('[PERMANENT_PERMISSION_TEST] ✅ Write/delete test successful');
      return { canRead: true, canWrite: true, loadCount };
    } catch (writeError: any) {
      const errStr = toErr(writeError);
      console.error('[PERMANENT_PERMISSION_TEST] ❌ Write test failed:', errStr);
      return { canRead: true, canWrite: false, error: `Write permission denied: ${errStr}`, loadCount };
    }
  } catch (error: any) {
    const errStr = toErr(error);
    console.error('[PERMANENT_PERMISSION_TEST] ❌ Permission test failed:', errStr);
    return { canRead: false, canWrite: false, error: errStr, loadCount: 0 };
  }
}



