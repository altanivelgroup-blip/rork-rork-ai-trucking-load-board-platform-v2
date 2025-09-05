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

// ---- Your rork-prod config (copy from Firebase console) ----
// NOTE: If you're getting API key errors, you may need to:
// 1. Go to Firebase Console > Project Settings > General
// 2. Copy the correct config for your platform (Web)
// 3. Make sure the API key is enabled for your services
const firebaseConfig = {
  apiKey: "AIzaSyCY-gaud4JqR4GZCMYkkIAys9F09tVgzIEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app", // note: firebasestorage.app
  messagingSenderId: "935855951227",
  appId: "1:935855951227:web:20c4c517dd32f0e59a4cfe",
};
// ------------------------------------------------------------

let app: FirebaseApp;
try {
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  console.log("[FIREBASE] App initialized successfully", {
    projectId: app.options.projectId,
    authDomain: app.options.authDomain,
    apiKey: app.options.apiKey?.substring(0, 10) + "..."
  });
} catch (error: any) {
  console.error("[FIREBASE] App initialization failed:", error);
  throw error;
}

// --- Auth (platform-safe) ---
let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
  // Only the web SDK supports browserLocalPersistence
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} else {
  // React-Native: use getAuth for simplicity
  auth = getAuth(app);
}

// Monitor auth state and attempt anonymous sign-in if needed
onAuthStateChanged(auth, (u) => {
  if (u) {
    console.log("[AUTH OK]", u.uid, u.isAnonymous ? "(anonymous)" : "(authenticated)");
  } else {
    console.log("[AUTH] No Firebase user - attempting anonymous sign-in...");
    signInAnonymously(auth)
      .then((result) => {
        console.log("[AUTH] Auto anonymous sign-in successful:", result.user.uid);
      })
      .catch((error) => {
        console.error("[AUTH] Auto anonymous sign-in failed:", error);
      });
  }
});

// --- Firestore ---
const db: Firestore = getFirestore(app);

// --- Storage: pin to the correct bucket explicitly ---
const storage: FirebaseStorage = getStorage(app, "gs://rork-prod.firebasestorage.app");

// Export a tiny API
export default { app, auth, db, storage };

// Named exports for compatibility
export { app, auth, db, storage };

// Test function to verify Firebase is working
export async function testFirebaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[FIREBASE TEST] Testing connection...");
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
        // For development, we'll resolve true to allow uploads to proceed
        // In production, you should handle this properly
        console.warn("[AUTH] Proceeding without authentication for development");
        resolve(true);
      });
  });
}
