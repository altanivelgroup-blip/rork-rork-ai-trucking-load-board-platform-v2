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

export function getFirebase(): FirebaseServices {
  if (services) return services;
  try {
    console.log('[firebase] initializing...');
    const app = getApps().length ? getApp() : initializeApp(config);
    console.log('[firebase] app initialized');

    let auth: Auth;
    if (Platform.OS === 'web') {
      console.log('[firebase] initializing web auth');
      auth = getAuth(app);
      setPersistence(auth, browserLocalPersistence).catch((e) => {
        console.warn('[firebase] web persistence setup failed', e);
      });
    } else {
      console.log('[firebase] initializing native auth');
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getReactNativePersistence } = require('firebase/auth');
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
        console.log('[firebase] native auth with persistence initialized');
      } catch (e) {
        console.warn('[firebase] RN persistence unavailable, falling back to default', e);
        auth = getAuth(app);
      }
    }

    console.log('[firebase] initializing firestore and storage');
    const db = getFirestore(app);
    const storage = getStorage(app);
    services = { app, auth, db, storage };
    console.log('[firebase] all services initialized successfully');
    return services;
  } catch (err) {
    console.error('[firebase] init error', err);
    throw new Error(`Firebase initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
