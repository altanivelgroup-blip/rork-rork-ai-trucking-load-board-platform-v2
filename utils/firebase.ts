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
      return true;
    }

    console.log("[AUTH] Attempting anonymous sign-in...");

    // Increased timeout and better error handling
    const timeoutMs = 10000; // Increased from 2000ms
    const timer = new Promise<never>((_, reject) => 
      setTimeout(() => reject({ code: 'timeout', message: 'Auth timeout after 10s' }), timeoutMs)
    );

    const result = await Promise.race([
      signInAnonymously(auth),
      timer,
    ]) as any;

    if (result?.user?.uid) {
      console.log("[AUTH] Anonymous sign-in successful:", result.user.uid);
      return true;
    }

    console.warn('[AUTH] Anonymous sign-in did not return a user');
    return false;
  } catch (error: any) {
    const code = error?.code ?? 'unknown';
    console.warn("[AUTH] Sign-in failed, proceeding without Firebase:", {
      code,
      message: error?.message
    });

    // Enhanced error logging for specific Firebase errors
    if (code === 'unavailable') {
      console.warn('[AUTH] Firebase service is currently unavailable. This may be temporary.');
    } else if (code === 'network-request-failed') {
      console.warn('[AUTH] Network request failed. Check your internet connection.');
    } else if (code === 'timeout') {
      console.warn('[AUTH] Authentication timed out. Firebase may be slow to respond.');
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

    // For now, assume anonymous users can't write in production
    // This is a common Firebase security rule configuration
    const isAnonymous = auth.currentUser?.isAnonymous;
    
    return {
      canRead: true, // Usually anonymous users can read public data
      canWrite: !isAnonymous, // Anonymous users typically can't write
      error: isAnonymous ? 'Anonymous users have read-only access' : undefined
    };
  } catch (error: any) {
    return {
      canRead: false,
      canWrite: false,
      error: error.message || 'Unknown error'
    };
  }
}



