// utils/firebase.ts
// One file to initialize Firebase correctly on both Web and React-Native.

import { Platform } from "react-native"; // safe on web builds too (RN shim)

import { initializeApp, getApps, FirebaseApp } from "firebase/app";

import {
  // RN + Web safe auth imports
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";

import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ---- Firebase config for development ----
// For production, replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo",
};

// Check if we're in development mode and use emulator
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
// ------------------------------------------------------------

let app: FirebaseApp | null = null;
try {
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  console.log("[FIREBASE] App initialized successfully", {
    projectId: app.options.projectId,
    authDomain: app.options.authDomain,
    isDevelopment
  });
} catch (error: any) {
  console.error("[FIREBASE] App initialization failed:", error);
  // In development, continue without Firebase
  if (isDevelopment) {
    console.warn("[FIREBASE] Continuing in development mode without Firebase");
    app = null;
  } else {
    throw error;
  }
}

// --- Auth (platform-safe) ---
let auth: Auth | null = null;
if (app) {
  if (Platform.OS === "web") {
    auth = getAuth(app);
    // Only the web SDK supports browserLocalPersistence
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } else {
    // React-Native: use getAuth for simplicity
    auth = getAuth(app);
  }
}

// Monitor auth state and attempt anonymous sign-in if needed
if (app && auth) {
  onAuthStateChanged(auth, (u) => {
    if (u) {
      console.log("[AUTH OK]", u.uid, u.isAnonymous ? "(anonymous)" : "(authenticated)");
    } else if (!isDevelopment) {
      console.log("[AUTH] No Firebase user - attempting anonymous sign-in...");
      signInAnonymously(auth!)
        .then((result) => {
          console.log("[AUTH] Auto anonymous sign-in successful:", result.user.uid);
        })
        .catch((error) => {
          console.error("[AUTH] Auto anonymous sign-in failed:", error);
        });
    } else {
      console.log("[AUTH] Development mode - skipping anonymous sign-in");
    }
  });
}

// --- Firestore ---
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

try {
  if (app) {
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("[FIREBASE] Firestore and Storage initialized");
  }
} catch (error) {
  console.error("[FIREBASE] Failed to initialize Firestore/Storage:", error);
  if (!isDevelopment) {
    throw error;
  }
}

// Export a tiny API
export default { app, auth, db, storage };

// Named exports for compatibility
export { app, auth, db, storage };

// Test function to verify Firebase is working
export async function testFirebaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[FIREBASE TEST] Testing connection...");
    
    if (!app) {
      return { success: false, error: "Firebase app not initialized" };
    }
    
    console.log("[FIREBASE TEST] Project ID:", app.options.projectId);
    console.log("[FIREBASE TEST] Auth domain:", app.options.authDomain);
    
    // Test if we can initialize auth without signing in
    const authReady = auth !== null;
    console.log("[FIREBASE TEST] Auth initialized:", authReady);
    
    return { success: true };
  } catch (error: any) {
    console.error("[FIREBASE TEST] Failed:", error);
    return { 
      success: false, 
      error: error?.message || 'Unknown error' 
    };
  }
}

// Helper functions
export function getFirebase() {
  return { app, auth, db, storage };
}

export async function ensureFirebaseAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isDevelopment) {
      console.log("[AUTH] Development mode - skipping authentication");
      resolve(true);
      return;
    }

    if (!auth) {
      console.error("[AUTH] Auth not initialized");
      resolve(false);
      return;
    }

    if (auth.currentUser) {
      console.log("[AUTH] Already authenticated:", auth.currentUser.uid);
      resolve(true);
      return;
    }
    
    console.log("[AUTH] No current user, attempting anonymous sign-in...");
    signInAnonymously(auth)
      .then((result) => {
        console.log("[AUTH] Anonymous sign-in successful:", result.user.uid);
        resolve(true);
      })
      .catch((error) => {
        console.error("[AUTH] Anonymous sign-in failed:", error);
        console.warn("[AUTH] Proceeding without authentication for development");
        resolve(true);
      });
  });
}
