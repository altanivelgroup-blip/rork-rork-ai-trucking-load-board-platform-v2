import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sanitizePhotoUrls } from '@/utils/photos';

export async function createShipperLoad(payload: any): Promise<string> {
  console.log('[createShipperLoad] called');
  const user = auth.currentUser;
  if (!user) {
    console.warn('[createShipperLoad] Not signed in');
    throw new Error('Not signed in');
  }

  const attachmentsInput: string[] | undefined = Array.isArray(payload?.attachments)
    ? (payload.attachments as string[])
    : undefined;

  const { valid, totalArraySize } = sanitizePhotoUrls(attachmentsInput);
  console.log('[createShipperLoad] photos sanitized', { count: valid.length, totalArraySize });

  if (totalArraySize > 800000) {
    console.warn('[createShipperLoad] attachments too large', { totalArraySize });
    throw new Error('Photo links too large; remove a few photos.');
  }

  const uid = user.uid;

  const docData = {
    title: String(payload?.title ?? '').slice(0, 120),
    pickupCity: String(payload?.pickupCity ?? ''),
    deliveryCity: String(payload?.deliveryCity ?? ''),
    vehicleType: String(payload?.vehicleType ?? ''),
    price: Number(payload?.price ?? 0),
    attachments: valid,
    createdBy: uid,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as const;

  console.log('[createShipperLoad] docData', docData);

  const ref = await addDoc(collection(db, 'loads'), docData as any);
  console.log('[createShipperLoad] created', { id: ref.id });
  return ref.id;
}
