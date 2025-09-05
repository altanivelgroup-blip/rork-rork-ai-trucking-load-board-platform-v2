// utils/firebase.ts
// Minimal, stable Firebase init for Web + React-Native (Expo/RN).

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { initializeApp, getApps, FirebaseApp, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  getReactNativePersistence,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ---- YOUR PROD CONFIG (from Firebase Console → Project settings → SDK snippet) ----
const firebaseConfig = {
  apiKey: "AIzaSyCY-gaud4JqR4GZCMYkkIAys9F09tVgzIEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.appspot.com",      // keep appspot.com here
  messagingSenderId: "935855951227",
  appId: "1:935855951227:web:20c4c517dd32f0e59a4cfe",
};
// -----------------------------------------------------------------------------

// 1) App
const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// Log what config the app is actually using (helps catch typos/dupes)
const cfg: any = getApp().options;
console.log("[FIREBASE CFG]", {
  apiKey: (cfg.apiKey || "").slice(0, 10) + "...",
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
});

// 2) Auth (platform-safe)
let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Make sure we always have a signed-in user (required by your Storage rules)
onAuthStateChanged(auth, (u) => {
  if (u) {
    console.log("[AUTH OK]", u.uid);
  } else {
    signInAnonymously(auth).catch((e: any) =>
      console.error("[AUTH ERROR]", e?.code, e?.message)
    );
  }
});

// 3) Firestore
const db: Firestore = getFirestore(app);

// 4) Storage (pin to the real bucket)
const storage: FirebaseStorage = getStorage(app, "gs://rork-prod.firebasestorage.app");

// Export
export default { app, auth, db, storage };
