import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getFirebase } from "@/utils/firebase";

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

  await setDoc(doc(db, "loads", id), {
    title: title.trim(),
    origin, destination, vehicleType,
    rate: Number(rate),
    status: "OPEN",                              // <-- exact casing
    createdBy: auth.currentUser!.uid,            // <-- real UID, not "demo"
    pickupDate: Timestamp.fromDate(new Date(pickupDate as any)),
    deliveryDate: Timestamp.fromDate(new Date(deliveryDate as any)),
    attachments: finalPhotos.map(p => ({ url: p.url, path: p.path ?? null })),
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),                 // <-- for instant UI sort
  }, { merge: true });

  console.log("[POST] wrote", `loads/${id}`);
}

export { postLoad };