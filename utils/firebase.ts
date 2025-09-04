import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  doc, setDoc, serverTimestamp, Timestamp,
  collection, onSnapshot,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app",
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe"
};


let services: FirebaseServices | undefined;
let initPromise: Promise<FirebaseServices> | undefined;

export function getFirebase(): FirebaseServices {
  if (services) return services;
  
  // Synchronous fallback for immediate calls
  try {
    console.log('[firebase] synchronous initialization...');
    const app = getApps().length ? getApp() : initializeApp(config);
    
    let auth: Auth;
    try {
      if (Platform.OS === 'web') {
        auth = getAuth(app);
      } else {
        // Try to get existing auth first
        try {
          auth = getAuth(app);
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getReactNativePersistence } = require('firebase/auth');
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
        }
      }
    } catch (authError) {
      console.warn('[firebase] auth init failed, using default', authError);
      auth = getAuth(app);
    }

    const db = getFirestore(app);
    const storage = getStorage(app);
    services = { app, auth, db, storage };
    
    // Set up persistence asynchronously
    if (Platform.OS === 'web') {
      setPersistence(auth, browserLocalPersistence).catch((e) => {
        console.warn('[firebase] web persistence setup failed', e);
      });
    }
    
    console.log('[firebase] services initialized successfully');
    return services;
  } catch (err) {
    console.error('[firebase] init error', err);
    throw new Error(`Firebase initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Helper function to ensure user is authenticated
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    const { auth } = getFirebase();
    
    if (!auth.currentUser) {
      console.log('[firebase] no current user, attempting anonymous sign-in...');
      try {
        await signInAnonymously(auth);
        console.log('[firebase] anonymous sign-in successful');
        return true;
      } catch (authError: any) {
        console.warn('[firebase] anonymous sign-in failed:', authError?.code || authError?.message);
        // If anonymous auth fails, we'll continue without Firebase auth
        // This allows the app to work in development/demo mode
        if (authError?.code === 'auth/admin-restricted-operation') {
          console.warn('[firebase] anonymous auth disabled by admin, continuing without Firebase');
        } else {
          console.warn('[firebase] auth error, continuing without Firebase:', authError?.message);
        }
        return false; // Firebase is not available, but app can continue
      }
    } else {
      console.log('[firebase] user already authenticated:', auth.currentUser.uid);
      return true;
    }
  } catch (error) {
    console.warn('[firebase] authentication setup error, continuing without Firebase:', error);
    return false; // Firebase is not available, but app can continue
  }
}

export async function initializeFirebaseAsync(): Promise<FirebaseServices> {
  if (services) return services;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[firebase] async initialization...');
      const app = getApps().length ? getApp() : initializeApp(config);
      
      let auth: Auth;
      if (Platform.OS === 'web') {
        auth = getAuth(app);
        try {
          await setPersistence(auth, browserLocalPersistence);
        } catch (e) {
          console.warn('[firebase] web persistence setup failed', e);
        }
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getReactNativePersistence } = require('firebase/auth');
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
        } catch (e) {
          console.warn('[firebase] RN persistence unavailable, falling back to default', e);
          auth = getAuth(app);
        }
      }

      const db = getFirestore(app);
      const storage = getStorage(app);
      services = { app, auth, db, storage };
      console.log('[firebase] async services initialized successfully');
      return services;
    } catch (err) {
      console.error('[firebase] async init error', err);
      initPromise = undefined;
      throw new Error(`Firebase async initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  })();
  
  return initPromise;
}
