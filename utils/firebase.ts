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
    const app = getApps().length ? getApp() : initializeApp(config);

    let auth: Auth;
    if (Platform.OS === 'web') {
      auth = getAuth(app);
      void setPersistence(auth, browserLocalPersistence);
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
    console.log('[firebase] initialized');
    return services;
  } catch (err) {
    console.error('[firebase] init error', err);
    throw err as Error;
  }
}
