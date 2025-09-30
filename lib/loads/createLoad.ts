import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sanitizePhotoUrls } from '@/utils/photos';

export async function createShipperLoad(payload: any): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Not signed in');
  }

  const uploaded = Array.isArray(payload.attachments) ? payload.attachments : [];
  const { valid, totalArraySize } = sanitizePhotoUrls(uploaded);

  if (totalArraySize > 800_000) {
    throw new Error('Photo links too large; remove a few photos.');
  }

  const uid = auth.currentUser.uid;

  const docData = {
    title: String(payload.title || '').slice(0, 120),
    pickupCity: String(payload.pickupCity || ''),
    deliveryCity: String(payload.deliveryCity || ''),
    vehicleType: String(payload.vehicleType || ''),
    price: Number(payload.price || 0),
    attachments: valid,
    createdBy: uid,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'loads'), docData);
  console.log('[createShipperLoad] Created load:', docRef.id, 'with', valid.length, 'photos');
  
  return docRef.id;
}
