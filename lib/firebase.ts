import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocsFromServer,
} from "firebase/firestore";
import { getFirebase, ensureFirebaseAuth } from "@/utils/firebase";
import { LOADS_COLLECTION, LOAD_STATUS, LoadDoc } from "@/lib/loadSchema";

// ---- Quick connection test you can call from anywhere ----
export async function testFirebaseConnection() {
  try {
    console.log("[Firebase Test] Starting connection test...");

    const { auth, db, app } = getFirebase();
    console.log("[Firebase Test] Firebase services initialized");
    console.log("[Firebase Test] Project ID:", app.options.projectId);
    console.log("[Firebase Test] Auth domain:", app.options.authDomain);

    // Ensure we have a user (whatever ensureFirebaseAuth does in your project)
    const authAvailable = await ensureFirebaseAuth();
    console.log("[Firebase Test] Auth available:", authAvailable);
    console.log("[Firebase Test] Current user:", auth.currentUser?.uid || "none");

    if (!authAvailable || !auth.currentUser) {
      return { success: false, error: "No authenticated user" };
    }

    // Simple read from /loads
    const q = query(
      collection(db, LOADS_COLLECTION),
      where("status", "==", LOAD_STATUS.OPEN),
      where("createdBy", "==", auth.currentUser.uid),
      orderBy("clientCreatedAt", "desc"),
      limit(5)
    );

    const snap = await getDocsFromServer(q);
    console.log("[Firebase Test] Query OK, docs:", snap.docs.length);

    return {
      success: true,
      projectId: app.options.projectId,
      userId: auth.currentUser.uid,
      docsFound: snap.docs.length,
    };
  } catch (error: any) {
    console.error("[Firebase Test] failed:", error);
    return {
      success: false,
      error: error?.message || "Unknown error",
      code: error?.code || "unknown",
    };
  }
}

// ---- MAIN: post a load into /loads/{id} ----
export async function postLoad(args: {
  id: string;
  title: string;
  origin: string;
  destination: string;
  vehicleType: string;
  rate: number | string;
  pickupDate: Date;
  deliveryDate: Date;
  finalPhotos: { url: string; path?: string | null }[];
}) {
  try {
    console.log("[POST_LOAD] Starting postLoad with args:", {
      id: args.id,
      title: args.title,
      origin: args.origin,
      destination: args.destination,
      vehicleType: args.vehicleType,
      rate: args.rate,
      photosCount: args.finalPhotos?.length || 0
    });

    // Make sure auth is ready (your helper can sign in or refresh token)
    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      console.warn("[POST_LOAD] Firebase auth failed, throwing error to trigger fallback");
      throw new Error("Firebase authentication failed");
    }

    const { auth, db, app } = getFirebase();
    const uid = auth.currentUser?.uid;
    
    if (!uid) {
      console.warn("[POST_LOAD] No authenticated user, throwing error to trigger fallback");
      throw new Error("No authenticated user");
    }

    const rateNum = Number(args.rate);

    console.log("[POST_LOAD] Firebase details:", {
      projectId: app.options.projectId,
      writePath: `${LOADS_COLLECTION}/${args.id}`,
      createdBy: uid,
      rate: rateNum
    });

    const loadData = {
      title: String(args.title).trim(),
      origin: String(args.origin).trim(),
      destination: String(args.destination).trim(),
      vehicleType: String(args.vehicleType),
      rate: rateNum,
      status: LOAD_STATUS.OPEN, // EXACT value your list should filter on
      createdBy: uid,
      pickupDate: Timestamp.fromDate(new Date(args.pickupDate)),
      deliveryDate: Timestamp.fromDate(new Date(args.deliveryDate)),
      attachments: (args.finalPhotos ?? []).map((p) => ({
        url: p.url,
        path: p.path ?? null,
      })),
      createdAt: serverTimestamp(),
      clientCreatedAt: Date.now(), // lets UI sort immediately
    };

    console.log("[POST_LOAD] Attempting to write to Firestore...");
    
    await setDoc(
      doc(db, LOADS_COLLECTION, args.id),
      loadData,
      { merge: true }
    );

    console.log("[POST_LOAD] Successfully wrote to Firestore:", `${LOADS_COLLECTION}/${args.id}`);
    
  } catch (error: any) {
    console.error("[POST_LOAD_ERROR]", error?.code || 'unknown-code', error?.message || 'Unknown error');
    
    // Log specific Firebase permission errors with more context
    if (error?.code === 'permission-denied') {
      console.error("[POST_LOAD_ERROR] Firebase permission denied. This is expected in development mode.");
      console.error("[POST_LOAD_ERROR] Reasons:");
      console.error("[POST_LOAD_ERROR] 1. Firestore security rules restrict anonymous user writes");
      console.error("[POST_LOAD_ERROR] 2. This is a security feature to prevent unauthorized data writes");
      console.error("[POST_LOAD_ERROR] 3. The app will fallback to local storage automatically");
      const { auth: authInstance } = getFirebase();
      console.error("[POST_LOAD_ERROR] Current user:", authInstance.currentUser ? {
        uid: authInstance.currentUser.uid,
        isAnonymous: authInstance.currentUser.isAnonymous,
        email: authInstance.currentUser.email
      } : 'No user');
    } else if (error?.code === 'unavailable') {
      console.error("[POST_LOAD_ERROR] Firebase service unavailable - network or server issue");
    } else if (error?.code === 'unauthenticated') {
      console.error("[POST_LOAD_ERROR] User not authenticated properly");
    }
    
    // Re-throw the error so the calling code can handle it (fallback to local storage)
    throw error;
  }
}
