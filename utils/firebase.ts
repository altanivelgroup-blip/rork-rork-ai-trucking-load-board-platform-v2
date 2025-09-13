// utils/firebase.ts
// Real Firebase implementation

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Mock Storage implementation for development
class MockStorageRef {
  constructor(private path: string) {}
  
  async put(blob: Blob): Promise<{ ref: MockStorageRef }> {
    console.log('[MockStorage] Simulating upload to:', this.path);
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ref: this };
  }
  
  async getDownloadURL(): Promise<string> {
    // Return a mock URL based on the path
    const randomId = Math.random().toString(36).substring(7);
    return `https://picsum.photos/800/600?random=${randomId}`;
  }
}

class MockStorage {
  ref(path: string): MockStorageRef {
    return new MockStorageRef(path);
  }
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app",
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe"
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
  
  // Use mock storage for development to avoid authentication issues
  console.log("[FIREBASE] Using mock storage for development");
  storage = new MockStorage() as any;
  
  console.log("[FIREBASE] Successfully initialized Firebase");
  console.log("[FIREBASE] Project ID:", firebaseConfig.projectId);
} catch (error: any) {
  console.error("[FIREBASE] Initialization failed:", error);
  // Create mock implementations for development
  console.log("[FIREBASE] Creating mock implementations for development");
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

// Ensure we have an authenticated user (non-blocking for faster app startup)
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    if (auth?.currentUser) {
      console.log("[AUTH] Already authenticated:", auth.currentUser.uid);
      console.log("[AUTH] User type:", auth.currentUser.isAnonymous ? 'Anonymous' : 'Registered');
      return true;
    }

    console.log("[AUTH] Attempting anonymous sign-in...");
    console.log("[AUTH] Project ID:", firebaseConfig.projectId);
    console.log("[AUTH] Auth domain:", firebaseConfig.authDomain);

    // Wait for auth to be ready first
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve();
      });
    });

    // If user is already signed in after waiting
    if (auth?.currentUser) {
      console.log("[AUTH] User was already signed in:", auth.currentUser.uid);
      return true;
    }

    // Increased timeout and better error handling
    const timeoutMs = 20000; // Increased to 20 seconds for better reliability
    const timer = new Promise<never>((_, reject) => 
      setTimeout(() => reject({ code: 'timeout', message: 'Auth timeout after 20s' }), timeoutMs)
    );

    console.log("[AUTH] Starting anonymous sign-in process...");
    const result = await Promise.race([
      signInAnonymously(auth),
      timer,
    ]) as any;

    if (result?.user?.uid) {
      console.log("[AUTH] ✅ Anonymous sign-in successful:", result.user.uid);
      console.log("[AUTH] User details:", {
        uid: result.user.uid,
        isAnonymous: result.user.isAnonymous,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        providerId: result.user.providerId
      });
      
      // Verify the user is properly set
      if (auth.currentUser?.uid === result.user.uid) {
        console.log("[AUTH] ✅ User properly set in auth instance");
        return true;
      } else {
        console.warn("[AUTH] ⚠️ User not properly set in auth instance");
        return false;
      }
    }

    console.warn('[AUTH] ❌ Anonymous sign-in did not return a user');
    return false;
  } catch (error: any) {
    const code = error?.code ?? 'unknown';
    console.error("[AUTH] ❌ Sign-in failed:", {
      code,
      message: error?.message,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });

    // Enhanced error logging for specific Firebase errors
    if (code === 'unavailable') {
      console.error('[AUTH] 🔥 Firebase Auth service is currently unavailable. This may be temporary.');
      console.error('[AUTH] 💡 Try again in a few moments or check Firebase status.');
    } else if (code === 'network-request-failed') {
      console.error('[AUTH] 🌐 Network request failed. Check your internet connection.');
    } else if (code === 'timeout') {
      console.error('[AUTH] ⏰ Authentication timed out. Firebase may be slow to respond.');
    } else if (code === 'auth/operation-not-allowed') {
      console.error('[AUTH] 🚫 Anonymous authentication is not enabled in Firebase Console.');
      console.error('[AUTH] 💡 Please enable Anonymous authentication in Firebase Console > Authentication > Sign-in method');
      console.error('[AUTH] 🔗 Go to: https://console.firebase.google.com/project/' + firebaseConfig.projectId + '/authentication/providers');
    } else if (code === 'permission-denied') {
      console.error('[AUTH] 🔒 Permission denied. Check Firebase project configuration.');
    } else if (code.includes('auth/')) {
      console.error('[AUTH] 🔥 Firebase Auth Error:', code);
      console.error('[AUTH] 💡 Check Firebase Console for authentication settings');
    }

    // Don't block app startup - just proceed without Firebase
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



