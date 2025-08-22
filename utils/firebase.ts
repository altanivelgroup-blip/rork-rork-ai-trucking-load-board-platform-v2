import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, setPersistence, Auth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

const config = {
  apiKey: 'AIzaSyCr1HwvmwLzHax9Z7LNbKEA371I_isnExo',
  authDomain: 'ai-trucking-load-board-v2.firebaseapp.com',
  projectId: 'ai-trucking-load-board-v2',
  storageBucket: 'ai-trucking-load-board-v2.firebasestorage.app',
  messagingSenderId: '983252646715',
  appId: '1:983252646715:web:12ed084739966c5572951e',
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
