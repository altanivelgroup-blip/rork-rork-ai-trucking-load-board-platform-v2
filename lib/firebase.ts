import { doc, setDoc, serverTimestamp, Timestamp, collection, query, where, orderBy, limit, getDocs, getDocsFromServer } from "firebase/firestore";
import { getFirebase, ensureFirebaseAuth } from "@/utils/firebase";

export const LOADS_COLLECTION = "loads";

export const LOAD_STATUS = {
  OPEN: "OPEN",
} as const;

export type LoadDoc = {
  title: string;
  origin: string;
  destination: string;
  vehicleType: string;
  rate: number;
  status: keyof typeof LOAD_STATUS | "OPEN";
  createdBy: string;
  pickupDate: any;
  deliveryDate: any;
  createdAt: any;
  clientCreatedAt: number;
  attachments: { url: string; path?: string | null }[];
};

// Test Firebase connection
export async function testFirebaseConnection() {
  try {
    console.log('[Firebase Test] Starting connection test...');
    
    const { auth, db, app } = getFirebase();
    console.log('[Firebase Test] Firebase services initialized');
    console.log('[Firebase Test] Project ID:', app.options.projectId);
    console.log('[Firebase Test] Auth domain:', app.options.authDomain);
    
    // Test authentication
    const authAvailable = await ensureFirebaseAuth();
    console.log('[Firebase Test] Auth available:', authAvailable);
    console.log('[Firebase Test] Current user:', auth.currentUser?.uid || 'none');
    
    if (!authAvailable || !auth.currentUser) {
      console.log('[Firebase Test] No authenticated user, cannot test Firestore');
      return { success: false, error: 'No authenticated user' };
    }
    
    // Test Firestore read
    console.log('[Firebase Test] Testing Firestore read...');
    const q = query(
      collection(db, LOADS_COLLECTION),
      where("status", "==", LOAD_STATUS.OPEN),
      where("createdBy", "==", auth.currentUser.uid),
      orderBy("clientCreatedAt", "desc"),
      limit(5)
    );
    
    const snap = await getDocsFromServer(q);
    console.log('[Firebase Test] Query successful, docs found:', snap.docs.length);
    
    snap.docs.forEach((doc, index) => {
      console.log(`[Firebase Test] Doc ${index + 1}:`, doc.id, doc.data());
    });
    
    return { 
      success: true, 
      projectId: app.options.projectId,
      userId: auth.currentUser.uid,
      docsFound: snap.docs.length 
    };
    
  } catch (error: any) {
    console.error('[Firebase Test] Connection test failed:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      code: error.code || 'unknown'
    };
  }
}

async function postLoad({
  id,
  title, origin, destination, vehicleType, rate,
  pickupDate, deliveryDate, finalPhotos,
}: {
  id: string;
  title: string; origin: string; destination: string; vehicleType: string; rate: number;
  pickupDate: Date; deliveryDate: Date;
  finalPhotos: { url: string; path?: string | null }[];
}) {
  const { auth, db, app } = getFirebase();
  
  console.log("[POST] projectId:", app.options.projectId);
  console.log("[POST] writing path:", `loads/${id}`);
  console.log("[POST] createdBy:", auth.currentUser?.uid);

  await setDoc(doc(db, LOADS_COLLECTION, id), {
    title: title.trim(),
    origin, destination, vehicleType,
    rate: Number(rate),
    status: LOAD_STATUS.OPEN,
    createdBy: auth.currentUser!.uid,
    pickupDate: Timestamp.fromDate(new Date(pickupDate as any)),
    deliveryDate: Timestamp.fromDate(new Date(deliveryDate as any)),
    attachments: finalPhotos.map(p => ({ url: p.url, path: p.path ?? null })),
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
  }, { merge: true });

  console.log("[POST] wrote", `${LOADS_COLLECTION}/${id}`);
}

export { postLoad };