import { db } from "@/utils/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function ensureTestLoad(userId: string) {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Valid userId is required');
  }

  console.log('[ensureTestLoad] Ensuring test load for user:', userId);

  const loadId = `test-load-${userId}`;
  const ref = doc(db, "loads", loadId);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log('[ensureTestLoad] Test load missing, creating with owner fields...');
      await setDoc(ref, {
        title: "TEST LOAD (do not use)",
        createdBy: userId,
        userId: userId,
        assignedDriverId: userId,
        status: "test",
        createdAt: serverTimestamp(),
        lastPhotoAt: serverTimestamp(),
        coverPhotoUrl: null,
      });
      console.log('[ensureTestLoad] Test load created');
    } else {
      const data = snap.data() as Record<string, unknown> | undefined;
      const needsOwnerPatch = !data?.createdBy || !data?.userId;
      if (needsOwnerPatch) {
        console.log('[ensureTestLoad] Patching owner fields on existing test load');
        await setDoc(
          ref,
          { createdBy: userId, userId: userId },
          { merge: true } as any
        );
      }
      console.log('[ensureTestLoad] Test load ready');
    }

    return loadId;
  } catch (error: any) {
    console.error('[ensureTestLoad] Failed to create test load:', error);
    throw new Error(`Failed to create test load: ${error?.message || error}`);
  }
}