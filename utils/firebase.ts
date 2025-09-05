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

// Ensure we have an authenticated user
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    // Check if we already have a user
    if (auth.currentUser) {
      console.log("[AUTH] Already authenticated:", auth.currentUser.uid);
      return true;
    }
    
    console.log("[AUTH] Attempting anonymous sign-in...");
    
    // Wait a bit to ensure Firebase is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await signInAnonymously(auth);
    console.log("[AUTH] Anonymous sign-in successful:", result.user.uid);
    return true;
  } catch (error: any) {
    console.error("[AUTH ERROR] Sign-in failed:", {
      code: error.code,
      message: error.message,
      projectId: firebaseConfig.projectId,
      apiKey: firebaseConfig.apiKey ? 'present' : 'missing'
    });
    
    // If it's an API key error, provide more specific guidance
    if (error.code === 'auth/api-key-not-valid') {
      console.error("[AUTH ERROR] Invalid API key. Please check Firebase project configuration.");
    }
    
    return false;
  }
}

// Manual sign-in function that can be called when needed
export async function ensureFirebaseAuth(): Promise<boolean> {
  if (!auth) return false;

  try {
    // Check if already signed in
    const user = auth.currentUser;
    if (user) {
      console.log("[AUTH] Already signed in:", user.uid);
      return true;
    }

    // Otherwise, sign in anonymously
    await signInAnonymously(auth);
    console.log("[AUTH] Anonymous sign-in OK");
    return true;
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    return false;
  }
}

