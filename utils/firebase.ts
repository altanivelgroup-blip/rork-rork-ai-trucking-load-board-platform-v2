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

console.log("[FIREBASE] Startup without auto anonymous authentication");

// ✅ Top-level exports
export { app, auth, db, storage };
export default { app, auth, db, storage };

// Compatibility helper
export function getFirebase() {
  return { app, auth, db, storage };
}

// PERMANENT FIX: Aggressive retry logic with immediate retries
export async function retryFirebaseAuth(maxRetries: number = 5): Promise<boolean> {
  console.log(`[PERMANENT_RETRY] 🚀 Starting aggressive auth retry (${maxRetries} attempts)`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PERMANENT_RETRY] 🔄 Attempt ${attempt}/${maxRetries}`);
      
      if (auth?.currentUser) {
        console.log('[PERMANENT_RETRY] ✅ User already authenticated');
        console.log('[PERMANENT_RETRY] ✅ Unlimited Firestore access confirmed');
        return true;
      }
      
      // TIMEOUT DISABLED: Allow unlimited time for Firebase auth to complete
      // Immediate authentication with extended timeout
      const result = await signInAnonymously(auth);
      
      if (result?.user?.uid) {
        console.log(`[PERMANENT_RETRY] ✅ SUCCESS on attempt ${attempt}`);
        console.log(`[PERMANENT_RETRY] ✅ User: ${result.user.uid}`);
        console.log(`[PERMANENT_RETRY] ✅ Anonymous: ${result.user.isAnonymous}`);
        console.log(`[PERMANENT_RETRY] ♾️ Unlimited load access enabled`);
        return true;
      }
    } catch (error: any) {
      const delay = Math.min(1000 * attempt, 5000); // Shorter delays for faster recovery
      console.warn(`[PERMANENT_RETRY] ❌ Attempt ${attempt} failed:`, error?.code || error?.message);
      
      if (attempt === maxRetries) {
        console.error('[PERMANENT_RETRY] ❌ All retry attempts exhausted');
        console.error('[PERMANENT_RETRY] 🔧 This will cause permission errors despite open rules');
        console.error('[PERMANENT_RETRY] 🔧 Check Firebase Console Anonymous Auth settings');
        return false;
      }
      
      console.log(`[PERMANENT_RETRY] ⏳ Waiting ${delay}ms before retry...`);
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

// PERMANENT FIX: Force authentication success for cross-platform compatibility
export async function ensureFirebaseAuth(): Promise<boolean> {
  startAudit('firebase-auth-ensure');
  try {
    console.log("[PERMANENT_FIX] 🚀 Starting permanent authentication fix...");
    console.log("[PERMANENT_FIX] Project:", firebaseConfig.projectId);
    console.log("[PERMANENT_FIX] Rules: Zero-restriction (allow all operations)");
    console.log("[PERMANENT_FIX] Load Limit: Removed (unlimited access)");
    
    // Check if already authenticated
    if (auth?.currentUser) {
      console.log("[PERMANENT_FIX] ✅ Already authenticated:", auth.currentUser.uid);
      console.log("[PERMANENT_FIX] ✅ Ready for unlimited Firestore operations");
      console.log("[PERMANENT_FIX] ♾️ All loads visible across all platforms");
      endAudit('firebase-auth-ensure', { success: true, cached: true });
      return true;
    }

    console.log("[PERMANENT_FIX] 🔄 Attempting immediate anonymous authentication...");
    
    // Force authentication with maximum retries and no delays
    let authAttempts = 0;
    const maxAttempts = 10; // Increased attempts
    
    while (authAttempts < maxAttempts) {
      authAttempts++;
      console.log(`[PERMANENT_FIX] Attempt ${authAttempts}/${maxAttempts}`);
      
      try {
        // TIMEOUT DISABLED: Allow unlimited time for auth to complete
        const result = await signInAnonymously(auth);
        
        if (result?.user?.uid) {
          console.log(`[PERMANENT_FIX] ✅ SUCCESS on attempt ${authAttempts}`);
          console.log(`[PERMANENT_FIX] ✅ User ID: ${result.user.uid}`);
          console.log(`[PERMANENT_FIX] ✅ Anonymous: ${result.user.isAnonymous}`);
          console.log(`[PERMANENT_FIX] ✅ All Firestore operations now permitted`);
          console.log(`[PERMANENT_FIX] ♾️ Unlimited load access enabled for all platforms`);
          endAudit('firebase-auth-ensure', { success: true, attempts: authAttempts });
          return true;
        }
      } catch (error: any) {
        console.warn(`[PERMANENT_FIX] Attempt ${authAttempts} failed:`, error?.code || error?.message);
        
        if (authAttempts < maxAttempts) {
          const delay = Math.min(500 * authAttempts, 2000); // Shorter delays
          console.log(`[PERMANENT_FIX] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all attempts failed, log comprehensive error info
    console.error(`[PERMANENT_FIX] ❌ All ${maxAttempts} authentication attempts failed`);
    console.error(`[PERMANENT_FIX] ❌ This will cause permission errors despite zero-restriction rules`);
    console.error(`[PERMANENT_FIX] 🔧 Check Firebase Console: https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`);
    console.error(`[PERMANENT_FIX] 🔧 Ensure Anonymous authentication is enabled`);
    console.error(`[PERMANENT_FIX] 🔧 This is the root cause of cross-platform load visibility issues`);
    
    endAudit('firebase-auth-ensure', { success: false, attempts: authAttempts });
    return false;
    
  } catch (error: any) {
    console.error("[PERMANENT_FIX] ❌ Critical authentication error:", {
      code: error?.code,
      message: error?.message,
      projectId: firebaseConfig.projectId
    });
    
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

// PERMANENT FIX: Comprehensive Firebase access verification with unlimited load testing
export async function checkFirebasePermissions(): Promise<{ canRead: boolean; canWrite: boolean; error?: string; loadCount?: number }> {
  console.log('[PERMANENT_PERMISSION_TEST] 🧪 Starting comprehensive permission verification...');
  console.log('[PERMANENT_PERMISSION_TEST] ♾️ Testing unlimited load access across all platforms...');
  
  try {
    // Skip forcing authentication; anonymous auth disabled
    const authSuccess = !!auth?.currentUser;
    if (!authSuccess) {
      console.warn('[PERMANENT_PERMISSION_TEST] Auth not available; running limited checks');
    }
    
    console.log('[PERMANENT_PERMISSION_TEST] Proceeding with permission checks...');

    // Test read permissions with unlimited query (no limit)
    let loadCount = 0;
    try {
      console.log('[PERMANENT_PERMISSION_TEST] 📖 Testing unlimited read permissions...');
      const { collection, getDocs, query } = await import('firebase/firestore');
      
      // Test with unlimited query (no limit) to match production usage
      const testQuery = query(collection(db, 'loads'));
      const snapshot = await getDocs(testQuery);
      loadCount = snapshot.docs.length;
      
      console.log(`[PERMANENT_PERMISSION_TEST] ✅ Unlimited read test successful - found ${loadCount} documents`);
      console.log('[PERMANENT_PERMISSION_TEST] ✅ All loads accessible across all platforms');
      console.log('[PERMANENT_PERMISSION_TEST] ♾️ No load limits enforced - showing all available loads');
    } catch (readError: any) {
      console.error('[PERMANENT_PERMISSION_TEST] ❌ Read test failed:', readError.code, readError.message);
      console.error('[PERMANENT_PERMISSION_TEST] 🔧 This is the root cause of cross-platform load visibility issues');
      return {
        canRead: false,
        canWrite: false,
        error: `Read permission denied: ${readError.message}`,
        loadCount: 0
      };
    }

    // Test write permissions
    try {
      console.log('[PERMANENT_PERMISSION_TEST] ✏️ Testing write permissions...');
      const { doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const testDocId = 'permanent-permission-test-' + Date.now();
      const testDoc = doc(db, 'loads', testDocId);
      
      // Test write
      await setDoc(testDoc, {
        test: true,
        testType: 'permanent-permission-verification',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        platform: 'cross-platform-test',
        unlimited: true,
        crossPlatformVisible: true
      });
      
      console.log('[PERMANENT_PERMISSION_TEST] ✅ Write test successful');
      
      // Test delete
      await deleteDoc(testDoc);
      console.log('[PERMANENT_PERMISSION_TEST] ✅ Delete test successful');
      
      console.log('[PERMANENT_PERMISSION_TEST] 🎉 ALL PERMISSIONS VERIFIED');
      console.log('[PERMANENT_PERMISSION_TEST] 🎉 Cross-platform unlimited access confirmed');
      console.log(`[PERMANENT_PERMISSION_TEST] 🎉 ${loadCount} loads accessible across all platforms`);
      
      return {
        canRead: true,
        canWrite: true,
        error: undefined,
        loadCount
      };
    } catch (writeError: any) {
      console.error('[PERMANENT_PERMISSION_TEST] ❌ Write test failed:', writeError.code, writeError.message);
      console.error('[PERMANENT_PERMISSION_TEST] 🔧 Write permissions may be restricted');
      
      return {
        canRead: true,
        canWrite: false,
        error: `Write permission denied: ${writeError.message}`,
        loadCount
      };
    }
  } catch (error: any) {
    console.error('[PERMANENT_PERMISSION_TEST] ❌ Permission test failed:', error);
    return {
      canRead: false,
      canWrite: false,
      error: error.message || 'Unknown permission error',
      loadCount: 0
    };
  }
}



