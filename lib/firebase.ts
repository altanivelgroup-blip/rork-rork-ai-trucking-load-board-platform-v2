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

    const baseData = {
      title: String(args.title).trim(),
      origin: String(args.origin).trim(),
      destination: String(args.destination).trim(),
      vehicleType: String(args.vehicleType),
      rate: rateNum,
      status: LOAD_STATUS.OPEN,
      pickupDate: Timestamp.fromDate(new Date(args.pickupDate)),
      deliveryDate: Timestamp.fromDate(new Date(args.deliveryDate)),
      attachments: (args.finalPhotos ?? []).map((p) => ({
        url: p.url,
        path: p.path ?? null,
      })),
      createdAt: serverTimestamp(),
      clientCreatedAt: Date.now(),
    } as const;

    const refDoc = doc(db, LOADS_COLLECTION, args.id);
    const existing = await (await import('firebase/firestore')).getDoc(refDoc);
    const createOnly = existing.exists() ? {} : {
      createdBy: uid,
      clientId: "KKfDm9aj5KZKNlgnB1KcqsKEPUX2",
    };

    const loadData = { ...baseData, ...createOnly };

    console.log("[POST_LOAD] Attempting to write to Firestore...");
    
    await setDoc(refDoc, loadData, { merge: true });

    console.log("[POST_LOAD] Successfully wrote to Firestore:", `${LOADS_COLLECTION}/${args.id}`);
    
  } catch (error: any) {
    // Log specific Firebase permission errors with more context
    if (error?.code === 'permission-denied') {
      console.warn("[POST_LOAD] Firebase permission denied - this is expected in development mode.");
      console.warn("[POST_LOAD] Anonymous users cannot write to production Firestore. Falling back to local storage.");
      const { auth: authInstance } = getFirebase();
      console.log("[POST_LOAD] Current user:", authInstance.currentUser ? {
        uid: authInstance.currentUser.uid,
        isAnonymous: authInstance.currentUser.isAnonymous,
        email: authInstance.currentUser.email
      } : 'No user');
    } else if (error?.code === 'unavailable') {
      console.warn("[POST_LOAD] Firebase service unavailable - network or server issue. Falling back to local storage.");
    } else if (error?.code === 'unauthenticated') {
      console.warn("[POST_LOAD] User not authenticated properly. Falling back to local storage.");
    } else {
      console.warn("[POST_LOAD] Firebase write failed:", error?.code || 'unknown-code', error?.message || 'Unknown error');
    }
    
    // Re-throw the error so the calling code can handle it (fallback to local storage)
    throw error;
  }
}
