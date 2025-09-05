// utils/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  db: Firestore;
  storage: FirebaseStorage;
};

// --- Your rork-prod config ---
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app",
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

// --- Auth: ensure anonymous sign-in happens once ---
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {}); // web; no-op on native
onAuthStateChanged(auth, (u) => {
  if (!u) signInAnonymously(auth).catch((e) => console.error("[AUTH]", e));
});

// --- Firestore ---
const db = getFirestore(app);

// --- Storage: PIN TO THE CORRECT BUCKET ---
const storage = getStorage(app, "gs://rork-prod.firebasestorage.app");

export const firebase = { app, auth, db, storage } satisfies FirebaseServices;
export default firebase;

// Helper functions for compatibility
export function getFirebase(): FirebaseServices {
  return firebase;
}

export async function ensureFirebaseAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(true);
      } else {
        // Try to sign in anonymously
        signInAnonymously(auth)
          .then(() => resolve(true))
          .catch((error) => {
            console.error('[AUTH] Anonymous sign-in failed:', error);
            resolve(false);
          });
      }
    });
  });
}
