// utils/firebase.ts
import { Platform } from "react-native";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
  signInAnonymously,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

// --- your rork-prod config (keep as you set it, incl. .appspot.com) ---
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.appspot.com", // <-- appspot.com
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe",
};

let services: FirebaseServices | undefined;

// Try to load RN persistence only on native, and only if the subpath exists
let getReactNativePersistence: undefined | ((s: any) => any);
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    getReactNativePersistence =
      require("firebase/auth/react-native").getReactNativePersistence;
  } catch {
    // Not available in this firebase version – we'll fall back gracefully
    getReactNativePersistence = undefined;
  }
}

export function getFirebase(): FirebaseServices {
  if (services) return services;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  let auth: Auth;
  if (Platform.OS === "web") {
    auth = getAuth(app);
    // Best effort: browser persistence
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } else {
    try {
      if (getReactNativePersistence) {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } else {
        // Fallback if the RN sub-path is not present
        auth = getAuth(app);
      }
    } catch {
      auth = getAuth(app);
    }
  }

  const db = getFirestore(app);
  const storage = getStorage(app);
  services = { app, auth, db, storage };
  return services;
}

export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    const { auth } = getFirebase();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return true;
  } catch (e: any) {
    // ok to continue in demo mode
    return false;
  }
}
