// utils/firebase.ts — tolerant to your env names
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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

// Quick Firebase connectivity test
export async function testFirebaseConnectivity() {
  try {
    console.log('[FIREBASE_CONNECTIVITY] Starting connectivity test...');
    
    const { auth, db, app } = getFirebase();
    
    // Test 1: Check if Firebase is initialized
    const projectId = app.options.projectId;
    console.log('[FIREBASE_CONNECTIVITY] Project ID:', projectId);
    
    // Test 2: Check authentication
    const authSuccess = await ensureFirebaseAuth();
    const currentUser = auth.currentUser;
    
    // Test 3: Test basic Firestore read
    let firestoreWorking = false;
    try {
      const testDoc = doc(db, 'connectivity-test', 'test');
      await getDoc(testDoc);
      firestoreWorking = true;
    } catch (e: any) {
      console.warn('[FIREBASE_CONNECTIVITY] Firestore test failed:', e.code);
      firestoreWorking = e.code !== 'permission-denied'; // Permission denied means it's reachable
    }
    
    return {
      connected: authSuccess && firestoreWorking,
      details: {
        networkOnline: true,
        firebaseReachable: true,
        authWorking: authSuccess && !!currentUser,
        firestoreWorking,
      },
      projectId,
      userId: currentUser?.uid,
      isAnonymous: currentUser?.isAnonymous
    };
  } catch (error: any) {
    console.error('[FIREBASE_CONNECTIVITY] Test failed:', error);
    return {
      connected: false,
      error: error.message,
      details: {
        networkOnline: false,
        firebaseReachable: false,
        authWorking: false,
        firestoreWorking: false,
      }
    };
  }
}

export default { app, auth, db, storage, getFirebase, ensureFirebaseAuth, testFirebaseConnectivity };




