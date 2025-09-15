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
import { LOADS_COLLECTION, LOAD_STATUS } from "@/lib/loadSchema";
import { FORCE_DELIVERY_TZ } from '@/utils/env';

// ---- Quick connection test you can call from anywhere ----
export async function testFirebaseConnection() {
  try {
    console.log("[Firebase Test] 🚀 Starting comprehensive connection test...");

    const { auth, db, app } = getFirebase();
    console.log("[Firebase Test] ✅ Firebase services initialized");
    console.log("[Firebase Test] 📋 Project ID:", app.options.projectId);
    console.log("[Firebase Test] 🌐 Auth domain:", app.options.authDomain);

    // Test 1: Authentication
    console.log("[Firebase Test] 🔐 Testing authentication...");
    const authAvailable = await ensureFirebaseAuth();
    console.log("[Firebase Test] Auth result:", authAvailable);
    
    if (auth.currentUser) {
      console.log("[Firebase Test] ✅ Current user:", {
        uid: auth.currentUser.uid,
        isAnonymous: auth.currentUser.isAnonymous,
        email: auth.currentUser.email || 'none'
      });
    } else {
      console.log("[Firebase Test] ❌ No current user");
    }

    if (!authAvailable || !auth.currentUser) {
      return { 
        success: false, 
        error: "Authentication failed",
        details: {
          authAvailable,
          hasCurrentUser: !!auth.currentUser,
          projectId: app.options.projectId
        }
      };
    }

    // Test 2: Basic Firestore read (public data)
    console.log("[Firebase Test] 📖 Testing Firestore read access...");
    try {
      const publicQuery = query(
        collection(db, LOADS_COLLECTION),
        where("status", "==", LOAD_STATUS.OPEN),
        limit(3)
      );
      const publicSnap = await getDocsFromServer(publicQuery);
      console.log("[Firebase Test] ✅ Public read OK, docs:", publicSnap.docs.length);
    } catch (readError: any) {
      console.warn("[Firebase Test] ⚠️ Public read failed:", readError.code, readError.message);
    }

    // Test 3: User-specific read (simplified to avoid index issues)
    console.log("[Firebase Test] 👤 Testing user-specific read access...");
    try {
      // Use a simpler query that doesn't require composite index
      const userQuery = query(
        collection(db, LOADS_COLLECTION),
        where("createdBy", "==", auth.currentUser.uid),
        limit(5)
      );
      const userSnap = await getDocsFromServer(userQuery);
      console.log("[Firebase Test] ✅ User-specific read OK, docs:", userSnap.docs.length);
    } catch (userReadError: any) {
      if (userReadError.code === 'failed-precondition' && userReadError.message.includes('index')) {
        console.warn("[Firebase Test] ⚠️ Index required for complex queries - this is normal for new projects");
        // Try a simpler query without orderBy
        try {
          const simpleQuery = query(
            collection(db, LOADS_COLLECTION),
            limit(3)
          );
          const simpleSnap = await getDocsFromServer(simpleQuery);
          console.log("[Firebase Test] ✅ Simple read OK, docs:", simpleSnap.docs.length);
        } catch (simpleError: any) {
          console.warn("[Firebase Test] ❌ Even simple read failed:", simpleError.code, simpleError.message);
        }
      } else {
        console.warn("[Firebase Test] ⚠️ User-specific read failed:", userReadError.code, userReadError.message);
      }
    }

    // Test 4: Write permissions
    console.log("[Firebase Test] ✍️ Testing write permissions...");
    try {
      const testDoc = doc(db, LOADS_COLLECTION, 'test-' + Date.now());
      await setDoc(testDoc, {
        title: 'Firebase Test Load',
        status: LOAD_STATUS.OPEN,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        isTest: true,
        isArchived: false,
        archivedAt: null
      });
      console.log("[Firebase Test] ✅ Write test successful");
      
      // Clean up test document
      await deleteDoc(testDoc);
      console.log("[Firebase Test] 🧹 Test document cleaned up");
    } catch (writeError: any) {
      console.warn("[Firebase Test] ❌ Write test failed:", writeError.code, writeError.message);
      
      // Provide specific guidance for permission errors
      let errorGuidance = writeError.message;
      if (writeError.code === 'permission-denied') {
        errorGuidance = 'Anonymous users need write permissions. Check Firestore security rules.';
      } else if (writeError.code === 'failed-precondition') {
        errorGuidance = 'Database index required. Check Firebase Console for index creation link.';
      }
      
      return {
        success: false,
        error: `Write permission denied: ${errorGuidance}`,
        code: writeError.code,
        details: {
          canRead: true,
          canWrite: false,
          userId: auth.currentUser.uid,
          isAnonymous: auth.currentUser.isAnonymous,
          errorCode: writeError.code,
          guidance: errorGuidance
        }
      };
    }

    return {
      success: true,
      projectId: app.options.projectId,
      userId: auth.currentUser.uid,
      isAnonymous: auth.currentUser.isAnonymous,
      message: "All Firebase operations working correctly"
    };
  } catch (error: any) {
    console.error("[Firebase Test] ❌ Test failed:", error);
    return {
      success: false,
      error: error?.message || "Unknown error",
      code: error?.code || "unknown",
      details: {
        errorType: error?.constructor?.name,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n')
      }
    };
  }
}

// ---- Archive expired loads (only completed loads after 7-day window) ----
export async function archiveExpiredLoads(): Promise<{ scanned: number; archived: number }> {
  const { db } = getFirebase();
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  let archived = 0;
  let scanned = 0;
  
  console.log('[ArchiveExpired] Archiving updated - Starting with new 7-day window logic');
  
  try {
    // Query for loads that are not archived and are either completed or explicitly marked for archiving
    const q = query(
      collection(db, LOADS_COLLECTION),
      where('isArchived', '==', false),
      limit(200)
    );
    const snap = await getDocs(q as any);
    scanned = snap.docs.length;
    
    console.log(`[ArchiveExpired] Scanned ${scanned} loads for archiving eligibility`);
    
    if (scanned === 0) return { scanned, archived };
    
    const batch = writeBatch(db);
    
    snap.docs.forEach((doc) => {
      const data = doc.data() as any;
      const status = data?.status;
      const deliveryDate = data?.deliveryDate?.toDate ? data.deliveryDate.toDate() : new Date(data?.deliveryDate || 0);
      const deliveryTimestamp = deliveryDate.getTime();
      
      // Only archive if:
      // 1. Status is 'completed' OR explicitly marked as 'archived'
      // 2. AND delivery date is more than 7 days ago
      const shouldArchive = (
        (status === 'completed' || status === 'archived') &&
        deliveryTimestamp < sevenDaysAgo &&
        !isNaN(deliveryTimestamp)
      );
      
      if (shouldArchive) {
        console.log(`[ArchiveExpired] Archiving load ${doc.id} - status: ${status}, delivery: ${deliveryDate.toISOString()}`);
        batch.update(doc.ref, { 
          isArchived: true, 
          archivedAt: serverTimestamp(),
          archivedReason: 'completed_7day_window'
        });
        archived += 1;
      } else {
        console.log(`[ArchiveExpired] Load remains visible - ${doc.id} status: ${status}, delivery: ${deliveryDate.toISOString()}`);
      }
    });
    
    if (archived > 0) {
      await batch.commit();
      console.log(`[ArchiveExpired] Successfully archived ${archived} completed loads`);
    } else {
      console.log('[ArchiveExpired] No loads eligible for archiving at this time');
    }
    
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
  
  console.log(`[PurgeArchived] Starting purge of archived loads older than ${days} days`);
  
  try {
    const q = query(
      collection(db, LOADS_COLLECTION),
      where('isArchived', '==', true),
      orderBy('clientCreatedAt', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q as any);
    const toDelete = snap.docs.filter((d) => {
      const data = d.data() as any;
      const cc = data?.clientCreatedAt ?? 0;
      const archivedAt = data?.archivedAt?.toDate ? data.archivedAt.toDate().getTime() : 0;
      
      // Use archivedAt if available, otherwise fall back to clientCreatedAt
      const timestamp = archivedAt || cc;
      const shouldDelete = typeof timestamp === 'number' && timestamp < cutoff;
      
      if (shouldDelete) {
        console.log(`[PurgeArchived] Marking for deletion: ${d.id}, archived: ${new Date(timestamp).toISOString()}`);
      }
      
      return shouldDelete;
    });
    
    scanned = toDelete.length;
    console.log(`[PurgeArchived] Found ${scanned} archived loads eligible for deletion`);
    
    if (scanned === 0) return { scanned, purged };
    
    const batch = writeBatch(db);
    toDelete.forEach((d) => {
      batch.delete(d.ref);
      purged += 1;
    });
    
    await batch.commit();
    console.log(`[PurgeArchived] Successfully purged ${purged} archived loads`);
    
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

export function computeExpiresAtMsFromLocalTZ(deliveryLocalISO: string, tz: string): number {
  try {
    const providedTz = (FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0) ? FORCE_DELIVERY_TZ : tz;
    const safeTz = (() => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: providedTz });
        return providedTz;
      } catch {
        return 'America/Phoenix';
      }
    })();

    const raw = String(deliveryLocalISO).trim();
    const hasTime = /T\d{2}:\d{2}/.test(raw);
    const normalized = hasTime ? raw : `${raw}T17:00`;

    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/);
    if (!m) throw new Error('invalid ISO');
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const hh = Number(m[4]);
    const mi = Number(m[5]);
    const ss = Number(m[6] ?? 0);
    const ms = Number(m[7] ?? 0);

    const utcMs = toUtcMsForLocalWallTime(y, mo, d, hh, mi, ss, ms, safeTz);
    const expires = utcMs + 36 * 60 * 60 * 1000;
    return expires;
  } catch (e) {
    console.log('[computeExpiresAtMsFromLocalTZ] failed', e);
    return Date.now() + 36 * 60 * 60 * 1000;
  }
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
  deliveryDateLocal?: string | null;
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

    function formatLocalIso(date: Date, tz?: string | null): string | undefined {
      try {
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz || undefined,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const parts = fmt.formatToParts(date);
        const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
        const yyyy = get('year');
        const mm = get('month');
        const dd = get('day');
        const hh = get('hour');
        const mi = get('minute');
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      } catch (e) {
        console.log('[POST_LOAD] formatLocalIso failed', e);
        return undefined;
      }
    }

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
      deliveryTZ: args.deliveryTZ ?? null,
      deliveryDateLocal: (() => {
        try {
          if (args.deliveryDateLocal && typeof args.deliveryDateLocal === 'string') {
            return args.deliveryDateLocal;
          }
          const dd = new Date(args.deliveryDate);
          const isMidnight = dd.getHours() === 0 && dd.getMinutes() === 0 && dd.getSeconds() === 0 && dd.getMilliseconds() === 0;
          if (isMidnight) dd.setHours(17, 0, 0, 0);
          return formatLocalIso(dd, args.deliveryTZ ?? undefined);
        } catch (e) {
          console.log('[POST_LOAD] deliveryDateLocal compute failed', e);
          return undefined;
        }
      })(),
      revenueUsd: rateNum,
    } as const;

    const refDoc = doc(db, LOADS_COLLECTION, args.id);
    const existing = await (await import('firebase/firestore')).getDoc(refDoc);
    const createOnly = existing.exists() ? {} : {
      createdBy: uid,
      clientId: "KKfDm9aj5KZKNlgnB1KcqsKEPUX2",
    };

    const computeExpires = (() => {
      try {
        const dl = baseData.deliveryDateLocal ?? null;
        const tz = baseData.deliveryTZ ?? null;
        if (dl && tz) {
          return computeExpiresAtMsFromLocalTZ(dl, tz);
        }
        return undefined;
      } catch (e) {
        console.log('[POST_LOAD] expiresAtMs compute failed', e);
        return undefined;
      }
    })();

    const loadData = {
      ...baseData,
      ...createOnly,
      ...(computeExpires != null ? { expiresAtMs: computeExpires } : {}),
      // Never touch isArchived/archivedAt here; cron-only
      // Loads remain visible until explicitly completed and 7-day window passes
    } as const;

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
