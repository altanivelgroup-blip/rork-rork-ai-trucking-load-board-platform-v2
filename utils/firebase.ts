// utils/firebase.ts — minimal & stable

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Validate Firebase environment variables
const requiredEnvVars = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value.includes('your_'))
  .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.toUpperCase()}`);

if (missingVars.length > 0) {
  console.error('❌ Missing or invalid Firebase environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Please update your .env file with your actual Firebase project credentials.');
  console.error('   You can find these in your Firebase Console > Project Settings > General tab.');
  throw new Error(`Missing Firebase configuration: ${missingVars.join(', ')}`);
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
};

console.log('✅ Firebase configuration loaded successfully');
console.log('   Project ID:', firebaseConfig.projectId);
console.log('   Auth Domain:', firebaseConfig.authDomain);

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };
export default { app, auth, db, storage };



