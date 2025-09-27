import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/** Ensures a per-user test load exists and returns its id. */
export async function ensureTestLoad(userId: string) {
  const loadId = `test-load-${userId}`;
  const ref = doc(db, "loads", loadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      title: "TEST LOAD (do not use)",
      createdBy: userId,            // <- matches Storage Rules owner check
      assignedDriverId: userId,     // <- lets the driver role upload too
      status: "test",
      createdAt: serverTimestamp(),
      lastPhotoAt: serverTimestamp(),
      coverPhotoUrl: null,
    });
  }
  return loadId;
}