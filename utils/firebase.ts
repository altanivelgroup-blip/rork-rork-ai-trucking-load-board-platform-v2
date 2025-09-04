// utils/firebase.ts  (REPLACE ENTIRE FILE WITH THIS)
import { Platform } from "react-native";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  setPersistence,
  Auth,
  browserLocalPersistence,
  signInAnonymously,
} from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

// ✅ Use your rork-prod config (note the .appspot.com bucket)
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.appspot.com", // <-- FIXED
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe",
};

let services: FirebaseServices | undefined;
let initPromise: Promise<FirebaseServices> | undefined;

export function getFirebase(): FirebaseServices {
  if (services) return services;

  console.log("[firebase] synchronous initialization...");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  let auth: Auth;
  if (Platform.OS === "web") {
    // Web: default auth + persist to local storage
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch((e) => {
      console.warn("[firebase] web persistence setup failed", e);
    });
  } else {
    // React Native: use RN persistence
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      console.warn("[firebase] RN initializeAuth failed, falling back to getAuth()", e);
      auth = getAuth(app);
    }
  }

  const db = getFirestore(app);
  const storage = getStorage(app);
  services = { app, auth, db, storage };

  console.log("[firebase] services initialized successfully");
  console.log("[firebase] projectId:", app.options.projectId);
  console.log("[firebase] storageBucket:", (app.options as any).storageBucket);
  return services;
}

// Ensure we have a user (anonymous OK)
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    const { auth } = getFirebase();

    if (!auth.currentUser) {
      console.log("[firebase] no current user, attempting anonymous sign-in...");
      try {
        await signInAnonymously(auth);
        console.log("[firebase] anonymous sign-in successful");
        return true;
      } catch (authError: any) {
        console.warn(
          "[firebase] anonymous sign-in failed:",
          authError?.code || authError?.message
        );
        // If disabled by admin, keep going without auth (dev fallback)
        return false;
      }
    } else {
      console.log("[firebase] user already authenticated:", auth.currentUser.uid);
      return true;
    }
  } catch (error) {
    console.warn("[firebase] authentication setup error:", error);
    return false;
  }
}

// Optional async initializer (if you prefer)
export async function initializeFirebaseAsync(): Promise<FirebaseServices> {
  if (services) return services;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("[firebase] async initialization...");
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    let auth: Auth;
    if (Platform.OS === "web") {
      auth = getAuth(app);
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        console.warn("[firebase] web persistence setup failed", e);
      }
    } else {
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch (e) {
        console.warn("[firebase] RN initializeAuth failed, fallback getAuth()", e);
        auth = getAuth(app);
      }
    }

    const db = getFirestore(app);
    const storage = getStorage(app);
    services = { app, auth, db, storage };
    console.log("[firebase] async services initialized successfully");
    console.log("[firebase] projectId:", app.options.projectId);
    console.log("[firebase] storageBucket:", (app.options as any).storageBucket);
    return services;
  })();

  return initPromise;
}
