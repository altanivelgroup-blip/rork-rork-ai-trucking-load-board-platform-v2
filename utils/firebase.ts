// utils/firebase.ts
// Real Firebase implementation

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app",
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app, "gs://rork-prod.firebasestorage.app");

console.log("[FIREBASE] Using real Firebase implementation");
console.log("[FIREBASE CFG]", {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
});

// Initialize auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("[AUTH OK]", user.uid);
  } else {
    console.log("[AUTH] No user signed in");
  }
});

// Auto sign-in anonymously
let authInitialized = false;
const initAuth = async () => {
  if (authInitialized) return;
  authInitialized = true;
  
  try {
    if (!auth.currentUser) {
      console.log("[AUTH] Starting anonymous sign-in...");
      const result = await signInAnonymously(auth);
      console.log("[AUTH] Anonymous sign-in successful:", result.user.uid);
    }
  } catch (error: any) {
    console.error("[AUTH] Auto anonymous sign-in failed:", error);
  }
};

// Initialize auth immediately
initAuth();

// ✅ Top-level exports
export { app, auth, db, storage };
export default { app, auth, db, storage };

// Compatibility helper
export function getFirebase() {
  return { app, auth, db, storage };
}

// Ensure we have an authenticated user
export async function ensureFirebaseAuth(): Promise<boolean> {
  if (auth.currentUser) {
    return true;
  }
  
  try {
    console.log("[AUTH] Ensuring authentication...");
    const result = await signInAnonymously(auth);
    console.log("[AUTH] Anonymous sign-in successful:", result.user.uid);
    return true;
  } catch (error: any) {
    console.error("[AUTH ERROR]", error.code, error.message);
    return false;
  }
}
