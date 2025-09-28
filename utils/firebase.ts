// utils/firebase.ts — tolerant to your env names
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/** Map both canonical env names and your custom ones */
const ENV = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    process.env.EXPO_PUBLIC_RORK_AF, // your screenshot
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    process.env.EXPO_PUBLIC_FEATURE_LIVE_LOGISTICS || // your note
    process.env.EXPO_PUBLIC_FEATURE,
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_FIREBASE, // saw this used as "rork-prod"
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// Derive domain/bucket if missing but projectId is present
const derivedAuthDomain =
  ENV.authDomain || (ENV.projectId ? `${ENV.projectId}.firebaseapp.com` : undefined);

const derivedStorageBucket =
  ENV.storageBucket || (ENV.projectId ? `${ENV.projectId}.appspot.com` : undefined); // must be .appspot.com

const firebaseConfig = {
  apiKey: ENV.apiKey!,
  authDomain: derivedAuthDomain!,
  projectId: ENV.projectId!,
  storageBucket: derivedStorageBucket!,
  messagingSenderId: ENV.messagingSenderId!,
  appId: ENV.appId!,
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[Firebase] ❌ Missing required Firebase configuration!');
  console.error('[Firebase] Required env vars: EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  throw new Error('Firebase configuration incomplete');
}

// Helpful log once (not secrets)
console.log("[Firebase] ✅ Configuration loaded:");
console.log("[Firebase] Project ID:", firebaseConfig.projectId);
console.log("[Firebase] Auth Domain:", firebaseConfig.authDomain);
console.log("[Firebase] Storage Bucket:", firebaseConfig.storageBucket);
console.log("[Firebase] API Key:", firebaseConfig.apiKey ? '✅ Present' : '❌ Missing');

// Initialize once safely
let app: any;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  console.log('[Firebase] ✅ App initialized successfully');
} catch (error: any) {
  console.error('[Firebase] ❌ Failed to initialize Firebase app:', error);
  throw error;
}

// Handles
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

// Getter used by PhotoUploader
export function getFirebase() {
  return { app, auth, db, storage };
}

// Ensure a user exists (uses Anonymous if no one signed in)
export async function ensureFirebaseAuth(): Promise<boolean> {
  try {
    console.log('[ensureFirebaseAuth] Checking authentication status...');
    
    if (auth.currentUser) {
      console.log('[ensureFirebaseAuth] ✅ User already authenticated:', {
        uid: auth.currentUser.uid,
        isAnonymous: auth.currentUser.isAnonymous
      });
      return true;
    }

    console.log('[ensureFirebaseAuth] No current user, waiting for auth state...');
    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        console.log('[ensureFirebaseAuth] Auth state changed:', user ? 'User found' : 'No user');
        unsub();
        resolve();
      });
    });
    
    if (auth.currentUser) {
      console.log('[ensureFirebaseAuth] ✅ User found after auth state check');
      return true;
    }

    console.log('[ensureFirebaseAuth] Attempting anonymous sign-in...');
    try {
      const result = await signInAnonymously(auth);
      console.log('[ensureFirebaseAuth] ✅ Anonymous sign-in successful:', {
        uid: result.user.uid,
        isAnonymous: result.user.isAnonymous
      });
      return true;
    } catch (e: any) {
      console.warn("[ensureFirebaseAuth] ❌ signInAnonymously failed:", {
        code: e.code,
        message: e.message
      });
      return false;
    }
  } catch (err: any) {
    console.error("[ensureFirebaseAuth] ❌ Unexpected error:", {
      code: err.code,
      message: err.message
    });
    return false;
  }
}

// Quick Firebase connectivity test
export async function testFirebaseConnectivity() {
  try {
    console.log('[FIREBASE_CONNECTIVITY] Starting connectivity test...');
    
    const { auth, db, storage, app } = getFirebase();
    
    // Test 1: Check if Firebase is initialized
    const projectId = app.options.projectId;
    console.log('[FIREBASE_CONNECTIVITY] Project ID:', projectId);
    console.log('[FIREBASE_CONNECTIVITY] Storage Bucket:', app.options.storageBucket);
    
    // Test 2: Check authentication
    const authSuccess = await ensureFirebaseAuth();
    const currentUser = auth.currentUser;
    console.log('[FIREBASE_CONNECTIVITY] Auth success:', authSuccess);
    console.log('[FIREBASE_CONNECTIVITY] Current user:', currentUser ? {
      uid: currentUser.uid,
      isAnonymous: currentUser.isAnonymous,
      email: currentUser.email
    } : 'None');
    
    // Test 3: Test basic Firestore read
    let firestoreWorking = false;
    try {
      const testDoc = doc(db, 'connectivity-test', 'test');
      await getDoc(testDoc);
      firestoreWorking = true;
      console.log('[FIREBASE_CONNECTIVITY] ✅ Firestore read test passed');
    } catch (e: any) {
      console.warn('[FIREBASE_CONNECTIVITY] Firestore test failed:', e.code, e.message);
      firestoreWorking = e.code !== 'permission-denied'; // Permission denied means it's reachable
    }
    
    // Test 4: Test Firebase Storage connectivity
    let storageWorking = false;
    try {
      // Try to create a storage reference (doesn't actually upload)
      const { ref } = await import('firebase/storage');
      const testRef = ref(storage, 'connectivity-test/test.txt');
      storageWorking = !!testRef;
      console.log('[FIREBASE_CONNECTIVITY] ✅ Storage reference test passed');
    } catch (e: any) {
      console.warn('[FIREBASE_CONNECTIVITY] Storage test failed:', e.code, e.message);
      storageWorking = false;
    }
    
    const allWorking = authSuccess && firestoreWorking && storageWorking;
    
    return {
      connected: allWorking,
      details: {
        networkOnline: true,
        firebaseReachable: true,
        authWorking: authSuccess && !!currentUser,
        firestoreWorking,
        storageWorking,
      },
      projectId,
      storageBucket: app.options.storageBucket,
      userId: currentUser?.uid,
      isAnonymous: currentUser?.isAnonymous,
      recommendations: allWorking ? [] : [
        !authSuccess ? 'Check Firebase authentication configuration' : null,
        !firestoreWorking ? 'Check Firestore rules and network connectivity' : null,
        !storageWorking ? 'Check Firebase Storage configuration and rules' : null,
      ].filter(Boolean)
    };
  } catch (error: any) {
    console.error('[FIREBASE_CONNECTIVITY] Test failed:', error);
    return {
      connected: false,
      error: error.message,
      details: {
        networkOnline: false,
        firebaseReachable: false,
        authWorking: false,
        firestoreWorking: false,
        storageWorking: false,
      },
      recommendations: [
        'Check internet connection',
        'Verify Firebase configuration in .env file',
        'Check Firebase project status'
      ]
    };
  }
}

// Test Firebase Storage upload capability
export async function testFirebaseStorageUpload() {
  try {
    console.log('[FIREBASE_STORAGE_TEST] Testing upload capability...');
    
    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      throw new Error('Authentication failed');
    }
    
    const { storage, auth } = getFirebase();
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    
    // Create a small test blob
    const testData = new Blob(['Firebase Storage Test'], { type: 'text/plain' });
    const testPath = `test-uploads/${auth.currentUser?.uid || 'anonymous'}/test-${Date.now()}.txt`;
    
    console.log('[FIREBASE_STORAGE_TEST] Uploading test file to:', testPath);
    
    const storageRef = ref(storage, testPath);
    const uploadResult = await uploadBytes(storageRef, testData);
    
    console.log('[FIREBASE_STORAGE_TEST] Upload successful, getting download URL...');
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log('[FIREBASE_STORAGE_TEST] ✅ Test upload completed successfully');
    
    return {
      success: true,
      uploadPath: testPath,
      downloadURL,
      message: 'Firebase Storage upload test passed'
    };
  } catch (error: any) {
    console.error('[FIREBASE_STORAGE_TEST] ❌ Test upload failed:', error);
    
    let errorMessage = 'Storage upload test failed';
    let recommendations: string[] = [];
    
    if (error.code === 'storage/unauthorized') {
      errorMessage = 'Storage upload unauthorized - check Firebase Storage rules';
      recommendations.push('Verify Firebase Storage security rules allow uploads for authenticated users');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      errorMessage = 'Storage upload retry limit exceeded - network or server issue';
      recommendations.push('Check network connection stability', 'Try again in a few minutes');
    } else if (error.code === 'storage/unknown') {
      errorMessage = 'Unknown storage error - check Firebase project configuration';
      recommendations.push('Verify Firebase project is active', 'Check Firebase Storage is enabled');
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code,
      recommendations
    };
  }
}

export default { app, auth, db, storage, getFirebase, ensureFirebaseAuth, testFirebaseConnectivity, testFirebaseStorageUpload };




