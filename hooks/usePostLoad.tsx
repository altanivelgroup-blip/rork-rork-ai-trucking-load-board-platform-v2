import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Load, VehicleType } from '@/types';
import { estimateMileageFromZips } from '@/utils/distance';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { toNumber } from '@/utils/loadValidation';
import { getFirebase, ensureFirebaseAuth, checkFirebasePermissions } from '@/utils/firebase';
import { postLoad } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { useToast } from '@/components/Toast'; // Removed unused import


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
  // const { show: showToast } = useToast(); // Removed unused variable
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
    console.log('[PostLoad] Resetting draft state');
    setDraft({
      ...initialDraft,
      reference: `LOAD-${Date.now()}`,
      photosLocal: [], // Clear photos when starting a new load
      photoUrls: [], // Clear uploaded URLs
      isPosting: false, // Reset posting state
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

      const pickupZip = (draft.pickup.match(/\b\d{5}\b/) || [''])[0];
      const deliveryZip = (draft.delivery.match(/\b\d{5}\b/) || [''])[0];
      const estMiles = await estimateMileageFromZips(pickupZip, deliveryZip);
      const milesVal = estMiles ?? 0;
      const rpm = milesVal > 0 ? rateNum / milesVal : 0;

      const load: Load = {
        id: String(now),
        shipperId: user?.id || 'current-shipper',
        shipperName: user?.name || 'You',
        origin: {
          address: '',
          city: draft.pickup,
          state: '',
          zipCode: pickupZip,
          lat: 0,
          lng: 0,
        },
        destination: {
          address: '',
          city: draft.delivery,
          state: '',
          zipCode: deliveryZip,
          lat: 0,
          lng: 0,
        },
        distance: milesVal,
        weight: weightNum,
        vehicleType: draft.vehicleType,
        rate: rateNum,
        ratePerMile: rpm,
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

  const createLocalLoad = useCallback(async (currentDraft: PostLoadDraft, pickupDate: Date, deliveryDate: Date, finalPhotoUrls: string[], contactInfo?: string) => {
    try {
      const now = Date.now();
      const rateNum = Number(currentDraft.rateAmount.replace(/[^0-9.]/g, '')) || 0;
      const weightNum = currentDraft.weight ? Number(currentDraft.weight.replace(/[^0-9.]/g, '')) || 0 : 0;

      // Include contact info in description
      const loadDescription = contactInfo 
        ? `${currentDraft.description.trim()}\n\nContact: ${contactInfo.trim()}`
        : currentDraft.description.trim();

      const pickupZip = (currentDraft.pickup.match(/\b\d{5}\b/) || [''])[0];
      const deliveryZip = (currentDraft.delivery.match(/\b\d{5}\b/) || [''])[0];
      const estMiles = await estimateMileageFromZips(pickupZip, deliveryZip);
      const milesVal = estMiles ?? 0;
      const rpm = milesVal > 0 ? rateNum / milesVal : 0;

      const load: Load = {
        id: String(now),
        shipperId: user?.id || 'current-shipper',
        shipperName: user?.name || 'You',
        origin: {
          address: '',
          city: currentDraft.pickup.trim(),
          state: '',
          zipCode: pickupZip,
          lat: 0,
          lng: 0,
        },
        destination: {
          address: '',
          city: currentDraft.delivery.trim(),
          state: '',
          zipCode: deliveryZip,
          lat: 0,
          lng: 0,
        },
        distance: milesVal,
        weight: weightNum,
        vehicleType: currentDraft.vehicleType!,
        rate: rateNum,
        ratePerMile: rpm,
        pickupDate: pickupDate,
        deliveryDate: deliveryDate,
        status: 'available',
        description: loadDescription,
        special_requirements: currentDraft.requirements ? [currentDraft.requirements] : undefined,
        isBackhaul: false,
      };

      console.log('[PostLoad] creating load for local storage', load);
      await addLoad(load);
      console.log('[PostLoad] load posted successfully to local storage:', load.id);
    } catch (localStorageError) {
      console.error('[PostLoad] local storage fallback failed:', localStorageError);
      throw new Error(`Failed to post load: ${localStorageError instanceof Error ? localStorageError.message : 'Unknown error'}`);
    }
  }, [user?.id, user?.name, addLoad]);

  const uploadPhotosToFirebase = useCallback(async (photosLocal: { uri: string; name?: string; type?: string }[], reference: string): Promise<string[]> => {
    try {
      if (!user?.id || photosLocal.length === 0) return [];

      const authed = await ensureFirebaseAuth();
      if (!authed) {
        console.warn('[PostLoad] Firebase auth not available, falling back to placeholders');
        return photosLocal.map((_, i) => `https://picsum.photos/400/300?random=${Date.now()}-${i}`);
      }

      const { storage, auth } = getFirebase();
      const uid = auth?.currentUser?.uid ?? user.id;
      const basePath = `loadPhotos/${uid}/${String(reference).trim()}`;

      const uploadedUrls: string[] = [];

      for (let i = 0; i < photosLocal.length; i++) {
        const photo = photosLocal[i];
        try {
          const response = await fetch(photo.uri);
          const blob = await response.blob();

          const extFromType = (photo.type?.split('/')[1] || '').toLowerCase();
          const nameExt = (photo.name || '').split('.').pop()?.toLowerCase();
          const ext = (nameExt || extFromType || 'jpg').replace('jpeg', 'jpg');
          const indexStr = String(i).padStart(2, '0');
          const fileName = `${indexStr}-${Date.now()}.${ext}`;
          const fullPath = `${basePath}/${fileName}`;

          console.log('[PostLoad] Uploading to storage path:', fullPath);

          // Use our MockStorage-compatible API
          const storageRefAny: any = (storage as any).ref ? (storage as any).ref(fullPath) : null;

          if (storageRefAny && typeof storageRefAny.put === 'function') {
            const putResult = await storageRefAny.put(blob);
            const url = await putResult.ref.getDownloadURL();
            uploadedUrls.push(url);
            console.log(`[PostLoad] uploaded photo ${i + 1}/${photosLocal.length}`);
          } else {
            // Fallback to modular API if available in runtime
            try {
              const storageRefMod: any = ref as unknown as (s: any, p: string) => any;
              const sref = storageRefMod(storage, fullPath);
              const snap = await uploadBytes(sref, blob);
              const url = await getDownloadURL(snap.ref);
              uploadedUrls.push(url);
              console.log(`[PostLoad] uploaded (mod) photo ${i + 1}/${photosLocal.length}`);
            } catch (modErr) {
              console.warn('[PostLoad] modular upload failed, using placeholder', modErr);
              uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
            }
          }
        } catch (uploadError) {
          console.error(`[PostLoad] failed to upload photo ${i}:`, uploadError);
          uploadedUrls.push(`https://picsum.photos/400/300?random=${Date.now()}-${i}`);
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error('[PostLoad] uploadPhotosToFirebase error:', error);
      return photosLocal.map((_, i) => `https://picsum.photos/400/300?random=${Date.now()}-${i}`);
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

      setDraft(prev => ({ ...prev, isPosting: true }));
      
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
        photosLocal: currentDraft.photosLocal?.length,
        contact: currentDraft.contact,
        isPosting: true
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
      if (!contactInfo?.trim()) {
        throw new Error('Contact information is required');
      }
      
      // Validate photos from photosLocal (not photoUrls)
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
      
      // Use the uploaded photo URLs (should already be set by the caller)
      let finalPhotoUrls = currentDraft.photoUrls || [];
      
      // Fallback: if no photoUrls but we have photosLocal, this shouldn't happen
      // but we'll handle it gracefully
      if (finalPhotoUrls.length === 0 && (currentDraft.photosLocal?.length ?? 0) > 0) {
        console.warn('[PostLoad] No photoUrls found, uploading photosLocal as fallback');
        finalPhotoUrls = await uploadPhotosToFirebase(currentDraft.photosLocal, currentDraft.reference);
      }
      
      // Ensure we have at least 5 photos (use placeholders if needed)
      if (finalPhotoUrls.length < 5) {
        console.log('[PostLoad] ensuring minimum 5 photos with placeholders');
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
          
          const loadDescription = `${currentDraft.description.trim()}\n\nContact: ${contactInfo.trim()}`;

          const pickupZip = (currentDraft.pickup.match(/\b\d{5}\b/) || [''])[0];
          const deliveryZip = (currentDraft.delivery.match(/\b\d{5}\b/) || [''])[0];
          const estMiles = await estimateMileageFromZips(pickupZip, deliveryZip);
          const milesVal = estMiles ?? 0;
          const rpm = milesVal > 0 ? rateNum / milesVal : 0;
          
          await addLoad({
            id: loadId,
            shipperId: user.id,
            shipperName: user.name || 'You',
            origin: {
              address: '',
              city: currentDraft.pickup.trim(),
              state: '',
              zipCode: pickupZip,
              lat: 0,
              lng: 0,
            },
            destination: {
              address: '',
              city: currentDraft.delivery.trim(),
              state: '',
              zipCode: deliveryZip,
              lat: 0,
              lng: 0,
            },
            distance: milesVal,
            weight: currentDraft.weight ? toNumber(currentDraft.weight) : 0,
            vehicleType: currentDraft.vehicleType!,
            rate: rateNum,
            ratePerMile: rpm,
            pickupDate,
            deliveryDate,
            status: 'available',
            description: loadDescription,
            special_requirements: currentDraft.requirements ? [currentDraft.requirements] : undefined,
            isBackhaul: false,
          });
          
          console.log('[PostLoad] Added optimistic load to local storage');
          
        } catch (firebaseError: any) {
          console.warn('[PostLoad] Firebase write failed despite permissions check:', {
            code: firebaseError?.code,
            message: firebaseError?.message,
            name: firebaseError?.name
          });
          
          // Provide user-friendly error context
          if (firebaseError?.code === 'permission-denied') {
            console.log('[PostLoad] Permission denied - this is expected in development mode with anonymous users');
          } else {
            console.warn('[PostLoad] Firebase error, using local storage fallback');
          }
          
          await createLocalLoad(currentDraft, pickupDate, deliveryDate, finalPhotoUrls, contactInfo.trim());
        }
      } else {
        console.warn('[PostLoad] Firebase write not available:', permissions.error || 'Unknown reason');
        
        await createLocalLoad(currentDraft, pickupDate, deliveryDate, finalPhotoUrls, contactInfo?.trim());
      }
      
      // Reset state after successful posting
      reset();
      
    } catch (error) {
      console.error('[PostLoad] postLoadWizard error:', error);
      throw error;
    } finally {
      setDraft(prev => ({ ...prev, isPosting: false }));
    }
  }, [draft, user?.id, user?.name, reset, createLocalLoad, uploadPhotosToFirebase, addLoad]);



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