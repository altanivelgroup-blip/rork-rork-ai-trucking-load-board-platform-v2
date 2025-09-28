// utils/firebase.ts — tolerant to your env names
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/** Map both canonical env names and your custom ones */
const ENV = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    process.env.EXPO_PUBLIC_RORK_AF, // your screenshot
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    process.env.EXPO_PUBLIC_FEATURE_LIVE_LOGISTICS || // your note
    process.env.EXPO_PUBLIC_FEATURE,
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_FIREBASE, // saw this used as "rork-prod"
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// Derive domain/bucket if missing but projectId is present
const derivedAuthDomain =
  ENV.authDomain || (ENV.projectId ? `${ENV.projectId}.firebaseapp.com` : undefined);

const derivedStorageBucket =
  ENV.storageBucket || (ENV.projectId ? `${ENV.projectId}.appspot.com` : undefined); // must be .appspot.com

const firebaseConfig = {
  apiKey: ENV.apiKey!,
  authDomain: derivedAuthDomain!,
  projectId: ENV.projectId!,
  storageBucket: derivedStorageBucket!,
  messagingSenderId: ENV.messagingSenderId!,
  appId: ENV.appId!,
};

// Helpful log once (not secrets)
console.log("[Firebase] project:", firebaseConfig.projectId);
console.log("[Firebase] authDomain:", firebaseConfig.authDomain);
console.log("[Firebase] storageBucket:", firebaseConfig.storageBucket);

// Initialize once safely
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Handles
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

// Getter used by PhotoUploader
export function getFirebase() {
  return { app, auth, db, storage };
}

// Ensure a user exists (uses Anonymous if no one signed in)
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    if (auth.currentUser) return true;

    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub();
        resolve();
      });
    });
    if (auth.currentUser) return true;

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




