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
  getDocs,
  writeBatch,
  updateDoc,
  deleteDoc,
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

// ---- Archive expired loads (deliveryDate + 36h) ----
export async function archiveExpiredLoads(): Promise<{ scanned: number; archived: number }> {
  const { db } = getFirebase();
  const now = Date.now();
  let archived = 0;
  let scanned = 0;
  try {
    const q = query(
      collection(db, LOADS_COLLECTION),
      where('isArchived', '==', false),
      where('expiresAtMs', '<=', now),
      orderBy('expiresAtMs', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q as any);
    scanned = snap.docs.length;
    if (scanned === 0) return { scanned, archived };
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { isArchived: true, archivedAt: serverTimestamp() });
      archived += 1;
    });
    await batch.commit();
    return { scanned, archived };
  } catch (e) {
    console.log('[ArchiveExpired] error', e);
    return { scanned, archived };
  }
}

// ---- Purge archived loads older than N days ----
export async function purgeArchivedLoads(days: number = 14): Promise<{ scanned: number; purged: number }> {
  const { db } = getFirebase();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let purged = 0;
  let scanned = 0;
  try {
    const q = query(
      collection(db, LOADS_COLLECTION),
      where('isArchived', '==', true),
      orderBy('clientCreatedAt', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q as any);
    const toDelete = snap.docs.filter((d) => {
      const cc = (d.data() as any)?.clientCreatedAt ?? 0;
      return typeof cc === 'number' && cc < cutoff;
    });
    scanned = toDelete.length;
    if (scanned === 0) return { scanned, purged };
    const batch = writeBatch(db);
    toDelete.forEach((d) => {
      batch.delete(d.ref);
      purged += 1;
    });
    await batch.commit();
    return { scanned, purged };
  } catch (e) {
    console.log('[PurgeArchived] error', e);
    return { scanned, purged };
  }
}

// ---- MAIN: post a load into /loads/{id} ----
function parseGmtOffset(value: string): number | null {
  try {
    const m = value.match(/GMT([+\-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    const h = Number(m[2] ?? 0);
    const mm = Number(m[3] ?? 0);
    return sign * (h * 60 + mm) * 60 * 1000;
  } catch {
    return null;
  }
}

function getOffsetMsForTZ(tz: string, atUtcMs: number): number | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      timeZoneName: 'shortOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = fmt.formatToParts(new Date(atUtcMs));
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const off = parseGmtOffset(tzName);
    return off;
  } catch (e) {
    console.log('[POST_LOAD] getOffsetMsForTZ fallback', e);
    return null;
  }
}

function toUtcMsForLocalWallTime(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  ss: number,
  ms: number,
  tz?: string | null,
): number {
  // If no IANA tz provided, interpret wall time in the device's local timezone
  if (!tz) {
    const local = new Date(y, m, d, hh, mm, ss, ms).getTime();
    return local;
  }
  // Initial guess assumes provided wall time is in the provided tz
  const guessUtc = Date.UTC(y, m, d, hh, mm, ss, ms);
  const off1 = getOffsetMsForTZ(tz, guessUtc);
  if (off1 == null) return guessUtc;
  let refined = guessUtc - off1;
  const off2 = getOffsetMsForTZ(tz, refined);
  if (off2 != null && off2 !== off1) {
    refined = guessUtc - off2;
  }
  return refined;
}

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
  deliveryTZ?: string | null;
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
      isArchived: false,
      archivedAt: null,
      expiresAtMs: (() => {
        try {
          const dd = new Date(args.deliveryDate);
          if (!(dd instanceof Date) || isNaN(dd.getTime())) return undefined as unknown as number;
          const y = dd.getUTCFullYear();
          const m = dd.getUTCMonth();
          const d = dd.getUTCDate();
          const isMidnight = dd.getHours() === 0 && dd.getMinutes() === 0 && dd.getSeconds() === 0 && dd.getMilliseconds() === 0;
          const targetHour = isMidnight ? 17 : dd.getHours();
          const targetMin = isMidnight ? 0 : dd.getMinutes();
          const targetSec = isMidnight ? 0 : dd.getSeconds();
          const targetMs = isMidnight ? 0 : dd.getMilliseconds();

          const utcMs = toUtcMsForLocalWallTime(
            // Use calendar fields in the delivery date's calendar, based on UTC components to avoid DST drift here; corrected by tz offset later
            y, m, d,
            targetHour, targetMin, targetSec, targetMs,
            args.deliveryTZ ?? null,
          );
          const thirtySixHoursMs = 36 * 60 * 60 * 1000;
          return utcMs + thirtySixHoursMs;
        } catch (e) {
          console.log('[POST_LOAD] expiresAtMs compute failed', e);
          return undefined as unknown as number;
        }
      })(),
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
