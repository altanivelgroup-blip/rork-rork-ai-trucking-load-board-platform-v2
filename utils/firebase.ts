// utils/firebase.ts
// Minimal, stable Firebase init for Web + React-Native (Expo/RN).

import { Platform } from "react-native";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ---- DEVELOPMENT CONFIG (replace with your actual Firebase config) ----
// To get your config: Firebase Console → Project settings → SDK snippet
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app",
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe"
};

// Development mode detection
const hasValidConfig = firebaseConfig.apiKey !== 'demo-api-key';

// Skip Firebase initialization in development or with invalid config
if (!hasValidConfig) {
  console.warn('[FIREBASE] Using demo configuration. Firebase features disabled.');
  console.warn('[FIREBASE] To enable Firebase, update the config in utils/firebase.ts');
}
// -----------------------------------------------------------------------------

// 1) App - only initialize if we have valid config
let app: FirebaseApp | null = null;
if (hasValidConfig) {
  app = getApps()[0] ?? initializeApp(firebaseConfig);
}

// Log what config the app is actually using (helps catch typos/dupes)
if (app) {
  const cfg: any = app.options;
  console.log("[FIREBASE CFG]", {
    apiKey: (cfg.apiKey || "").slice(0, 10) + "...",
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
  });
} else {
  console.log("[FIREBASE CFG] Demo mode - Firebase disabled");
}

// 2) Auth (platform-safe) - only if we have valid config
let auth: Auth | null = null;
if (app) {
  if (Platform.OS === "web") {
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } else {
    try {
      // For React Native, we'll use the default persistence
      auth = initializeAuth(app);
    } catch {
      // If initializeAuth fails (already initialized), use getAuth
      auth = getAuth(app);
    }
  }
}

// Make sure we always have a signed-in user (required by your Storage rules)
let authPromise: Promise<void> | null = null;

function ensureAuth(): Promise<void> {
  if (!auth) {
    console.log("[AUTH] Demo mode - skipping authentication");
    return Promise.resolve();
  }
  
  if (authPromise) return authPromise;
  
  authPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        console.log("[AUTH OK]", user.uid);
        unsubscribe();
        resolve();
      } else {
        console.log("[AUTH] No user, signing in anonymously...");
        signInAnonymously(auth!)
          .then(() => {
            console.log("[AUTH] Anonymous sign-in successful");
            unsubscribe();
            resolve();
          })
          .catch((error) => {
            console.error("[AUTH ERROR]", error?.code, error?.message);
            unsubscribe();
            reject(error);
          });
      }
    });
  });
  
  return authPromise;
}

// Auto-start auth only if we have valid config
if (auth) {
  ensureAuth().catch((e) => console.error("[AUTH] Auto anonymous sign-in failed:", e));
}

// 3) Firestore - only if we have valid config
let db: Firestore | null = null;
if (app) {
  db = getFirestore(app);
}

// 4) Storage - only if we have valid config
let storage: FirebaseStorage | null = null;
if (app) {
  storage = getStorage(app, "gs://yourproject.appspot.com");

// Export functions for compatibility
export function getFirebase() {
  return { app, auth, db, storage };
}

export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    if (!auth) {
      console.log("[AUTH] Demo mode - returning true for development");
      return true;
    }
    await ensureAuth();
    return !!auth.currentUser;
  } catch (error) {
    console.error("[AUTH] Failed to ensure auth:", error);
    return false;
  }
}

// Export default for backward compatibility
export default { app, auth, db, storage };

// Named exports
export { app, auth, db, storage };
