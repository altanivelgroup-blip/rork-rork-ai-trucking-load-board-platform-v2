import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

type LoadDoc = {
  createdBy: string;
  shipperId?: string;
  status: "active" | "draft" | "archived";
  createdAt: any;
  pickupDate?: any;
  deliveryDate?: any;
  rate: number;
  weightLbs?: number | null;
  equipmentType?: string | null;
  origin: { city: string; state?: string; zip?: string };
  destination: { city: string; state?: string; zip?: string };
  title?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

function toTsDate(s?: string | null): Timestamp | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

function toNumber(n?: string | number | null): number {
  if (n == null) return 0;
  return Number(String(n).replace(/[^\d.]/g, "")) || 0;
}

function pruneUndefinedDeep<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => (typeof v === "object" && v !== null ? pruneUndefinedDeep(v as any) : v)) as unknown as T;
  }
  if (typeof obj === "object" && obj !== null) {
    const out: Record<string, any> = {};
    Object.keys(obj as Record<string, any>).forEach((k) => {
      const v = (obj as Record<string, any>)[k];
      if (v === undefined) return;
      if (typeof v === "object" && v !== null) {
        const pruned = pruneUndefinedDeep(v);
        out[k] = pruned;
      } else {
        out[k] = v;
      }
    });
    return out as T;
  }
  return obj;
}

export function normalizeCsvRow(row: any, uid: string): LoadDoc {
  const rate = row.rate ? toNumber(row.rate) : toNumber(row.rateTotalUSD);
  const status = (row.status || "active").toLowerCase();
  const safeStatus = ["active", "draft", "archived"].includes(status) ? status : "active";

  const origin = {
    city: row.originCity || row.pickupCity || "",
    state: row.originState || row.pickupState || "",
    zip: row.originZip || row.pickupZip || "",
  };
  const destination = {
    city: row.destCity || row.dropoffCity || "",
    state: row.destState || row.dropoffState || "",
    zip: row.destZip || row.dropoffZip || "",
  };

  const doc: LoadDoc = {
    createdBy: uid,
    shipperId: uid,
    status: safeStatus,
    createdAt: Timestamp.now(),
    pickupDate: toTsDate(row.pickupDate) ?? undefined,
    deliveryDate: toTsDate(row.deliveryDate) ?? undefined,
    rate,
    weightLbs: row.weight != null && row.weight !== '' ? toNumber(row.weight) : null,
    equipmentType: row.equipmentType || row.truckType || null,
    origin,
    destination,
    title: (row.title as string) || `${(row.equipmentType || "Load")} ${rate ? `${rate}` : ""}`.trim(),
    description: row.description || "",
    contactName: row.contactName || "",
    contactEmail: row.contactEmail || "",
    contactPhone: row.contactPhone || "",
  };

  return pruneUndefinedDeep(doc);
}

// Example importer loop:
// for (const row of parsedCsvRows) {
//   const uid = auth.currentUser?.uid!;
//   const doc = normalizeCsvRow(row, uid);
//   await addDoc(collection(db, "loads"), doc);
// }