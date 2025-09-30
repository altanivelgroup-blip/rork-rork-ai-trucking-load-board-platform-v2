import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sanitizePhotoUrls } from '@/utils/photos';

export interface CreateLoadInput {
  title: string;
  pickupCity: string;
  pickupState?: string;
  pickupZip?: string;
  deliveryCity: string;
  deliveryState?: string;
  deliveryZip?: string;
  vehicleType: string;
  vehicleSubtype?: string;
  price: number;
  distance?: number;
  weight?: number;
  description?: string;
  pickupDate?: string;
  deliveryDate?: string;
  attachments?: string[];
  isBackhaul?: boolean;
  [key: string]: any;
}

export interface CreateLoadResult {
  success: boolean;
  loadId?: string;
  error?: string;
  photosFiltered?: {
    original: number;
    valid: number;
    totalBytes: number;
  };
}

const MAX_PHOTO_BYTES = 800_000;

export async function createLoad(input: CreateLoadInput): Promise<CreateLoadResult> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return { success: false, error: 'Not signed in' };
    }

    const uploaded = Array.isArray(input.attachments) ? input.attachments : [];
    const { valid, totalArraySize } = sanitizePhotoUrls(uploaded);

    if (totalArraySize > MAX_PHOTO_BYTES) {
      return {
        success: false,
        error: 'Too many or too long photo links. Please remove a few photos and try again.',
        photosFiltered: {
          original: uploaded.length,
          valid: valid.length,
          totalBytes: totalArraySize,
        },
      };
    }

    const docData = {
      title: String(input.title || '').slice(0, 120),
      pickupCity: String(input.pickupCity || ''),
      pickupState: input.pickupState ? String(input.pickupState) : undefined,
      pickupZip: input.pickupZip ? String(input.pickupZip) : undefined,
      deliveryCity: String(input.deliveryCity || ''),
      deliveryState: input.deliveryState ? String(input.deliveryState) : undefined,
      deliveryZip: input.deliveryZip ? String(input.deliveryZip) : undefined,
      vehicleType: String(input.vehicleType || ''),
      vehicleSubtype: input.vehicleSubtype ? String(input.vehicleSubtype) : undefined,
      price: Number(input.price || 0),
      distance: input.distance ? Number(input.distance) : undefined,
      weight: input.weight ? Number(input.weight) : undefined,
      description: input.description ? String(input.description).slice(0, 2000) : undefined,
      pickupDate: input.pickupDate || undefined,
      deliveryDate: input.deliveryDate || undefined,
      attachments: valid,
      isBackhaul: Boolean(input.isBackhaul),
      createdBy: uid,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    Object.keys(docData).forEach(key => {
      if (docData[key as keyof typeof docData] === undefined) {
        delete docData[key as keyof typeof docData];
      }
    });

    const docRef = await addDoc(collection(db, 'loads'), docData);

    console.log('[createLoad] Success:', {
      loadId: docRef.id,
      originalPhotos: uploaded.length,
      validPhotos: valid.length,
      totalBytes: totalArraySize,
    });

    return {
      success: true,
      loadId: docRef.id,
      photosFiltered: {
        original: uploaded.length,
        valid: valid.length,
        totalBytes: totalArraySize,
      },
    };
  } catch (error: any) {
    console.error('[createLoad] Error:', {
      code: error?.code,
      message: error?.message,
      details: error,
    });

    return {
      success: false,
      error: error?.message || 'Failed to create load',
    };
  }
}
