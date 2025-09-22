import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase"; // adjust path if needed

type LoadDoc = {
  createdBy: string;
  shipperId?: string;
  status: "active"|"draft"|"archived";
  createdAt: any; // Firestore Timestamp
  pickupDate?: any;
  deliveryDate?: any;
  rate: number;
  weightLbs?: number;
  equipmentType?: string;
  origin: { city: string; state?: string; zip?: string };
  destination: { city: string; state?: string; zip?: string };
  title?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

function toTsDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : Timestamp.fromDate(d);
}

function toNumber(n?: string) {
  if (!n) return 0;
  return Number(String(n).replace(/[^\d.]/g, "")) || 0;
}

export function normalizeCsvRow(row: any, uid: string): LoadDoc {
  const rate = row.rate ? toNumber(row.rate) : toNumber(row.rateTotalUSD);
  const status = (row.status || "active").toLowerCase();
  const safeStatus = ["active","draft","archived"].includes(status) ? status : "active";

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

  return {
    createdBy: uid,
    shipperId: uid,
    status: safeStatus,
    createdAt: Timestamp.now(),
    pickupDate: toTsDate(row.pickupDate),
    deliveryDate: toTsDate(row.deliveryDate),
    rate,
    weightLbs: row.weight ? toNumber(row.weight) : undefined,
    equipmentType: row.equipmentType || row.truckType || undefined,
    origin,
    destination,
    title: row.title || `${(row.equipmentType||"Load")} ${rate ? `$${rate}` : ""}`.trim(),
    description: row.description || "",
    contactName: row.contactName || "",
    contactEmail: row.contactEmail || "",
    contactPhone: row.contactPhone || "",
  };
}

// Example importer loop:
// for (const row of parsedCsvRows) {
//   const uid = auth.currentUser?.uid!;
//   const doc = normalizeCsvRow(row, uid);
//   await addDoc(collection(db, "loads"), doc);
// }