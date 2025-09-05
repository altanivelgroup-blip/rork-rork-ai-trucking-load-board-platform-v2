// utils/firebase.ts
// Minimal, stable Firebase init for Web + React-Native (Expo/RN).

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  getReactNativePersistence,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// ---- YOUR PROD CONFIG (copy from Firebase Console → SDK snippet) ----
const firebaseConfig = {
  apiKey: "AIzaSyCY-gaud4JqR4GZCMYkkIAys9F09tVgzIEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.appspot.com", // config bucket (leave as appspot.com)
  messagingSenderId: "935855951227",
  appId: "1:935855951227:web:20c4c517dd32f0e59a4cfe",
};
// --------------------------------------------------------------------

// 1) App
const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// Optional: see what config the app is actually using
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

// Ensure we always have a signed-in user (your Storage rules require it)
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

// 4) Storage — pin explicitly to your real bucket
const storage: FirebaseStorage = getStorage(
  app,
  "gs://rork-prod.firebasestorage.app"
);

// ✅ Top-level exports (do NOT nest inside blocks)
export default { app, auth, db, storage };

// Compatibility helper (some files import this)
export function getFirebase() {
  return { app, auth, db, storage };
}
