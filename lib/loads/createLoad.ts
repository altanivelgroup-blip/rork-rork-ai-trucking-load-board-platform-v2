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

    const now = Date.now();
    const pickupDateStr = input.pickupDate || new Date(now + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deliveryDateStr = input.deliveryDate || new Date(now + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    const docData = {
      title: String(input.title || '').slice(0, 120),
      origin: {
        city: String(input.pickupCity || ''),
        state: input.pickupState ? String(input.pickupState) : '',
        zipCode: input.pickupZip ? String(input.pickupZip) : '',
      },
      destination: {
        city: String(input.deliveryCity || ''),
        state: input.deliveryState ? String(input.deliveryState) : '',
        zipCode: input.deliveryZip ? String(input.deliveryZip) : '',
      },
      originCity: String(input.pickupCity || ''),
      originState: input.pickupState ? String(input.pickupState) : '',
      originZip: input.pickupZip ? String(input.pickupZip) : '',
      destCity: String(input.deliveryCity || ''),
      destState: input.deliveryState ? String(input.deliveryState) : '',
      destZip: input.deliveryZip ? String(input.deliveryZip) : '',
      vehicleType: String(input.vehicleType || ''),
      equipmentType: String(input.vehicleType || ''),
      vehicleSubtype: input.vehicleSubtype ? String(input.vehicleSubtype) : undefined,
      rate: Number(input.price || 0),
      rateTotalUSD: Number(input.price || 0),
      distance: input.distance ? Number(input.distance) : 0,
      distanceMi: input.distance ? Number(input.distance) : 0,
      weight: input.weight ? Number(input.weight) : 0,
      weightLbs: input.weight ? Number(input.weight) : 0,
      description: input.description ? String(input.description).slice(0, 2000) : '',
      pickupDate: pickupDateStr,
      deliveryDate: deliveryDateStr,
      deliveryDateLocal: `${deliveryDateStr}T00:00`,
      attachments: valid,
      isBackhaul: Boolean(input.isBackhaul),
      createdBy: uid,
      status: 'OPEN',
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      clientCreatedAt: now,
      expiresAtMs: now + 7 * 24 * 60 * 60 * 1000,
    };

    Object.keys(docData).forEach(key => {
      if (docData[key as keyof typeof docData] === undefined) {
        delete docData[key as keyof typeof docData];
      }
    });

    console.log('[createLoad] Creating load with data:', {
      title: docData.title,
      origin: docData.origin,
      destination: docData.destination,
      status: docData.status,
      createdBy: docData.createdBy,
    });

    const docRef = await addDoc(collection(db, 'loads'), docData);

    console.log('[createLoad] ✅ SUCCESS - Load created and posted to live board:', {
      loadId: docRef.id,
      title: docData.title,
      status: docData.status,
      originalPhotos: uploaded.length,
      validPhotos: valid.length,
      totalBytes: totalArraySize,
    });
    console.log('[createLoad] ✅ Load will be visible on loads page via real-time listener');

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
    console.error('[createLoad] ❌ ERROR:', {
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
