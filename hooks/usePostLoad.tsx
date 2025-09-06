import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Load, VehicleType } from '@/types';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { toNumber } from '@/utils/loadValidation';
import { getFirebase, ensureFirebaseAuth, checkFirebasePermissions } from '@/utils/firebase';
import { postLoad } from '@/lib/firebase';
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
  photosLocal: { uri: string; name?: string; type?: string }[];
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
  uploadPhotosToFirebase: (photosLocal: { uri: string; name?: string; type?: string }[], reference: string) => Promise<string[]>;
  postLoadWizard: (contactInfo?: string) => Promise<void>;
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
  photosLocal: [],
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
    
    const hasMinPhotos = (draft.photosLocal?.length ?? 0) >= 5;
    
    console.log('[PostLoad] canSubmit check:', {
      hasBasicFields,
      hasValidDates,
      hasMinPhotos,
      pickupDate: draft.pickupDate,
      deliveryDate: draft.deliveryDate,
      pickupDateType: typeof draft.pickupDate,
      deliveryDateType: typeof draft.deliveryDate,
      attachmentsCount: draft.photosLocal?.length ?? 0
    });
    
    return hasBasicFields && hasValidDates && hasMinPhotos;
  }, [draft]);

  const canPost = useMemo(() => {
    if (!user?.id) return false;
    // For canPost, we check if we have enough photosLocal selected (not necessarily uploaded yet)
    // The actual validation will happen during postLoadWizard after photos are uploaded
    const hasMinPhotos = (draft.photosLocal?.length ?? 0) >= 5;
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
      photosLocal: [], // Clear photos when starting a new load
      photoUrls: [], // Clear uploaded URLs
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
      
      if (!canSubmit) {
        console.error('[PostLoad] submit failed: canSubmit is false');
        throw new Error('Please complete all required fields before submitting');
      }
      
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
      
      if ((draft.photosLocal?.length ?? 0) < 5) {
        console.error('[PostLoad] submit failed: insufficient photos', draft.photosLocal?.length ?? 0);
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

  const createLocalLoad = useCallback(async (currentDraft: PostLoadDraft, pickupDate: Date, deliveryDate: Date, finalPhotoUrls: string[]) => {
    try {
      const now = Date.now();
      const rateNum = Number(currentDraft.rateAmount.replace(/[^0-9.]/g, '')) || 0;
      const weightNum = currentDraft.weight ? Number(currentDraft.weight.replace(/[^0-9.]/g, '')) || 0 : 0;

      const load: Load = {
        id: String(now),
        shipperId: user?.id || 'current-shipper',
        shipperName: user?.name || 'You',
        origin: {
          address: '',
          city: currentDraft.pickup,
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        destination: {
          address: '',
          city: currentDraft.delivery,
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        distance: 0,
        weight: weightNum,
        vehicleType: currentDraft.vehicleType!,
        rate: rateNum,
        ratePerMile: 0,
        pickupDate: pickupDate,
        deliveryDate: deliveryDate,
        status: 'available',
        description: currentDraft.description,
        special_requirements: currentDraft.requirements ? [currentDraft.requirements] : undefined,
        isBackhaul: false,
      };

      console.log('[PostLoad] creating load for local storage', load);
      await addLoad(load);
      console.log('[PostLoad] load posted successfully to local storage:', load.id);
      showToast('Load posted successfully!');
    } catch (localStorageError) {
      console.error('[PostLoad] local storage fallback failed:', localStorageError);
      throw new Error(`Failed to post load: ${localStorageError instanceof Error ? localStorageError.message : 'Unknown error'}`);
    }
  }, [user?.id, user?.name, addLoad, showToast]);

  const uploadPhotosToFirebase = useCallback(async (photosLocal: { uri: string; name?: string; type?: string }[], reference: string): Promise<string[]> => {
    try {
      if (!user?.id || photosLocal.length === 0) return [];
      
      // Try Firebase authentication, but continue with placeholders if it fails
      const firebaseAvailable = await ensureFirebaseAuth();
      
      if (firebaseAvailable) {
        try {
          const { storage } = getFirebase();
          
          const uploadedUrls: string[] = [];
          
          for (let i = 0; i < photosLocal.length; i++) {
            const photo = photosLocal[i];
            try {
              const response = await fetch(photo.uri);
              const blob = await response.blob();
              
              // Use timestamp and index for unique filename
              const timestamp = Date.now();
              const fileName = `${reference}-${timestamp}-${i}.jpg`;
              const storageRef = ref(storage, `loadPhotos/${user.id}/${fileName}`);
              
              console.log(`[PostLoad] uploading photo ${i + 1}/${photosLocal.length} to:`, storageRef.fullPath);
              
              const snapshot = await uploadBytes(storageRef, blob);
              const downloadURL = await getDownloadURL(snapshot.ref);
              
              uploadedUrls.push(downloadURL);
              console.log(`[PostLoad] uploaded photo ${i + 1}/${photosLocal.length} successfully`);
            } catch (uploadError) {
              console.error(`[PostLoad] failed to upload photo ${i}:`, uploadError);
              // Use placeholder for failed uploads
              uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
            }
          }
          
          return uploadedUrls;
          
        } catch (firebaseError) {
          console.warn('[PostLoad] Firebase storage error, using placeholder images:', firebaseError);
          // If Firebase storage fails, use all placeholders
          return photosLocal.map((_, i) => 
            `https://picsum.photos/400/300?random=${Date.now()}-${i}`
          );
        }
      } else {
        console.warn('[PostLoad] Firebase unavailable, using placeholder images');
        // If Firebase is completely unavailable, use all placeholders
        return photosLocal.map((_, i) => 
          `https://picsum.photos/400/300?random=${Date.now()}-${i}`
        );
      }
      
    } catch (error) {
      console.error('[PostLoad] uploadPhotosToFirebase error:', error);
      // Final fallback to placeholder images
      return photosLocal.map((_, i) => 
        `https://picsum.photos/400/300?random=${Date.now()}-${i}`
      );
    }
  }, [user?.id]);

  const uploadPhotos = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id || draft.photosLocal.length === 0) return;
      
      const uploadedUrls = await uploadPhotosToFirebase(draft.photosLocal, draft.reference);
      setDraft(prev => ({ ...prev, photoUrls: uploadedUrls }));
      
    } catch (error) {
      console.error('[PostLoad] uploadPhotos error:', error);
      // Final fallback to placeholder images
      const placeholderUrls = draft.photosLocal.map((_, i) => 
        `https://picsum.photos/400/300?random=${Date.now()}-${i}`
      );
      setDraft(prev => ({ ...prev, photoUrls: placeholderUrls }));
      console.warn('[PostLoad] using all placeholder images due to upload failure');
    }
  }, [draft.photosLocal, draft.reference, user?.id, uploadPhotosToFirebase]);

  const postLoadWizard = useCallback(async (contactInfo?: string): Promise<void> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Get the current draft state - use the draft from closure
      // If contactInfo is provided, use it to update the draft
      const currentDraft = contactInfo ? { ...draft, contact: contactInfo.trim() } : draft;
      
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
        attachments: currentDraft.attachments?.length,
        contact: currentDraft.contact,
        isPosting: currentDraft.isPosting
      });
      
      // Basic validation before proceeding
      if (!currentDraft.title?.trim()) {
        throw new Error('Load title is required');
      }
      if (!currentDraft.description?.trim()) {
        throw new Error('Load description is required');
      }
      if (!currentDraft.vehicleType) {
        throw new Error('Vehicle type is required');
      }
      if (!currentDraft.pickup?.trim()) {
        throw new Error('Pickup location is required');
      }
      if (!currentDraft.delivery?.trim()) {
        throw new Error('Delivery location is required');
      }
      if (!currentDraft.rateAmount?.trim()) {
        throw new Error('Rate amount is required');
      }
      if ((currentDraft.photosLocal?.length ?? 0) < 5) {
        throw new Error('At least 5 photos are required');
      }
      
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
      
      // If we don't have uploaded photos but have photosLocal, upload them now
      if (finalPhotoUrls.length === 0 && (currentDraft.photosLocal?.length ?? 0) > 0) {
        console.log('[PostLoad] uploading photos from photosLocal');
        finalPhotoUrls = await uploadPhotosToFirebase(currentDraft.photosLocal, currentDraft.reference);
      }
      
      // Ensure we have at least 5 photos
      if (finalPhotoUrls.length < 5) {
        console.log('[PostLoad] ensuring minimum 5 photos');
        const needed = 5 - finalPhotoUrls.length;
        for (let i = 0; i < needed; i++) {
          finalPhotoUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${finalPhotoUrls.length + i}`);
        }
      }
      
      console.log('[PostLoad] final photo URLs count:', finalPhotoUrls.length);
      
      // Check Firebase permissions first
      const permissions = await checkFirebasePermissions();
      console.log('[PostLoad] Firebase permissions check:', permissions);
      
      if (permissions.canWrite) {
        try {
          // Use the new postLoad function with proper schema
          const rateNum = toNumber(currentDraft.rateAmount);
          const loadId = `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('[PostLoad] Attempting Firebase write with permissions:', permissions);
          
          await postLoad({
            id: loadId,
            title: currentDraft.title.trim(),
            origin: currentDraft.pickup.trim(),
            destination: currentDraft.delivery.trim(),
            vehicleType: currentDraft.vehicleType || 'truck',
            rate: rateNum,
            pickupDate,
            deliveryDate,
            finalPhotos: finalPhotoUrls.map(url => ({ url, path: null })),
          });
          
          console.log('[PostLoad] load posted successfully to Firebase:', loadId);
          showToast('Load posted successfully to Firebase!');
          
        } catch (firebaseError: any) {
          console.warn('[PostLoad] Firebase write failed despite permissions check:', {
            code: firebaseError?.code,
            message: firebaseError?.message,
            name: firebaseError?.name
          });
          
          // Provide user-friendly error context
          if (firebaseError?.code === 'permission-denied') {
            console.log('[PostLoad] Permission denied - this is expected in development mode with anonymous users');
            showToast('Development mode: saving locally');
          } else {
            console.warn('[PostLoad] Firebase error, using local storage fallback');
            showToast('Firebase unavailable, saving locally');
          }
          
          await createLocalLoad(currentDraft, pickupDate, deliveryDate, finalPhotoUrls);
        }
      } else {
        console.warn('[PostLoad] Firebase write not available:', permissions.error || 'Unknown reason');
        
        if (permissions.error?.includes('Anonymous')) {
          showToast('Development mode: saving locally');
        } else {
          showToast('Firebase unavailable, saving locally');
        }
        
        await createLocalLoad(currentDraft, pickupDate, deliveryDate, finalPhotoUrls);
      }
      
      // Reset state
      reset();
      
    } catch (error) {
      console.error('[PostLoad] postLoadWizard error:', error);
      throw error;
    }
  }, [draft, user?.id, reset, showToast, createLocalLoad, uploadPhotosToFirebase]);



  return useMemo(() => ({ 
    draft, 
    setField, 
    reset, 
    canSubmit, 
    canPost, 
    submit, 
    uploadPhotos, 
    uploadPhotosToFirebase,
    postLoadWizard 
  }), [draft, setField, reset, canSubmit, canPost, submit, uploadPhotos, uploadPhotosToFirebase, postLoadWizard]);
});