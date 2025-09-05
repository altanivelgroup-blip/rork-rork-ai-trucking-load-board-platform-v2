// utils/firebase.ts
import { Platform } from "react-native";

// Lazy imports to avoid initialization issues
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;
let firebaseStorage: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyCY-gau4JqR4GZCMYkklAys9F09tVgZiEQ",
  authDomain: "rork-prod.firebaseapp.com",
  projectId: "rork-prod",
  storageBucket: "rork-prod.firebasestorage.app",
  messagingSenderId: "935855915227",
  appId: "1:935855915227:web:20c4c517dd32f0e59a4cfe"
};

export type FirebaseServices = {
  app: any;
  auth: any;
  db: any;
  storage: any;
};

let initialized = false;
let authInitialized = false;

async function initializeFirebase() {
  if (initialized) return;
  
  try {
    console.log("[Firebase] Starting initialization...");
    
    // Dynamic imports to avoid class definition issues
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } = await import("firebase/auth");
    const { getFirestore } = await import("firebase/firestore");
    const { getStorage } = await import("firebase/storage");
    
    // Initialize app
    if (!getApps().length) {
      console.log("[Firebase] Creating new app instance");
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      console.log("[Firebase] Using existing app instance");
      firebaseApp = getApps()[0];
    }
    
    // Initialize services
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    firebaseStorage = getStorage(firebaseApp, "gs://rork-prod.firebasestorage.app");
    
    // Set up auth persistence (web only)
    if (Platform.OS === 'web') {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        console.log("[Firebase] Auth persistence set");
      } catch (error) {
        console.warn("[Firebase] Could not set auth persistence:", error);
      }
    }
    
    // Set up auth state listener
    if (!authInitialized) {
      authInitialized = true;
      onAuthStateChanged(firebaseAuth, (user) => {
        if (!user) {
          console.log("[Firebase] No user, signing in anonymously");
          signInAnonymously(firebaseAuth).catch((error) => {
            console.error("[Firebase] Anonymous sign-in failed:", error);
          });
        } else {
          console.log("[Firebase] User authenticated:", user.uid);
        }
      });
    }
    
    initialized = true;
    console.log("[Firebase] Initialization complete");
    
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error);
    throw error;
  }
}

// Initialize Firebase immediately
initializeFirebase().catch(console.error);

export function getFirebase(): FirebaseServices {
  if (!initialized || !firebaseApp || !firebaseAuth || !firebaseDb || !firebaseStorage) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  
  return {
    app: firebaseApp,
    auth: firebaseAuth,
    db: firebaseDb,
    storage: firebaseStorage
  };
}

export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    // Ensure Firebase is initialized first
    await initializeFirebase();
    
    const { auth } = getFirebase();
    
    return new Promise((resolve) => {
      // Check if already authenticated
      if (auth.currentUser) {
        resolve(true);
        return;
      }

      // Import auth functions dynamically
      import("firebase/auth").then(({ onAuthStateChanged, signInAnonymously }) => {
        // Wait for auth state change
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          if (user) {
            resolve(true);
          } else {
            // Try to sign in anonymously
            signInAnonymously(auth)
              .then(() => resolve(true))
              .catch((error) => {
                console.error('[Firebase] Anonymous sign-in failed:', error);
                resolve(false);
              });
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 10000);
      }).catch((error) => {
        console.error('[Firebase] Failed to import auth:', error);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('[Firebase] ensureFirebaseAuth failed:', error);
    return false;
  }
}

// Export individual services for backward compatibility
export const firebase = {
  get app() { return getFirebase().app; },
  get auth() { return getFirebase().auth; },
  get db() { return getFirebase().db; },
  get storage() { return getFirebase().storage; }
};

export default firebase;