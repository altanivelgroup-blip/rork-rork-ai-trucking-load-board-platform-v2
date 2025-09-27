import { db } from "@/utils/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/** Ensures a per-user test load exists and returns its id. */
export async function ensureTestLoad(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }
  
  console.log('[ensureTestLoad] Creating test load for user:', userId);
  
  const loadId = `test-load-${userId}`;
  const ref = doc(db, "loads", loadId);
  
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log('[ensureTestLoad] Test load does not exist, creating...');
      await setDoc(ref, {
        title: "TEST LOAD (do not use)",
        createdBy: userId,            // <- matches Storage Rules owner check
        assignedDriverId: userId,     // <- lets the driver role upload too
        status: "test",
        createdAt: serverTimestamp(),
        lastPhotoAt: serverTimestamp(),
        coverPhotoUrl: null,
      });
      console.log('[ensureTestLoad] Test load created successfully');
    } else {
      console.log('[ensureTestLoad] Test load already exists');
    }
    
    return loadId;
  } catch (error: any) {
    console.error('[ensureTestLoad] Failed to create test load:', error);
    throw new Error(`Failed to create test load: ${error?.message || error}`);
  }
}