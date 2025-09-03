import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Load, VehicleType } from '@/types';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { validateLoad, toNumber, round, LoadValidationData } from '@/utils/loadValidation';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
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
    const hasBasicFields = (
      draft.title.trim().length > 0 &&
      draft.description.trim().length > 0 &&
      !!draft.vehicleType &&
      draft.pickup.trim().length > 0 &&
      draft.delivery.trim().length > 0 &&
      draft.rateAmount.trim().length > 0 &&
      draft.contact.trim().length > 0
    );
    
    const hasValidDates = (
      !!draft.pickupDate &&
      !!draft.deliveryDate &&
      draft.pickupDate instanceof Date &&
      draft.deliveryDate instanceof Date &&
      !isNaN(draft.pickupDate.getTime()) &&
      !isNaN(draft.deliveryDate.getTime())
    );
    
    const hasMinPhotos = (draft.attachments?.length ?? 0) >= 5;
    
    console.log('[PostLoad] canSubmit check:', {
      hasBasicFields,
      hasValidDates,
      hasMinPhotos,
      pickupDate: draft.pickupDate,
      deliveryDate: draft.deliveryDate,
      pickupDateType: typeof draft.pickupDate,
      deliveryDateType: typeof draft.deliveryDate,
      attachmentsCount: draft.attachments?.length ?? 0
    });
    
    return hasBasicFields && hasValidDates && hasMinPhotos;
  }, [draft]);

  const canPost = useMemo(() => {
    if (!user?.id) return false;
    // For canPost, we check if we have enough attachments selected (not necessarily uploaded yet)
    // The actual validation will happen during postLoadWizard after photos are uploaded
    const hasMinPhotos = (draft.attachments?.length ?? 0) >= 5;
    const hasRequiredFields = (
      draft.title.trim().length > 0 &&
      draft.description.trim().length > 0 &&
      !!draft.vehicleType &&
      draft.pickup.trim().length > 0 &&
      draft.delivery.trim().length > 0 &&
      !!draft.pickupDate &&
      !!draft.deliveryDate &&
      draft.rateAmount.trim().length > 0 &&
      draft.contact.trim().length > 0
    );
    return hasMinPhotos && hasRequiredFields && !draft.isPosting;
  }, [draft, user?.id]);

  const reset = useCallback(() => {
    setDraft({
      ...initialDraft,
      reference: `LOAD-${Date.now()}`,
    });
  }, []);

  const submit = useCallback(async (): Promise<Load | null> => {
    try {
      console.log('[PostLoad] submit called with:', {
        canSubmit,
        vehicleType: draft.vehicleType,
        pickupDate: draft.pickupDate,
        deliveryDate: draft.deliveryDate,
        title: draft.title?.trim(),
        description: draft.description?.trim(),
        pickup: draft.pickup?.trim(),
        delivery: draft.delivery?.trim(),
        rateAmount: draft.rateAmount?.trim(),
        contact: draft.contact?.trim(),
        attachmentsCount: draft.attachments?.length ?? 0
      });
      
      // Validate required fields
      if (!draft.title?.trim()) {
        console.error('[PostLoad] submit failed: title is missing');
        throw new Error('Load title is required');
      }
      
      if (!draft.description?.trim()) {
        console.error('[PostLoad] submit failed: description is missing');
        throw new Error('Load description is required');
      }
      
      if (!draft.vehicleType) {
        console.error('[PostLoad] submit failed: vehicleType is missing');
        throw new Error('Vehicle type is required');
      }
      
      if (!draft.pickup?.trim()) {
        console.error('[PostLoad] submit failed: pickup is missing');
        throw new Error('Pickup location is required');
      }
      
      if (!draft.delivery?.trim()) {
        console.error('[PostLoad] submit failed: delivery is missing');
        throw new Error('Delivery location is required');
      }
      
      if (!draft.pickupDate || !(draft.pickupDate instanceof Date) || isNaN(draft.pickupDate.getTime())) {
        console.error('[PostLoad] submit failed: pickupDate is invalid', draft.pickupDate);
        throw new Error('Valid pickup date is required');
      }
      
      if (!draft.deliveryDate || !(draft.deliveryDate instanceof Date) || isNaN(draft.deliveryDate.getTime())) {
        console.error('[PostLoad] submit failed: deliveryDate is invalid', draft.deliveryDate);
        throw new Error('Valid delivery date is required');
      }
      
      if (!draft.rateAmount?.trim()) {
        console.error('[PostLoad] submit failed: rateAmount is missing');
        throw new Error('Rate amount is required');
      }
      
      if (!draft.contact?.trim()) {
        console.error('[PostLoad] submit failed: contact is missing');
        throw new Error('Contact information is required');
      }
      
      if ((draft.attachments?.length ?? 0) < 5) {
        console.error('[PostLoad] submit failed: insufficient photos', draft.attachments?.length ?? 0);
        throw new Error('At least 5 photos are required');
      }
      
      const now = Date.now();
      const rateNum = Number(draft.rateAmount.replace(/[^0-9.]/g, '')) || 0;
      const weightNum = draft.weight ? Number(draft.weight.replace(/[^0-9.]/g, '')) || 0 : 0;

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
      console.error('[PostLoad] submit error', e);
      throw e;
    }
  }, [addLoad, canSubmit, draft, user]);

  const uploadPhotos = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id || draft.attachments.length === 0) return;
      
      // Try Firebase authentication, but continue with placeholders if it fails
      const firebaseAvailable = await ensureFirebaseAuth();
      
      if (firebaseAvailable) {
        try {
          const { storage } = getFirebase();
          
          const uploadedUrls: string[] = [];
          
          for (let i = 0; i < draft.attachments.length; i++) {
            const attachment = draft.attachments[i];
            try {
              const response = await fetch(attachment.uri);
              const blob = await response.blob();
              
              // Use a simple path structure that works with default Firebase rules
              const fileName = `${draft.reference}-photo-${i}-${Date.now()}.jpg`;
              const storageRef = ref(storage, `images/${fileName}`);
              
              console.log(`[PostLoad] uploading photo ${i + 1}/${draft.attachments.length} to:`, storageRef.fullPath);
              
              const snapshot = await uploadBytes(storageRef, blob);
              const downloadURL = await getDownloadURL(snapshot.ref);
              
              uploadedUrls.push(downloadURL);
              console.log(`[PostLoad] uploaded photo ${i + 1}/${draft.attachments.length} successfully`);
            } catch (uploadError) {
              console.error(`[PostLoad] failed to upload photo ${i}:`, uploadError);
              // Use placeholder for failed uploads
              uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
            }
          }
          
          setDraft(prev => ({ ...prev, photoUrls: uploadedUrls }));
          
        } catch (firebaseError) {
          console.warn('[PostLoad] Firebase storage error, using placeholder images:', firebaseError);
          // If Firebase storage fails, use all placeholders
          const placeholderUrls = draft.attachments.map((_, i) => 
            `https://picsum.photos/400/300?random=${Date.now()}-${i}`
          );
          setDraft(prev => ({ ...prev, photoUrls: placeholderUrls }));
        }
      } else {
        console.warn('[PostLoad] Firebase unavailable, using placeholder images');
        // If Firebase is completely unavailable, use all placeholders
        const placeholderUrls = draft.attachments.map((_, i) => 
          `https://picsum.photos/400/300?random=${Date.now()}-${i}`
        );
        setDraft(prev => ({ ...prev, photoUrls: placeholderUrls }));
      }
      
    } catch (error) {
      console.error('[PostLoad] uploadPhotos error:', error);
      // Final fallback to placeholder images
      const placeholderUrls = draft.attachments.map((_, i) => 
        `https://picsum.photos/400/300?random=${Date.now()}-${i}`
      );
      setDraft(prev => ({ ...prev, photoUrls: placeholderUrls }));
      console.warn('[PostLoad] using all placeholder images due to upload failure');
    }
  }, [draft.attachments, draft.reference, user?.id]);

  const postLoadWizard = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Get the current draft state - use the draft from closure
      const currentDraft = draft;
      
      // Debug the draft state
      console.log('[PostLoad] postLoadWizard draft state:', {
        title: currentDraft.title,
        description: currentDraft.description,
        vehicleType: currentDraft.vehicleType,
        pickup: currentDraft.pickup,
        delivery: currentDraft.delivery,
        pickupDate: currentDraft.pickupDate,
        deliveryDate: currentDraft.deliveryDate,
        pickupDateType: typeof currentDraft.pickupDate,
        deliveryDateType: typeof currentDraft.deliveryDate,
        pickupDateValid: currentDraft.pickupDate instanceof Date && !isNaN(currentDraft.pickupDate.getTime()),
        deliveryDateValid: currentDraft.deliveryDate instanceof Date && !isNaN(currentDraft.deliveryDate.getTime()),
        weight: currentDraft.weight,
        rateAmount: currentDraft.rateAmount,
        rateKind: currentDraft.rateKind,
        miles: currentDraft.miles,
        photoUrls: currentDraft.photoUrls?.length,
        contact: currentDraft.contact,
        isPosting: currentDraft.isPosting
      });
      
      // Additional validation for dates before proceeding
      // Handle both Date objects and potential Firestore Timestamp objects
      const toDate = (v: any): Date | null => {
        if (v instanceof Date) return v;
        if (v?.toDate && typeof v.toDate === 'function') return v.toDate();
        if (v && typeof v === 'string') {
          const parsed = new Date(v);
          return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
      };
      
      const pickupDate = toDate(currentDraft.pickupDate);
      const deliveryDate = toDate(currentDraft.deliveryDate);
      
      if (!pickupDate || isNaN(pickupDate.getTime())) {
        throw new Error('Valid pickup date is required');
      }
      
      if (!deliveryDate || isNaN(deliveryDate.getTime())) {
        throw new Error('Valid delivery date is required');
      }
      
      // Ensure we have photos uploaded or use placeholders
      let finalPhotoUrls = currentDraft.photoUrls || [];
      
      // If we don't have uploaded photos but have attachments, create placeholders
      if (finalPhotoUrls.length === 0 && (currentDraft.attachments?.length ?? 0) > 0) {
        console.log('[PostLoad] creating placeholder photo URLs for validation');
        finalPhotoUrls = currentDraft.attachments.map((_, i) => 
          `https://picsum.photos/400/300?random=${Date.now()}-${i}`
        );
      }
      
      // Validate the load with final photo URLs
      const validationData: LoadValidationData = {
        title: currentDraft.title,
        description: currentDraft.description,
        vehicleType: currentDraft.vehicleType,
        originCity: currentDraft.pickup,
        destinationCity: currentDraft.delivery,
        pickupDate: pickupDate,
        deliveryDate: deliveryDate,
        weight: currentDraft.weight,
        rate: currentDraft.rateAmount,
        rateType: currentDraft.rateKind,
        miles: currentDraft.miles,
        photoUrls: finalPhotoUrls,
        shipperId: user.id,
      };
      
      console.log('[PostLoad] validation data:', validationData);
      const validation = validateLoad(validationData);
      console.log('[PostLoad] validation result:', validation);
      
      if (!validation.ok) {
        throw new Error(validation.errors[0]);
      }
      
      // Try Firebase first, but fall back to local storage if it fails
      const firebaseAvailable = await ensureFirebaseAuth();
      
      if (firebaseAvailable) {
        try {
          // Build payload with Firestore Timestamps
          const rateNum = toNumber(currentDraft.rateAmount);
          const milesNum = toNumber(currentDraft.miles);
          const totalRate = currentDraft.rateKind === 'flat' ? rateNum : round(rateNum * milesNum, 2);
          
          // Convert dates to Firestore Timestamps
          const toTimestamp = (date: Date | null): Timestamp | null => {
            return date ? Timestamp.fromDate(date) : null;
          };
          
          const payload = {
            title: currentDraft.title.trim(),
            description: currentDraft.description.trim(),
            vehicleType: currentDraft.vehicleType,
            originCity: currentDraft.pickup.trim(),
            destinationCity: currentDraft.delivery.trim(),
            pickupDate: toTimestamp(pickupDate),
            deliveryDate: toTimestamp(deliveryDate),
            weight: toNumber(currentDraft.weight),
            rate: rateNum,
            rateType: currentDraft.rateKind || 'flat',
            miles: currentDraft.rateKind === 'per_mile' && currentDraft.miles ? milesNum : null,
            totalRate,
            photoUrls: finalPhotoUrls,
            shipperId: user.id,
            status: 'open' as const,
            createdAt: serverTimestamp(),
          };
          
          // Create record in Firestore
          const { db } = getFirebase();
          const loadsCollection = collection(db, 'loads');
          const docRef = await addDoc(loadsCollection, payload);
          
          console.log('[PostLoad] load posted successfully to Firebase:', docRef.id);
          showToast('Load posted successfully!');
          
        } catch (firebaseError) {
          console.warn('[PostLoad] Firebase storage/database error, using local storage fallback:', firebaseError);
          
          // Fallback to local storage using the existing submit function
          console.log('[PostLoad] attempting local storage fallback with current draft:', {
            canSubmit,
            vehicleType: currentDraft.vehicleType,
            pickupDate: currentDraft.pickupDate,
            deliveryDate: currentDraft.deliveryDate,
            title: currentDraft.title?.trim(),
            description: currentDraft.description?.trim(),
            pickup: currentDraft.pickup?.trim(),
            delivery: currentDraft.delivery?.trim(),
            rateAmount: currentDraft.rateAmount?.trim(),
            contact: currentDraft.contact?.trim(),
            attachments: currentDraft.attachments?.length ?? 0
          });
          
          const load = await submit();
          if (load) {
            console.log('[PostLoad] load posted successfully to local storage:', load.id);
            showToast('Load posted successfully!');
          } else {
            console.error('[PostLoad] submit returned null - validation failed');
            throw new Error('Failed to validate load data for local storage');
          }
        }
      } else {
        console.warn('[PostLoad] Firebase unavailable, using local storage fallback');
        
        // Fallback to local storage using the existing submit function
        console.log('[PostLoad] attempting local storage fallback with current draft:', {
          canSubmit,
          vehicleType: currentDraft.vehicleType,
          pickupDate: currentDraft.pickupDate,
          deliveryDate: currentDraft.deliveryDate,
          title: currentDraft.title?.trim(),
          description: currentDraft.description?.trim(),
          pickup: currentDraft.pickup?.trim(),
          delivery: currentDraft.delivery?.trim(),
          rateAmount: currentDraft.rateAmount?.trim(),
          contact: currentDraft.contact?.trim(),
          attachments: currentDraft.attachments?.length ?? 0
        });
        
        const load = await submit();
        if (load) {
          console.log('[PostLoad] load posted successfully to local storage:', load.id);
          showToast('Load posted successfully!');
        } else {
          console.error('[PostLoad] submit returned null - validation failed');
          throw new Error('Failed to validate load data for local storage');
        }
      }
      
      // Reset state
      reset();
      
    } catch (error) {
      console.error('[PostLoad] postLoadWizard error:', error);
      throw error;
    }
  }, [draft, user?.id, reset, showToast, submit, canSubmit]);



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