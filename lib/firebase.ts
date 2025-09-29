// ==============================
// firebase.ts (drop-in replacement)
// ==============================

import {
  doc,
  setDoc,
  getDoc,
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
import { FORCE_DELIVERY_TZ } from "@/utils/env";

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
        email: auth.currentUser.email || "none",
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
          projectId: app.options.projectId,
        },
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
      console.log(
        "[Firebase Test] ✅ Public read OK, docs:",
        publicSnap.docs.length
      );
    } catch (readError: any) {
      console.warn(
        "[Firebase Test] ⚠️ Public read failed:",
        readError.code,
        readError.message
      );
    }

    // Test 3: User-specific read (simplified to avoid index issues)
    console.log("[Firebase Test] 👤 Testing user-specific read access...");
    try {
      const userQuery = query(
        collection(db, LOADS_COLLECTION),
        where("createdBy", "==", auth.currentUser.uid),
        limit(5)
      );
      const userSnap = await getDocsFromServer(userQuery);
      console.log(
        "[Firebase Test] ✅ User-specific read OK, docs:",
        userSnap.docs.length
      );
    } catch (userReadError: any) {
      if (
        userReadError.code === "failed-precondition" &&
        userReadError.message.includes("index")
      ) {
        console.warn(
          "[Firebase Test] ⚠️ Index required for complex queries - this is normal for new projects"
        );
        try {
          const simpleQuery = query(collection(db, LOADS_COLLECTION), limit(3));
          const simpleSnap = await getDocsFromServer(simpleQuery);
          console.log(
            "[Firebase Test] ✅ Simple read OK, docs:",
            simpleSnap.docs.length
          );
        } catch (simpleError: any) {
          console.warn(
            "[Firebase Test] ❌ Even simple read failed:",
            simpleError.code,
            simpleError.message
          );
        }
      } else {
        console.warn(
          "[Firebase Test] ⚠️ User-specific read failed:",
          userReadError.code,
          userReadError.message
        );
      }
    }

    // Test 4: Write permissions
    console.log("[Firebase Test] ✍️ Testing write permissions...");
    try {
      const testDoc = doc(db, LOADS_COLLECTION, "test-" + Date.now());
      await setDoc(testDoc, {
        title: "Firebase Test Load",
        status: LOAD_STATUS.OPEN,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        isTest: true,
        isArchived: false,
        archivedAt: null,
      });
      console.log("[Firebase Test] ✅ Write test successful");

      // Clean up test document
      await deleteDoc(testDoc);
      console.log("[Firebase Test] 🧹 Test document cleaned up");
    } catch (writeError: any) {
      console.warn(
        "[Firebase Test] ❌ Write test failed:",
        writeError.code,
        writeError.message
      );

      let errorGuidance = writeError.message;
      if (writeError.code === "permission-denied") {
        errorGuidance =
          "Anonymous users need write permissions. Check Firestore security rules.";
      } else if (writeError.code === "failed-precondition") {
        errorGuidance =
          "Database index required. Check Firebase Console for index creation link.";
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
          guidance: errorGuidance,
        },
      };
    }

    return {
      success: true,
      projectId: app.options.projectId,
      userId: auth.currentUser.uid,
      isAnonymous: auth.currentUser.isAnonymous,
      message: "All Firebase operations working correctly",
    };
  } catch (error: any) {
    console.error("[Firebase Test] ❌ Test failed:", error);
    return {
      success: false,
      error: error?.message || "Unknown error",
      code: error?.code || "unknown",
      details: {
        errorType: error?.constructor?.name,
        stack: error?.stack?.split("\n").slice(0, 3).join("\n"),
      },
    };
  }
}

// ---- ENFORCE LOAD RULES: Archive expired loads (7-day auto-delete from board) ----
export async function archiveExpiredLoads(): Promise<{
  scanned: number;
  archived: number;
}> {
  const { db } = getFirebase();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  let archived = 0;
  let scanned = 0;

  console.log(
    "[ArchiveExpired] ENFORCE RULES - Starting 7-day auto-delete from board"
  );

  try {
    const q = query(
      collection(db, LOADS_COLLECTION),
      where("isArchived", "==", false),
      limit(200)
    );
    const snap = await getDocs(q as any);
    scanned = snap.docs.length;

    console.log(
      `[ArchiveExpired] ENFORCE RULES - Scanned ${scanned} loads for 7-day rule`
    );

    if (scanned === 0) return { scanned, archived };

    const batch = writeBatch(db);

    snap.docs.forEach((doc) => {
      const data = doc.data() as any;
      const deliveryDate = data?.deliveryDate?.toDate
        ? data.deliveryDate.toDate()
        : new Date(data?.deliveryDate || 0);
      const deliveryTimestamp = deliveryDate.getTime();

      const shouldArchive =
        deliveryTimestamp < sevenDaysAgo && !isNaN(deliveryTimestamp);

      if (shouldArchive) {
        console.log(
          `[ArchiveExpired] ENFORCE RULES - Auto-deleting load ${doc.id} from board - delivery: ${deliveryDate.toISOString()} (7+ days ago)`
        );
        batch.update(doc.ref, {
          isArchived: true,
          archivedAt: serverTimestamp(),
          archivedReason: "7day_auto_delete_from_board",
        });
        archived += 1;
      } else {
        console.log(
          `[ArchiveExpired] ENFORCE RULES - Load ${doc.id} remains on board - delivery: ${deliveryDate.toISOString()} (within 7 days)`
        );
      }
    });

    if (archived > 0) {
      await batch.commit();
      console.log(
        `[ArchiveExpired] ENFORCE RULES - Successfully auto-deleted ${archived} loads from board (kept in history)`
      );
    } else {
      console.log(
        "[ArchiveExpired] ENFORCE RULES - No loads eligible for board auto-delete at this time"
      );
    }

    return { scanned, archived };
  } catch (e) {
    console.log("[ArchiveExpired] ENFORCE RULES - error", e);
    return { scanned, archived };
  }
}

// ---- ENFORCE LOAD RULES: Purge archived loads (only when manually deleted from profile) ----
export async function purgeArchivedLoads(
  days: number = 14
): Promise<{ scanned: number; purged: number }> {
  const { db } = getFirebase();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let purged = 0;
  let scanned = 0;

  console.log(
    `[PurgeArchived] ENFORCE RULES - Starting purge of manually deleted loads older than ${days} days`
  );

  try {
    const q = query(
      collection(db, LOADS_COLLECTION),
      where("isArchived", "==", true),
      where("archivedReason", "==", "manual_profile_delete"),
      orderBy("archivedAt", "asc"),
      limit(200)
    );
    const snap = await getDocs(q as any);
    const toDelete = snap.docs.filter((d) => {
      const data = d.data() as any;
      const archivedAt = data?.archivedAt?.toDate
        ? data.archivedAt.toDate().getTime()
        : 0;

      const shouldDelete = typeof archivedAt === "number" && archivedAt < cutoff;

      if (shouldDelete) {
        console.log(
          `[PurgeArchived] ENFORCE RULES - Marking manually deleted load for purge: ${d.id}, archived: ${new Date(
            archivedAt
          ).toISOString()}`
        );
      }

      return shouldDelete;
    });

    scanned = toDelete.length;
    console.log(
      `[PurgeArchived] ENFORCE RULES - Found ${scanned} manually deleted loads eligible for purge`
    );

    if (scanned === 0) return { scanned, purged };

    const batch = writeBatch(db);
    toDelete.forEach((d) => {
      batch.delete(d.ref);
      purged += 1;
    });

    await batch.commit();
    console.log(
      `[PurgeArchived] ENFORCE RULES - Successfully purged ${purged} manually deleted loads`
    );

    return { scanned, purged };
  } catch (e) {
    console.log("[PurgeArchived] ENFORCE RULES - error", e);
    return { scanned, purged };
  }
}

// ======================
// Timezone helpers
// ======================
function parseGmtOffset(value: string): number | null {
  try {
    const m = value.match(/GMT([+\-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    const h = Number(m[2] ?? 0);
    const mm = Number(m[3] ?? 0);
    return sign * (h * 60 + mm) * 60 * 1000;
  } catch {
    return null;
  }
}

function getOffsetMsForTZ(tz: string, atUtcMs: number): number | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = fmt.formatToParts(new Date(atUtcMs));
    const tzName =
      parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const off = parseGmtOffset(tzName);
    return off;
  } catch (e) {
    console.log("[POST_LOAD] getOffsetMsForTZ fallback", e);
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
  tz?: string | null
): number {
  if (!tz) {
    const local = new Date(y, m, d, hh, mm, ss, ms).getTime();
    return local;
  }
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

export function computeExpiresAtMsFromLocalTZ(
  deliveryLocalISO: string,
  tz: string
): number {
  try {
    const providedTz =
      FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0
        ? FORCE_DELIVERY_TZ
        : tz;
    const safeTz = (() => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: providedTz });
        return providedTz;
      } catch {
        return "America/Phoenix";
      }
    })();

    const raw = String(deliveryLocalISO).trim();
    const hasTime = /T\d{2}:\d{2}/.test(raw);
    const normalized = hasTime ? raw : `${raw}T17:00`;

    const m = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/
    );
    if (!m) throw new Error("invalid ISO");
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
    console.log("[computeExpiresAtMsFromLocalTZ] failed", e);
    return Date.now() + 36 * 60 * 60 * 1000;
  }
}

// ======================
// MPG helpers (NEW)
// ======================
function pickNumber(v: any): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : undefined;
}

function withNormalizedMpg<T extends { mpgRated?: any; fuelProfile?: any }>(
  obj: T
) {
  const mpg = pickNumber(obj.mpgRated ?? obj.fuelProfile?.averageMpg);
  if (mpg == null) return obj;

  return {
    ...obj,
    mpgRated: mpg,
    fuelProfile: {
      ...(obj.fuelProfile ?? {}),
      averageMpg: mpg,
    },
  };
}

// ======================
// DRIVER PROFILE
// ======================
export async function saveDriverProfile(driverData: {
  userId: string;
  // Personal Information
  fullName: string;
  email: string;
  phone?: string;
  company?: string;

  // Basic Driver Profile Fields
  truckType?: string;
  tankSize?: number;
  fuelTypePreference?: "diesel" | "gasoline";
  yearsExperience?: number;
  safetyCertifications?: string;

  // Vehicle Information
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  fuelType?: "diesel" | "gasoline";
  mpgRated?: number;
  vin?: string;
  plate?: string;
  tankGallons?: number;
  gvwrLbs?: number;

  // Trailer Information
  trailerMake?: string;
  trailerModel?: string;
  trailerYear?: number;
  trailerVin?: string;
  trailerPlate?: string;
  trailerInsuranceCarrier?: string;
  trailerPolicyNumber?: string;
  trailerGvwrLbs?: number;
  trailerType?: string;

  // Company & Insurance
  companyName?: string;
  mcNumber?: string;
  dotNumber?: string;
  insuranceCarrier?: string;
  policyNumber?: string;

  // Additional fields
  role?: string;
  isActive?: boolean;
  balance?: number;
}) {
  try {
    console.log(
      "[SAVE_DRIVER_PROFILE] Starting driver profile save for user:",
      driverData.userId
    );
    console.log(
      "[SAVE_DRIVER_PROFILE] Profile data:",
      JSON.stringify(driverData, null, 2)
    );

    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      console.warn(
        "[SAVE_DRIVER_PROFILE] Firebase auth failed, throwing error"
      );
      throw new Error("Firebase authentication failed");
    }

    const { auth, db } = getFirebase();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.warn("[SAVE_DRIVER_PROFILE] No authenticated user");
      throw new Error("No authenticated user");
    }

    // Build raw profile from inputs
    const rawProfile = {
      // Personal Information
      fullName: driverData.fullName || "",
      email: driverData.email || "",
      phone: driverData.phone || "",
      company: driverData.company || "",

      // Basic Driver Profile Fields
      truckType: driverData.truckType || "",
      tankSize: pickNumber(driverData.tankSize) ?? null,
      fuelTypePreference: driverData.fuelTypePreference || "diesel",
      yearsExperience: pickNumber(driverData.yearsExperience) ?? null,
      safetyCertifications: driverData.safetyCertifications || "",

      // Vehicle Information
      vehicleMake: driverData.vehicleMake || "",
      vehicleModel: driverData.vehicleModel || "",
      vehicleYear: pickNumber(driverData.vehicleYear) ?? null,
      fuelType: driverData.fuelType || "diesel",
      mpgRated: pickNumber(driverData.mpgRated) ?? null,
      vin: driverData.vin || "",
      plate: driverData.plate || "",
      tankGallons: pickNumber(driverData.tankGallons) ?? null,
      gvwrLbs: pickNumber(driverData.gvwrLbs) ?? null,

      // Fuel Profile (will be normalized)
      fuelProfile: driverData.mpgRated
        ? {
            vehicleType: driverData.truckType || "truck",
            averageMpg: pickNumber(driverData.mpgRated),
            fuelType: driverData.fuelType || "diesel",
            tankCapacity: pickNumber(driverData.tankGallons) ?? 150,
            fuelPricePerGallon: 3.85,
          }
        : (null as any),

      // Trailer Information
      trailerMake: driverData.trailerMake || "",
      trailerModel: driverData.trailerModel || "",
      trailerYear: pickNumber(driverData.trailerYear) ?? null,
      trailerVin: driverData.trailerVin || "",
      trailerPlate: driverData.trailerPlate || "",
      trailerInsuranceCarrier: driverData.trailerInsuranceCarrier || "",
      trailerPolicyNumber: driverData.trailerPolicyNumber || "",
      trailerGvwrLbs: pickNumber(driverData.trailerGvwrLbs) ?? null,
      trailerType: driverData.trailerType || "",

      // Company & Insurance
      companyName: driverData.companyName || "",
      mcNumber: driverData.mcNumber || "",
      dotNumber: driverData.dotNumber || "",
      insuranceCarrier: driverData.insuranceCarrier || "",
      policyNumber: driverData.policyNumber || "",

      // System fields
      role: driverData.role || "driver",
      isActive: driverData.isActive !== undefined ? driverData.isActive : true,
      balance: pickNumber(driverData.balance) ?? 0,
      userId: driverData.userId,
      createdBy: currentUser.uid,

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Mirror MPG into both fields
    const driverProfileData = withNormalizedMpg(rawProfile);

    console.log(
      "[SAVE_DRIVER_PROFILE] Prepared profile data for Firestore:",
      JSON.stringify(driverProfileData, null, 2)
    );

    // Save to drivers collection
    const driverRef = doc(db, "drivers", driverData.userId);
    await setDoc(driverRef, driverProfileData, { merge: true });

    console.log(
      "[SAVE_DRIVER_PROFILE] ✅ Driver profile saved successfully to drivers collection"
    );

    // Also save to users collection for compatibility
    const userRef = doc(db, "users", driverData.userId);
    const userData = {
      role: "driver",
      profileData: {
        fullName: driverData.fullName || "",
        email: driverData.email || "",
        phone: driverData.phone || "",
        company: driverData.company || "",
      },
      userId: driverData.userId,
      createdBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, userData, { merge: true });
    console.log(
      "[SAVE_DRIVER_PROFILE] ✅ User profile saved successfully to users collection"
    );

    return {
      success: true,
      message: "Driver profile saved successfully",
      userId: driverData.userId,
      written: {
        mpgRated: driverProfileData.mpgRated,
        fuelProfile: driverProfileData.fuelProfile,
      },
    };
  } catch (error: any) {
    console.error("[SAVE_DRIVER_PROFILE] ❌ Failed to save driver profile:", error);
    console.error("[SAVE_DRIVER_PROFILE] Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.split("\n").slice(0, 3).join("\n"),
    });

    let errorMessage = "Failed to save driver profile";
    if (error?.code === "permission-denied") {
      errorMessage =
        "Permission denied. Please check your account permissions.";
    } else if (error?.code === "unavailable") {
      errorMessage =
        "Firebase service unavailable. Please try again later.";
    } else if (error?.code === "unauthenticated") {
      errorMessage = "User not authenticated. Please sign in again.";
    }

    throw new Error(errorMessage);
  }
}

// ---- DRIVER PROFILE: Get driver profile from Firestore ----
export async function getDriverProfile(userId: string) {
  try {
    console.log("[GET_DRIVER_PROFILE] Fetching driver profile for user:", userId);

    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      console.warn("[GET_DRIVER_PROFILE] Firebase auth failed");
      throw new Error("Firebase authentication failed");
    }

    const { auth, db } = getFirebase();
    
    // Verify we have an authenticated user
    if (!auth.currentUser) {
      console.error("[GET_DRIVER_PROFILE] No authenticated user after ensureFirebaseAuth");
      throw new Error("No authenticated user");
    }
    
    console.log("[GET_DRIVER_PROFILE] Authenticated as:", {
      uid: auth.currentUser.uid,
      isAnonymous: auth.currentUser.isAnonymous,
      requestedUserId: userId
    });

    // Try to get from drivers collection first
    const driverRef = doc(db, "drivers", userId);
    const driverSnap = await getDoc(driverRef);

    if (driverSnap.exists()) {
      const data = withNormalizedMpg(driverSnap.data() as any);
      console.log(
        "[GET_DRIVER_PROFILE] ✅ Driver profile found in drivers collection (normalized MPG)"
      );
      return {
        success: true,
        data: data,
        source: "drivers",
      };
    }

    // Fallback to users collection
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = withNormalizedMpg(userSnap.data() as any);
      console.log(
        "[GET_DRIVER_PROFILE] ✅ User profile found in users collection (normalized MPG)"
      );
      return {
        success: true,
        data: data,
        source: "users",
      };
    }

    console.log("[GET_DRIVER_PROFILE] ❌ No profile found for user:", userId);
    return {
      success: false,
      message: "Driver profile not found",
      data: null,
    };
  } catch (error: any) {
    console.error("[GET_DRIVER_PROFILE] ❌ Failed to get driver profile:", error);
    console.error("[GET_DRIVER_PROFILE] Error details:", {
      code: error?.code,
      message: error?.message,
      userId: userId
    });
    
    // Return a more user-friendly error
    if (error?.code === 'permission-denied') {
      throw new Error('Permission denied. Please ensure you are signed in.');
    }
    
    throw error;
  }
}

// ======================
// MAIN: post a load
// ======================
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
      photosCount: args.finalPhotos?.length || 0,
    });

    const authSuccess = await ensureFirebaseAuth();
    if (!authSuccess) {
      console.warn(
        "[POST_LOAD] Firebase auth failed, throwing error to trigger fallback"
      );
      throw new Error("Firebase authentication failed");
    }

    const { auth, db, app } = getFirebase();
    const uid = auth.currentUser?.uid;

    if (!uid) {
      console.warn(
        "[POST_LOAD] No authenticated user, throwing error to trigger fallback"
      );
      throw new Error("No authenticated user");
    }

    const rateNum = Number(args.rate);

    console.log("[POST_LOAD] Firebase details:", {
      projectId: app.options.projectId,
      writePath: `${LOADS_COLLECTION}/${args.id}`,
      createdBy: uid,
      rate: rateNum,
    });

    function formatLocalIso(date: Date, tz?: string | null): string | undefined {
      try {
        const fmt = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz || undefined,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const parts = fmt.formatToParts(date);
        const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
        const yyyy = get("year");
        const mm = get("month");
        const dd = get("day");
        const hh = get("hour");
        const mi = get("minute");
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      } catch (e) {
        console.log("[POST_LOAD] formatLocalIso failed", e);
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
          if (args.deliveryDateLocal && typeof args.deliveryDateLocal === "string") {
            return args.deliveryDateLocal;
          }
          const dd = new Date(args.deliveryDate);
          const isMidnight =
            dd.getHours() === 0 &&
            dd.getMinutes() === 0 &&
            dd.getSeconds() === 0 &&
            dd.getMilliseconds() === 0;
          if (isMidnight) dd.setHours(17, 0, 0, 0);
          return formatLocalIso(dd, args.deliveryTZ ?? undefined);
        } catch (e) {
          console.log("[POST_LOAD] deliveryDateLocal compute failed", e);
          return undefined;
        }
      })(),
      revenueUsd: rateNum,
    } as const;

    const refDoc = doc(db, LOADS_COLLECTION, args.id);
    const existing = await (await import("firebase/firestore")).getDoc(refDoc);
    const createOnly = existing.exists()
      ? {}
      : {
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
        console.log("[POST_LOAD] expiresAtMs compute failed", e);
        return undefined;
      }
    })();

    const loadData = {
      ...baseData,
      ...createOnly,
      createdBy: uid,
      ...(computeExpires != null ? { expiresAtMs: computeExpires } : {}),
    } as const;

    console.log("[POST_LOAD] Attempting to write to Firestore...");

    await setDoc(refDoc, loadData, { merge: true });

    console.log(
      "[POST_LOAD] Successfully wrote to Firestore:",
      `${LOADS_COLLECTION}/${args.id}`
    );
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      console.warn(
        "[POST_LOAD] Firebase permission denied - this is expected in development mode."
      );
      console.warn(
        "[POST_LOAD] Anonymous users cannot write to production Firestore. Falling back to local storage."
      );
      const { auth: authInstance } = getFirebase();
      console.log(
        "[POST_LOAD] Current user:",
        authInstance.currentUser
          ? {
              uid: authInstance.currentUser.uid,
              isAnonymous: authInstance.currentUser.isAnonymous,
              email: authInstance.currentUser.email,
            }
          : "No user"
      );
    } else if (error?.code === "unavailable") {
      console.warn(
        "[POST_LOAD] Firebase service unavailable - network or server issue. Falling back to local storage."
      );
    } else if (error?.code === "unauthenticated") {
      console.warn(
        "[POST_LOAD] User not authenticated properly. Falling back to local storage."
      );
    } else {
      console.warn(
        "[POST_LOAD] Firebase write failed:",
        error?.code || "unknown-code",
        error?.message || "Unknown error"
      );
    }

    throw error;
  }
}

// ======================
// VEHICLE HELPERS
// ======================
export type Vehicle = {
  id?: string;
  name: string;
  year: string;
  make: string;
  model: string;
  type: "truck" | "trailer";
  subtype: string;
  vin?: string;
  licensePlate?: string;
  mpg?: string;
  photos?: string[];
  primaryPhoto?: string;
  status?: "draft" | "published";
  createdBy?: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
};

// Create at drivers/{uid}/vehicles/{forcedId}
export async function createVehicleWithId(
  forcedId: string,
  data: Omit<Vehicle, "id" | "createdBy" | "userId" | "createdAt" | "updatedAt">
) {
  const { auth, db } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const ref = doc(db, "drivers", uid, "vehicles", forcedId);
  const payload = {
    ...data,
    createdBy: uid,
    userId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
  return forcedId;
}

export async function getVehicle(vehicleId: string) {
  const { auth, db } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  console.log("[getVehicle] Looking for vehicle:", {
    vehicleId,
    uid,
    path: `drivers/${uid}/vehicles/${vehicleId}`,
  });

  const ref = doc(db, "drivers", uid, "vehicles", vehicleId);
  const snap = await getDoc(ref);

  console.log("[getVehicle] Document exists in new path:", snap.exists());

  if (!snap.exists()) {
    console.log("[getVehicle] Checking old path structure...");
    try {
      const oldRef = doc(db, "vehicles", vehicleId);
      const oldSnap = await getDoc(oldRef);
      console.log("[getVehicle] Document exists in old path:", oldSnap.exists());

      if (oldSnap.exists()) {
        const oldData = oldSnap.data() as Vehicle;
        console.log("[getVehicle] Found vehicle in old path! Data:", {
          name: oldData.name,
          createdBy: oldData.createdBy,
          userId: oldData.userId,
          currentUid: uid,
        });

        if (oldData.createdBy !== uid && oldData.userId !== uid) {
          console.log(
            "[getVehicle] Vehicle belongs to different user, access denied"
          );
          throw new Error("Not found");
        }

        console.log("[getVehicle] Migrating vehicle to new path...");
        const migratedVehicle = await migrateVehicleToNewPath(vehicleId);
        return migratedVehicle;
      } else {
        console.log("[getVehicle] Vehicle not found in old path either");

        console.log("[getVehicle] Debugging - listing all user vehicles...");
        try {
          await listUserVehicles();
        } catch (listError) {
          console.log("[getVehicle] Error listing vehicles:", listError);
        }
      }
    } catch (oldError) {
      console.log("[getVehicle] Error checking old path:", oldError);
    }

    throw new Error("Not found");
  }

  const data = snap.data() as Vehicle;
  console.log("[getVehicle] Found vehicle in new path:", {
    id: snap.id,
    name: data.name,
    createdBy: data.createdBy,
    photos: data.photos?.length || 0,
  });

  return { id: snap.id, ...data };
}

export async function updateVehicle(
  vehicleId: string,
  patch: Partial<Vehicle>
) {
  const { auth, db } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const ref = doc(db, "drivers", uid, "vehicles", vehicleId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

// Debug helper to list all vehicles for current user
export async function listUserVehicles() {
  const { auth, db } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  console.log("[listUserVehicles] Listing vehicles for user:", uid);

  try {
    const newPathQuery = query(collection(db, "drivers", uid, "vehicles"));
    const newPathSnap = await getDocs(newPathQuery);
    console.log("[listUserVehicles] New path vehicles:", newPathSnap.docs.length);
    newPathSnap.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.name} (${data.make} ${data.model})`);
    });

    const oldPathQuery = query(
      collection(db, "vehicles"),
      where("createdBy", "==", uid)
    );
    const oldPathSnap = await getDocs(oldPathQuery);
    console.log("[listUserVehicles] Old path vehicles:", oldPathSnap.docs.length);
    oldPathSnap.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.name} (${data.make} ${data.model})`);
    });

    return {
      newPath: newPathSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      oldPath: oldPathSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    };
  } catch (error) {
    console.error("[listUserVehicles] Error:", error);
    throw error;
  }
}

// Migrate vehicle from old path to new path
export async function migrateVehicleToNewPath(vehicleId: string) {
  const { auth, db } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  console.log("[migrateVehicleToNewPath] Migrating vehicle:", vehicleId);

  try {
    const oldRef = doc(db, "vehicles", vehicleId);
    const oldSnap = await getDoc(oldRef);

    if (!oldSnap.exists()) {
      throw new Error("Vehicle not found in old path");
    }

    const oldData = oldSnap.data() as Vehicle;
    console.log("[migrateVehicleToNewPath] Found old vehicle:", oldData.name);

    const newRef = doc(db, "drivers", uid, "vehicles", vehicleId);
    const migratedData = {
      ...oldData,
      createdBy: uid,
      userId: uid,
      updatedAt: serverTimestamp(),
      ...(oldData.createdAt ? {} : { createdAt: serverTimestamp() }),
    };

    await setDoc(newRef, migratedData, { merge: true });
    console.log(
      "[migrateVehicleToNewPath] ✅ Vehicle migrated to new path"
    );

    return { id: vehicleId, ...migratedData };
  } catch (error) {
    console.error("[migrateVehicleToNewPath] Error:", error);
    throw error;
  }
}
