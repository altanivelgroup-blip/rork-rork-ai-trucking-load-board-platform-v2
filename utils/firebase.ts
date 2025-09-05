// utils/firebase.ts
// Mock Firebase implementation for development

// Mock Firebase types and implementations
type MockUser = {
  uid: string;
  isAnonymous: boolean;
};

type MockAuth = {
  currentUser: MockUser | null;
  onAuthStateChanged: (callback: (user: MockUser | null) => void) => () => void;
  signInAnonymously: () => Promise<{ user: MockUser }>;
};

type MockFirestore = {
  collection: (path: string) => any;
  doc: (path: string) => any;
};

type MockStorage = {
  ref: (path: string) => any;
};

type MockApp = {
  options: {
    projectId: string;
    authDomain: string;
    apiKey: string;
    storageBucket: string;
  };
};

// Create mock user
const mockUser: MockUser = {
  uid: "mock-user-" + Math.random().toString(36).substr(2, 9),
  isAnonymous: true,
};

// Mock Auth implementation
const auth: MockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: (callback) => {
    // Immediately call with mock user
    setTimeout(() => callback(mockUser), 100);
    return () => {}; // unsubscribe function
  },
  signInAnonymously: async () => {
    console.log("[AUTH] Mock anonymous sign-in successful:", mockUser.uid);
    return { user: mockUser };
  },
};

// Mock Firestore implementation
const db: MockFirestore = {
  collection: (path: string) => ({
    doc: (id: string) => ({
      set: async (data: any) => {
        console.log(`[FIRESTORE] Mock write to ${path}/${id}:`, data);
        return Promise.resolve();
      },
      get: async () => ({
        exists: () => false,
        data: () => null,
      }),
    }),
    where: () => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            docs: [],
            empty: true,
          }),
        }),
      }),
    }),
  }),
  doc: (path: string) => ({
    set: async (data: any) => {
      console.log(`[FIRESTORE] Mock write to ${path}:`, data);
      return Promise.resolve();
    },
  }),
};

// Mock Storage implementation
const storage: MockStorage = {
  ref: (path: string) => ({
    put: async (blob: Blob) => {
      console.log(`[STORAGE] Mock upload to ${path}, size: ${blob.size} bytes`);
      return {
        ref: {
          getDownloadURL: async () => {
            // Return a mock URL
            return `https://mock-storage.com/${path}?t=${Date.now()}`;
          },
        },
      };
    },
    putString: async (data: string) => {
      console.log(`[STORAGE] Mock upload string to ${path}`);
      return {
        ref: {
          getDownloadURL: async () => {
            return `https://mock-storage.com/${path}?t=${Date.now()}`;
          },
        },
      };
    },
  }),
};

// Mock App
const app: MockApp = {
  options: {
    projectId: "mock-project",
    authDomain: "mock-project.firebaseapp.com",
    apiKey: "mock-api-key",
    storageBucket: "mock-project.appspot.com",
  },
};

console.log("[FIREBASE] Using mock Firebase implementation for development");
console.log("[FIREBASE CFG]", {
  apiKey: "mock-api-k...",
  authDomain: app.options.authDomain,
  projectId: app.options.projectId,
  storageBucket: app.options.storageBucket,
});

// Initialize auth state
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("[AUTH OK]", user.uid);
  }
});

// ✅ Top-level exports
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
    await auth.signInAnonymously();
    return true;
  } catch (error) {
    console.error("[AUTH] Mock sign-in failed:", error);
    return false;
  }
}
