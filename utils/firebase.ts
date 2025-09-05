// utils/firebase.ts
// One file to initialize Firebase correctly on both Web and React-Native.

import { Platform } from "react-native"; // safe on web builds too (RN shim)
import AsyncStorage from "@react-native-async-storage/async-storage";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";

import {
  // RN + Web safe auth imports
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

// ---- Your rork-prod config (copy from Firebase console) ----
const firebaseConfig = {
  apiKey: "AIzaSyCY-gaud4JqR4GZCMYkkIAys9F09tVgzIEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app", // note: firebasestorage.app
  messagingSenderId: "935855951227",
  appId: "1:935855951227:web:20c4c517dd32f0e59a4cfe",
};
// ------------------------------------------------------------

let app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// --- Auth (platform-safe) ---
let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
  // Only the web SDK supports browserLocalPersistence
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} else {
  // React-Native must use initializeAuth + AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Ensure we always have a signed-in user for Storage rules
onAuthStateChanged(auth, (u) => {
  if (u) {
    console.log("[AUTH OK]", u.uid);
  } else {
    signInAnonymously(auth).catch((e) =>
      console.error("[AUTH ERROR]", e.code || e.message)
    );
  }
});

// --- Firestore ---
const db: Firestore = getFirestore(app);

// --- Storage: pin to the correct bucket explicitly ---
const storage: FirebaseStorage = getStorage(app, "gs://rork-prod.firebasestorage.app");

// Export a tiny API
export default { app, auth, db, storage };
