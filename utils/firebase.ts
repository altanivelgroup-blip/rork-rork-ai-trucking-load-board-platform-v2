// utils/firebase.ts — drop-in, stable, copy–paste
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/** Read env (you already set these in Rork/Expo) */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  // IMPORTANT: Firebase Storage buckets end with .appspot.com
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "rork-prod.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

/** Initialize once (safe on web/native) */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** SDK handles */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

/** Convenience getter used by your PhotoUploader */
export function getFirebase() {
  return { app, auth, db, storage };
}

/**
 * Ensure there’s a signed-in user so Storage rules get a UID.
 * - If you already use real auth, this resolves immediately.
 * - If no user, it signs in anonymously (enable Anonymous in Console).
 */
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    // Already signed in?
    if (auth.currentUser) return true;

    // Give auth state a moment to hydrate (if persisted)
    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub();
        resolve();
      });
    });
    if (auth.currentUser) return true;

    // Still no user — sign in anonymously (easy + safe)
    try {
      await signInAnonymously(auth);
      return true;
    } catch (e) {
      console.warn("[ensureFirebaseAuth] signInAnonymously failed:", e);
      return false;
    }
  } catch (err) {
    console.error("[ensureFirebaseAuth] error:", err);
    return false;
  }
}

export default { app, auth, db, storage, getFirebase, ensureFirebaseAuth };




