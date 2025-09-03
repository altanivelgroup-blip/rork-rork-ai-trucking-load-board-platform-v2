import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getFirebase } from "@/utils/firebase";
import { LOADS_COLLECTION, LOAD_STATUS } from "@/lib/loadSchema";

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
  const { auth, db } = getFirebase();
  const uid = auth.currentUser!.uid;

  await setDoc(doc(db, LOADS_COLLECTION, id), {
    title: title.trim(),
    origin,
    destination,
    vehicleType,
    rate: Number(rate),
    status: LOAD_STATUS.OPEN,                 // <- EXACT value list screen expects
    createdBy: uid,                           // <- tie to real user, not "demo"
    pickupDate: Timestamp.fromDate(pickupDate),
    deliveryDate: Timestamp.fromDate(deliveryDate),
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),              // <- instant sort in UI
    attachments: finalPhotos.map(p => ({ url: p.url, path: p.path ?? null })),
  }, { merge: true });

  console.log("[POST] wrote", `${LOADS_COLLECTION}/${id}`);
}

export { postLoad };