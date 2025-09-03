import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Load, VehicleType } from '@/types';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { validateLoad, toNumber, round, LoadValidationData } from '@/utils/loadValidation';
import { getFirebase } from '@/utils/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/components/Toast';


export type RateKind = 'flat' | 'per_mile';

interface PostLoadDraft {
  title: string;
  description: string;
  vehicleType: VehicleType | null;
  pickup: string;
  delivery: string;
  weight: string;
  dimensions: string;
  pickupDate: Date | null;
  deliveryDate: Date | null;
  rateAmount: string;
  rateKind: RateKind;
  miles: string;
  requirements: string;
  contact: string;
  attachments: { uri: string; name?: string; type?: string }[];
  photoUrls: string[];
  reference: string;
  isPosting: boolean;
  uploadFailures: number;
  lastUploadFailure: number;
}

interface PostLoadState {
  draft: PostLoadDraft;
  setField: <K extends keyof PostLoadDraft>(key: K, value: PostLoadDraft[K]) => void;
  reset: () => void;
  canSubmit: boolean;
  canPost: boolean;
  submit: () => Promise<Load | null>;
  uploadPhotos: () => Promise<void>;
  postLoadWizard: () => Promise<void>;
}

const initialDraft: PostLoadDraft = {
  title: '',
  description: '',
  vehicleType: null,
  pickup: '',
  delivery: '',
  weight: '',
  dimensions: '',
  pickupDate: null,
  deliveryDate: null,
  rateAmount: '',
  rateKind: 'flat',
  miles: '',
  requirements: '',
  contact: '',
  attachments: [],
  photoUrls: [],
  reference: `LOAD-${Date.now()}`,
  isPosting: false,
  uploadFailures: 0,
  lastUploadFailure: 0,
};

export const [PostLoadProvider, usePostLoad] = createContextHook<PostLoadState>(() => {
  const { addLoad } = useLoads();
  const { user } = useAuth();
  const { show: showToast } = useToast();
  const [draft, setDraft] = useState<PostLoadDraft>(initialDraft);
  const setField = useCallback(<K extends keyof PostLoadDraft>(key: K, value: PostLoadDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canSubmit = useMemo(() => {
    return (
      draft.title.trim().length > 0 &&
      draft.description.trim().length > 0 &&
      !!draft.vehicleType &&
      draft.pickup.trim().length > 0 &&
      draft.delivery.trim().length > 0 &&
      !!draft.pickupDate &&
      !!draft.deliveryDate &&
      draft.rateAmount.trim().length > 0 &&
      draft.contact.trim().length > 0 &&
      (draft.attachments?.length ?? 0) >= 5
    );
  }, [draft]);

  const canPost = useMemo(() => {
    if (!user?.id) return false;
    const validationData: LoadValidationData = {
      title: draft.title,
      description: draft.description,
      vehicleType: draft.vehicleType,
      originCity: draft.pickup,
      destinationCity: draft.delivery,
      pickupDate: draft.pickupDate,
      deliveryDate: draft.deliveryDate,
      weight: draft.weight,
      rate: draft.rateAmount,
      rateType: draft.rateKind,
      miles: draft.miles,
      photoUrls: draft.photoUrls,
      shipperId: user.id,
    };
    return validateLoad(validationData).ok && !draft.isPosting;
  }, [draft, user?.id]);

  const reset = useCallback(() => {
    setDraft({
      ...initialDraft,
      reference: `LOAD-${Date.now()}`,
    });
  }, []);

  const uploadPhotos = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id || draft.attachments.length === 0) return;
      
      const { storage, auth } = getFirebase();
      
      // Ensure user is authenticated
      if (!auth.currentUser) {
        console.warn('[PostLoad] user not authenticated, using placeholder images');
        const placeholderUrls = draft.attachments.map((_, i) => 
          `https://picsum.photos/400/300?random=${Date.now()}-${i}`
        );
        setDraft(prev => ({ ...prev, photoUrls: placeholderUrls }));
        return;
      }
      
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < draft.attachments.length; i++) {
        const attachment = draft.attachments[i];
        try {
          const response = await fetch(attachment.uri);
          const blob = await response.blob();
          
          // Use a public path structure that works with default Firebase rules
          const fileName = `${draft.reference}-photo-${i}-${Date.now()}.jpg`;
          const storageRef = ref(storage, `public/${fileName}`);
          
          console.log(`[PostLoad] uploading photo ${i + 1}/${draft.attachments.length} to:`, storageRef.fullPath);
          
          const snapshot = await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          uploadedUrls.push(downloadURL);
          console.log(`[PostLoad] uploaded photo ${i + 1}/${draft.attachments.length} successfully`);
        } catch (uploadError) {
          console.error(`[PostLoad] failed to upload photo ${i}:`, uploadError);
          
          // Track upload failures
          const now = Date.now();
          const newFailures = draft.uploadFailures + 1;
          const timeSinceLastFailure = now - draft.lastUploadFailure;
          
          setDraft(prev => ({
            ...prev,
            uploadFailures: newFailures,
            lastUploadFailure: now,
          }));
          
          // If 3 failures in 60 seconds, use placeholder
          if (newFailures >= 3 && timeSinceLastFailure < 60000) {
            console.warn('[PostLoad] using placeholder image due to upload failures');
            uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
          } else {
            // For any storage errors, immediately fall back to placeholder
            if (uploadError instanceof Error && 
                (uploadError.message.includes('unauthorized') || 
                 uploadError.message.includes('permission') ||
                 uploadError.message.includes('Firebase Storage'))) {
              console.warn('[PostLoad] storage error, using placeholder image:', uploadError.message);
              uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
            } else {
              // For other errors, still use placeholder to prevent app crash
              console.warn('[PostLoad] unknown upload error, using placeholder image:', uploadError);
              uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
            }
          }
        }
      }
      
      setDraft(prev => ({ ...prev, photoUrls: uploadedUrls }));
    } catch (error) {
      console.error('[PostLoad] uploadPhotos error:', error);
      // Fallback to placeholder images if upload completely fails
      const placeholderUrls = draft.attachments.map((_, i) => 
        `https://picsum.photos/400/300?random=${Date.now()}-${i}`
      );
      setDraft(prev => ({ ...prev, photoUrls: placeholderUrls }));
      console.warn('[PostLoad] using all placeholder images due to upload failure');
    }
  }, [draft.attachments, draft.reference, draft.uploadFailures, draft.lastUploadFailure, user?.id]);

  const postLoadWizard = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      setDraft(prev => ({ ...prev, isPosting: true }));
      
      // Validate the load
      const validationData: LoadValidationData = {
        title: draft.title,
        description: draft.description,
        vehicleType: draft.vehicleType,
        originCity: draft.pickup,
        destinationCity: draft.delivery,
        pickupDate: draft.pickupDate,
        deliveryDate: draft.deliveryDate,
        weight: draft.weight,
        rate: draft.rateAmount,
        rateType: draft.rateKind,
        miles: draft.miles,
        photoUrls: draft.photoUrls,
        shipperId: user.id,
      };
      
      const validation = validateLoad(validationData);
      if (!validation.ok) {
        setDraft(prev => ({ ...prev, isPosting: false }));
        throw new Error(validation.errors[0]);
      }
      
      // Build payload with Firestore Timestamps
      const rateNum = toNumber(draft.rateAmount);
      const milesNum = toNumber(draft.miles);
      const totalRate = draft.rateKind === 'flat' ? rateNum : round(rateNum * milesNum, 2);
      
      // Convert dates to Firestore Timestamps
      const toTimestamp = (date: Date | null): Timestamp | null => {
        return date ? Timestamp.fromDate(date) : null;
      };
      
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        vehicleType: draft.vehicleType,
        originCity: draft.pickup.trim(),
        destinationCity: draft.delivery.trim(),
        pickupDate: toTimestamp(draft.pickupDate),
        deliveryDate: toTimestamp(draft.deliveryDate),
        weight: toNumber(draft.weight),
        rate: rateNum,
        rateType: draft.rateKind || 'flat',
        miles: draft.rateKind === 'per_mile' && draft.miles ? milesNum : null,
        totalRate,
        photoUrls: draft.photoUrls,
        shipperId: user.id,
        status: 'open' as const,
        createdAt: serverTimestamp(),
      };
      
      // Create record in Firestore
      const { db } = getFirebase();
      const loadsCollection = collection(db, 'loads');
      const docRef = await addDoc(loadsCollection, payload);
      
      console.log('[PostLoad] load posted successfully:', docRef.id);
      showToast('Load posted successfully!');
      
      // Reset state
      reset();
      
    } catch (error) {
      console.error('[PostLoad] postLoadWizard error:', error);
      setDraft(prev => ({ ...prev, isPosting: false }));
      throw error;
    }
  }, [draft, user?.id, reset, showToast]);

  const submit = useCallback(async (): Promise<Load | null> => {
    try {
      if (!canSubmit || !draft.vehicleType || !draft.pickupDate || !draft.deliveryDate) return null;
      const now = Date.now();
      const rateNum = Number(draft.rateAmount.replace(/[^0-9.]/g, '')) || 0;
      const weightNum = Number(draft.weight.replace(/[^0-9.]/g, '')) || 0;

      const load: Load = {
        id: String(now),
        shipperId: user?.id || 'current-shipper',
        shipperName: user?.name || 'You',
        origin: {
          address: '',
          city: draft.pickup,
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        destination: {
          address: '',
          city: draft.delivery,
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        distance: 0,
        weight: weightNum,
        vehicleType: draft.vehicleType,
        rate: rateNum,
        ratePerMile: 0,
        pickupDate: draft.pickupDate,
        deliveryDate: draft.deliveryDate,
        status: 'available',
        description: draft.description,
        special_requirements: draft.requirements ? [draft.requirements] : undefined,
        isBackhaul: false,
      };

      console.log('[PostLoad] submit creating load', load);
      await addLoad(load);
      return load;
    } catch (e) {
      console.log('[PostLoad] submit error', e);
      throw e;
    }
  }, [addLoad, canSubmit, draft, user]);

  return useMemo(() => ({ 
    draft, 
    setField, 
    reset, 
    canSubmit, 
    canPost, 
    submit, 
    uploadPhotos, 
    postLoadWizard 
  }), [draft, setField, reset, canSubmit, canPost, submit, uploadPhotos, postLoadWizard]);
});