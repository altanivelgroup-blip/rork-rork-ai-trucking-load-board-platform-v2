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
  // Make sure auth is ready (your helper can sign in or refresh token)
  await ensureFirebaseAuth();

  const { auth, db, app } = getFirebase();
  const uid = auth.currentUser?.uid ?? "anonymous";
  const rateNum = Number(args.rate);

  console.log("[POST] projectId:", app.options.projectId);
  console.log("[POST] writing path:", `${LOADS_COLLECTION}/${args.id}`);
  console.log("[POST] createdBy:", uid);

  await setDoc(
    doc(db, LOADS_COLLECTION, args.id),
    {
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
    },
    { merge: true }
  );

  console.log("[POST] wrote", `${LOADS_COLLECTION}/${args.id}`);
}
