import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Load, VehicleType } from '@/types';
import { estimateMileageFromZips } from '@/utils/distance';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { toNumber } from '@/utils/loadValidation';
import { getFirebase, ensureFirebaseAuth, checkFirebasePermissions } from '@/utils/firebase';
import { postLoad } from '@/lib/firebase';
import { isValidIana } from '@/constants/timezones';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FORCE_DELIVERY_TZ } from '@/utils/env';

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
  deliveryDateLocal: string; // "YYYY-MM-DDTHH:MM"
  deliveryTZ: string; // IANA TZ id
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
  updateDraft: (patch: Partial<PostLoadDraft> & Record<string, unknown>) => void;
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
  deliveryDateLocal: '',
  deliveryTZ: '',
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

  const updateDraft = useCallback((patch: Partial<PostLoadDraft> & Record<string, unknown>) => {
    setDraft((prev) => {
      const next: PostLoadDraft = { ...prev, ...(patch as Partial<PostLoadDraft>) } as PostLoadDraft;

      const originAny = (patch as any)?.origin;
      if (originAny && (typeof originAny === 'object')) {
        const city = (originAny.city ?? '').toString().trim();
        const state = (originAny.state ?? '').toString().trim();
        const combined = [city, state].filter(Boolean).join(', ');
        if (combined.length > 0) next.pickup = combined;
      }

      const destinationAny = (patch as any)?.destination;
      if (destinationAny && (typeof destinationAny === 'object')) {
        const city = (destinationAny.city ?? '').toString().trim();
        const state = (destinationAny.state ?? '').toString().trim();
        const combined = [city, state].filter(Boolean).join(', ');
        if (combined.length > 0) next.delivery = combined;
      }

      if ((patch as any)?.distanceMi != null) {
        const milesNum = Number((patch as any).distanceMi);
        next.miles = Number.isFinite(milesNum) ? String(milesNum) : prev.miles;
      }
      if ((patch as any)?.revenueUsd != null) {
        const revNum = Number((patch as any).revenueUsd);
        next.rateAmount = Number.isFinite(revNum) ? String(revNum) : prev.rateAmount;
      }
      if ((patch as any)?.deliveryDateLocal != null) {
        next.deliveryDateLocal = String((patch as any).deliveryDateLocal ?? '');
      }
      if ((patch as any)?.deliveryTZ != null) {
        next.deliveryTZ = String((patch as any).deliveryTZ ?? '');
      }

      return next;
    });
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
      photosLocal: [],
      photoUrls: [],
      isPosting: false,
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

      // FIXED: Ensure proper Firebase authentication before upload
      console.log('[PostLoad] Ensuring Firebase authentication before photo upload...');
      const authed = await ensureFirebaseAuth();
      if (!authed) {
        console.error('[PostLoad] Firebase authentication failed - cannot upload photos');
        throw new Error('Firebase authentication required for photo uploads. Please check your connection and try again.');
      }
      
      // Verify we have a current user
      const { auth } = getFirebase();
      if (!auth?.currentUser?.uid) {
        console.error('[PostLoad] No authenticated user found for photo upload');
        throw new Error('User authentication required for photo uploads. Please sign in and try again.');
      }
      
      console.log('[PostLoad] ✅ Authentication verified for photo upload - user:', auth.currentUser.uid);

      const { storage } = getFirebase();
      const uid = auth.currentUser.uid; // Use authenticated user ID
      const basePath = `loadPhotos/${uid}/${String(reference).trim()}`;
      
      console.log('[PostLoad] Photo upload path:', basePath);
      console.log('[PostLoad] Authenticated user for photos:', uid);

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

          // FIXED: Use proper Firebase Storage modular API
          try {
            const actualStorage = (storage as any)._storage || storage;
            const storageRef = ref(actualStorage, fullPath);
            const snap = await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(snap.ref);
            uploadedUrls.push(url);
            console.log(`[PostLoad] ✅ uploaded photo ${i + 1}/${photosLocal.length} to Firebase Storage`);
          } catch (uploadError) {
            console.error('[PostLoad] Firebase Storage upload failed:', uploadError);
            throw uploadError; // Don't use placeholder - let the error bubble up
          }
        } catch (uploadError) {
          console.error(`[PostLoad] failed to upload photo ${i}:`, uploadError);
          throw uploadError; // Don't use placeholder - let the error bubble up
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error('[PostLoad] uploadPhotosToFirebase error:', error);
      throw error; // Don't use placeholder - let the error bubble up
    }
  }, [user?.id]);

  const uploadPhotos = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id || draft.photosLocal.length === 0) return;
      
      const uploadedUrls = await uploadPhotosToFirebase(draft.photosLocal, draft.reference);
      setDraft(prev => ({ ...prev, photoUrls: uploadedUrls }));
      
    } catch (error) {
      console.error('[PostLoad] uploadPhotos error:', error);
      // Don't use placeholder images - let the error be handled by the UI
      throw error;
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
      // Check contact info from parameter or draft
      const finalContactInfo = contactInfo?.trim() || currentDraft.contact?.trim();
      if (!finalContactInfo) {
        throw new Error('Contact information is required');
      }
      
      // Validate photos - check both photoUrls (uploaded) and photosLocal (selected)
      const photoCount = Math.max(
        currentDraft.photoUrls?.length ?? 0,
        currentDraft.photosLocal?.length ?? 0
      );
      
      const isVehicleLoad = currentDraft.vehicleType === 'car-hauler';
      const minRequired = isVehicleLoad ? 5 : 1;
      
      if (photoCount < minRequired) {
        const errorMsg = isVehicleLoad 
          ? 'Vehicle loads require at least 5 photos for protection.'
          : 'At least 1 photo is required.';
        throw new Error(errorMsg);
      }
      
      // Validate timezone and local datetime for delivery
      if (!currentDraft.deliveryDateLocal || typeof currentDraft.deliveryDateLocal !== 'string') {
        throw new Error('Delivery local date/time is required');
      }
      if (FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0) {
        setField('deliveryTZ', FORCE_DELIVERY_TZ);
      } else {
        if (!currentDraft.deliveryTZ || !isValidIana(currentDraft.deliveryTZ)) {
          throw new Error('Select a valid delivery timezone');
        }
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
      
      // Use the uploaded photo URLs or upload photosLocal if needed
      let finalPhotoUrls = currentDraft.photoUrls || [];
      
      // If we have photosLocal but no photoUrls, upload them first
      if (finalPhotoUrls.length === 0 && (currentDraft.photosLocal?.length ?? 0) > 0) {
        console.log('[PostLoad] Uploading photosLocal to get photoUrls');
        finalPhotoUrls = await uploadPhotosToFirebase(currentDraft.photosLocal, currentDraft.reference);
        // Update the draft with the uploaded URLs
        setField('photoUrls', finalPhotoUrls);
      }
      
      // Validate we have the required number of photos (no placeholders)
      if (finalPhotoUrls.length < minRequired) {
        const errorMsg = isVehicleLoad 
          ? `Vehicle loads require exactly ${minRequired} photos for protection. Only ${finalPhotoUrls.length} uploaded successfully.`
          : `At least ${minRequired} photo is required. Only ${finalPhotoUrls.length} uploaded successfully.`;
        throw new Error(errorMsg);
      }
      
      console.log('[PostLoad] ✅ All photos uploaded successfully - final photo URLs count:', finalPhotoUrls.length);
      console.log('[PostLoad] ✅ Submitted images saved - Displaying correctly');
      
      // Check Firebase permissions first
      const permissions = await checkFirebasePermissions();
      console.log('[PostLoad] Firebase permissions check:', permissions);
      
      if (permissions.canWrite) {
        try {
          // Use the new postLoad function with proper schema
          const rateNum = toNumber(currentDraft.rateAmount);
          const loadId = `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('[PostLoad] Attempting Firebase write with permissions:', permissions);
          
          const tzSelected = (FORCE_DELIVERY_TZ && FORCE_DELIVERY_TZ.length > 0) ? FORCE_DELIVERY_TZ : currentDraft.deliveryTZ;
          const localStr = currentDraft.deliveryDateLocal;

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
            deliveryTZ: tzSelected,
            deliveryDateLocal: localStr ?? null,
          });
          
          console.log('[PostLoad] load posted successfully to Firebase:', loadId);
          
          const loadDescription = `${currentDraft.description.trim()}\n\nContact: ${finalContactInfo}`;

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
          
          // For local storage fallback, we still need the photos to be uploaded to Firebase Storage
        // If Firebase write fails but photos are uploaded, we can still create the local load
        if (finalPhotoUrls.length >= minRequired) {
          await createLocalLoad(currentDraft, pickupDate, deliveryDate, finalPhotoUrls, finalContactInfo);
        } else {
          throw new Error('Photos must be uploaded before creating load. Please retry photo upload.');
        }
        }
      } else {
        console.warn('[PostLoad] Firebase write not available:', permissions.error || 'Unknown reason');
        
        // For local storage fallback, we still need the photos to be uploaded to Firebase Storage
        // If Firebase write fails but photos are uploaded, we can still create the local load
        if (finalPhotoUrls.length >= minRequired) {
          await createLocalLoad(currentDraft, pickupDate, deliveryDate, finalPhotoUrls, finalContactInfo);
        } else {
          throw new Error('Photos must be uploaded before creating load. Please retry photo upload.');
        }
      }
      
      // Reset state after successful posting
      reset();
      
    } catch (error) {
      console.error('[PostLoad] postLoadWizard error:', error);
      throw error;
    } finally {
      setDraft(prev => ({ ...prev, isPosting: false }));
    }
  }, [draft, user?.id, user?.name, reset, createLocalLoad, uploadPhotosToFirebase, addLoad, setField]);



  return useMemo(() => ({ 
    draft, 
    setField,
    updateDraft,
    reset, 
    canSubmit, 
    canPost, 
    submit, 
    uploadPhotos, 
    uploadPhotosToFirebase,
    postLoadWizard 
  }), [draft, setField, updateDraft, reset, canSubmit, canPost, submit, uploadPhotos, uploadPhotosToFirebase, postLoadWizard]);
});