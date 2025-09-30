import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Send, Upload } from 'lucide-react-native';

import { usePostLoad } from '@/hooks/usePostLoad';
import { useToast } from '@/components/Toast';
import { useLoads } from '@/hooks/useLoads';
import { Load, VehicleType } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db, storage, auth, ensureFirebaseAuth } from '@/utils/firebase';
import { ref as storageRefV9, uploadBytes, getDownloadURL as getDownloadURLv9 } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

type NormAsset =
  | { kind:'file'; file: File; name: string; mime?: string }
  | { kind:'uri';  uri: string; name: string; mime?: string };

function normalizeAssets(input: any[]): NormAsset[] {
  if (!Array.isArray(input)) return [];
  return input.map((a: any, i) => {
    if (typeof File !== 'undefined' && a instanceof File) {
      return { kind:'file', file:a, name:a.name || `photo-${i}.jpg`, mime:a.type || 'image/jpeg' };
    }
    const uri = a?.uri || (typeof a === 'string' ? a : '');
    const last = String(a?.fileName || a?.name || uri.split(/[/?#]/).pop() || `photo-${i}.jpg`);
    const mime = a?.mime || a?.mimeType || 'image/jpeg';
    return { kind:'uri', uri, name:last, mime };
  });
}

async function uploadPhotosForLoad(uid: string, loadId: string, picked: any[], onProgress?: (done: number, total: number) => void) {
  const assets = normalizeAssets(picked).filter((a) => (a as any).file || (a as any).uri);
  console.log('[Upload] normalized:', assets.length);
  const urls: string[] = [];
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const safeName = a.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const refPath = `loadPhotos/${uid}/${loadId}/${String(i).padStart(2,'0')}-${safeName}`;
    const fileRef = storageRefV9(storage, refPath);
    console.log('[Upload] ->', refPath);

    if (a.kind === 'file') {
      await uploadBytes(fileRef, a.file as unknown as Blob);
    } else {
      try {
        const resp = await fetch(a.uri);
        const blob = await resp.blob();
        await uploadBytes(fileRef, blob);
      } catch (e) {
        console.error('[Upload] fetch failed for uri:', a.uri, e);
        throw new Error(`Failed to fetch image from URI: ${a.uri}`);
      }
    }
    const url = await getDownloadURLv9(fileRef);
    urls.push(url);
    if (onProgress) onProgress(i + 1, assets.length);
  }
  return urls;
}

function mapDraftToLoad(id: string, uid: string, draft: any, photos: string[]): Load {
  const vehicleType = (draft?.vehicleType || draft?.equipmentType || 'truck') as VehicleType;
  const pickupDate = draft?.pickupDate ? new Date(draft.pickupDate) : new Date();
  const deliveryDate = draft?.deliveryDate ? new Date(draft.deliveryDate) : new Date();
  const distance = Number(draft?.miles ?? 0);
  const weight = Number(draft?.weightLbs ?? (draft?.weight ? String(draft.weight).replace(/[^0-9.]/g, '') : 0));
  const rate = Number(draft?.rateTotalUSD ?? (draft?.rateAmount ? String(draft.rateAmount).replace(/[^0-9.]/g, '') : 0));
  const ratePerMile = Number(draft?.ratePerMileUSD ?? 0);
  const originCity = draft?.originCity || draft?.pickup || '';
  const destCity = draft?.destCity || draft?.delivery || '';
  return {
    id,
    shipperId: uid,
    shipperName: draft?.contactName || 'You',
    origin: {
      address: draft?.originAddress || originCity,
      city: originCity,
      state: draft?.originState || '',
      zipCode: draft?.originZip || '',
      lat: Number(draft?.originLat ?? 0),
      lng: Number(draft?.originLng ?? 0),
    },
    destination: {
      address: draft?.destAddress || destCity,
      city: destCity,
      state: draft?.destState || '',
      zipCode: draft?.destZip || '',
      lat: Number(draft?.destLat ?? 0),
      lng: Number(draft?.destLng ?? 0),
    },
    distance,
    weight,
    vehicleType,
    rate,
    ratePerMile,
    pickupDate,
    deliveryDate,
    status: 'available',
    description: draft?.title || draft?.notes || '',
  };
}

async function submitLoadWithPhotos(draft: any, toast: any, router: any, loadsStore?: any, setField?: (k: string, v: any) => void) {
  try {
    if (draft?.isPosting) return;
    try { setField && setField('isPosting', true); } catch {}
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
        console.log('[Auth] Signed in anonymously');
      } catch (e) {
        console.log('[Auth] Anonymous sign-in failed', e);
      }
    }
    await ensureFirebaseAuth();
    if (!auth.currentUser?.uid) throw new Error('Please sign in');

    const pickedFromUploader: string[] = Array.isArray(draft?.photoUrls) ? draft.photoUrls : [];
    const pickedLocal = draft?.photosLocal ?? draft?.photos ?? [];
    const totalPhotoCount = Math.max(pickedFromUploader.length, pickedLocal.length);
    const picked = pickedFromUploader.length > 0 ? pickedFromUploader : pickedLocal;

    const isVehicleLoad = draft?.vehicleType === 'car-hauler';
    const minPhotosRequired = isVehicleLoad ? 5 : 1;

    console.log('[submitLoadWithPhotos] Photo validation:', {
      pickedFromUploader: pickedFromUploader.length,
      pickedLocal: pickedLocal.length,
      totalPhotoCount,
      minPhotosRequired,
      isVehicleLoad
    });

    if (totalPhotoCount < minPhotosRequired) {
      const errorMsg = isVehicleLoad 
        ? 'Vehicle loads require at least 5 photos for protection.'
        : 'Please add at least 1 photo.';
      throw new Error(errorMsg);
    }

    try { setField && setField('isPosting', true); } catch {}
    const uid = auth.currentUser.uid;

    const base = {
      status: 'active',
      pickupDate: draft?.pickupDate || '',
      deliveryDate: draft?.deliveryDate || '',
      originCity: draft?.originCity || draft?.pickup || '',
      originState: draft?.originState || '',
      originZip:   draft?.originZip   || '',
      destCity:    draft?.destCity    || draft?.delivery || '',
      destState:   draft?.destState   || '',
      destZip:     draft?.destZip     || '',
      equipmentType: draft?.equipmentType || draft?.vehicleType || '',
      weightLbs: Number((draft?.weightLbs ?? (draft?.weight ? String(draft?.weight).replace(/[^0-9.]/g,'') : 0)) || 0),
      rateTotalUSD: Number((draft?.rateTotalUSD ?? (draft?.rateAmount ? String(draft?.rateAmount).replace(/[^0-9.]/g,'') : 0)) || 0),
      ratePerMileUSD: Number(draft?.ratePerMileUSD || 0),
      contactName:  draft?.contactName  || draft?.contact || '',
      contactPhone: draft?.contactPhone || draft?.contact || '',
      contactEmail: draft?.contactEmail || '',
      photos: [], photoCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
    } as const;

    try {
      const docRef = await addDoc(collection(db, 'loads'), base);
      console.log('[PostLoad] created id:', docRef.id);

      let urls: string[];
      if (pickedFromUploader.length > 0) {
        console.log('[PostLoad] ✅ Using PhotoUploader URLs directly - already uploaded to Firebase Storage');
        urls = pickedFromUploader;
      } else {
        urls = await uploadPhotosForLoad(uid, docRef.id, picked as any[]);
      }
      console.log('[PostLoad] uploaded urls:', urls.length);

      const loadObj = mapDraftToLoad(docRef.id, uid, draft, urls);
      await updateDoc(doc(db, 'loads', docRef.id), {
        photos: urls,
        photoCount: urls.length,
        updatedAt: serverTimestamp(),
        shipperId: loadObj.shipperId,
        shipperName: loadObj.shipperName,
        createdBy: uid,
        origin: loadObj.origin,
        destination: loadObj.destination,
        distance: loadObj.distance,
        weight: loadObj.weight,
        vehicleType: loadObj.vehicleType,
        rate: loadObj.rate,
        ratePerMile: loadObj.ratePerMile,
        pickupDate: loadObj.pickupDate,
        deliveryDate: loadObj.deliveryDate,
        status: loadObj.status,
        description: loadObj.description,
      });

      try {
        if (loadsStore?.addLoad) {
          const loadObj = mapDraftToLoad(docRef.id, uid, draft, urls);
          await loadsStore.addLoad(loadObj);
        }
      } catch (e) {
        console.log('[PostLoad] optional addLoad failed', e);
      }

      toast?.show?.('Load posted successfully', 'success');
      console.log('[PostLoad] Navigating to loads tab after successful post');
      try {
        router?.replace?.('/(tabs)/loads');
      } catch (navError) {
        console.error('[PostLoad] Navigation error:', navError);
        router?.push?.('/(tabs)/loads');
      }
      try { setField && setField('isPosting', false); } catch {}
    } catch (fireErr: any) {
      console.warn('[PostLoad] Firestore write failed, falling back to local:', fireErr?.code, fireErr?.message);
      if (fireErr?.code === 'permission-denied' || fireErr?.code === 'unavailable' || fireErr?.code === 'unauthenticated') {
        const localId = `local-${Date.now()}`;
        let urls: string[];
        if (pickedFromUploader.length > 0) {
          console.log('[PostLoad] ✅ Using PhotoUploader URLs directly for local fallback - already uploaded');
          urls = pickedFromUploader;
        } else {
          urls = await uploadPhotosForLoad(uid, localId, picked as any[]);
        }
        try {
          if (loadsStore?.addLoad) {
            const loadObj = mapDraftToLoad(localId, uid, draft, urls);
            await loadsStore.addLoad(loadObj);
          }
        } catch (e) {
          console.log('[PostLoad] local addLoad failed', e);
        }
        toast?.show?.('Posted locally. Sync will resume when permissions are fixed.', 'warning', 2800);
        console.log('[PostLoad] Navigating to loads tab after local post');
        try {
          router?.replace?.('/(tabs)/loads');
        } catch (navError) {
          console.error('[PostLoad] Navigation error:', navError);
          router?.push?.('/(tabs)/loads');
        }
        try { setField && setField('isPosting', false); } catch {}
      } else {
        throw fireErr;
      }
    }
  } catch (err: any) {
    console.error('[PostLoad] failed:', err?.code || '', err?.message || err);
    toast?.show?.(err?.message || 'Post failed — please try again', 'error');
  } finally {
    try { setField && setField('isPosting', false); } catch {}
  }
}

function Stepper({ current, total }: { current: number; total: number }) {
  const items = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  return (
    <View style={styles.stepper}>
      {items.map((n, idx) => {
        const active = n === current;
        return (
          <View key={n} style={styles.stepItem}>
            <View style={[styles.stepDot, active ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepNumber, active ? styles.stepNumberActive : styles.stepNumberInactive]}>{n}</Text>
            </View>
            {idx < items.length - 1 && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );
}
function PostLoadStep5() {
  const router = useRouter();
  const { draft, setField } = usePostLoad();
  const [contact, setContact] = useState<string>(draft.contact || '');
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; localUri: string; url?: string; status: 'picked' | 'resizing' | 'uploading' | 'uploaded' | 'error'; progress: number; error?: string }[]>([]);

  const toast = useToast();
  const loadsStore = useLoads();

  const onPrevious = useCallback(() => {
    try { router.back(); } catch (e) { console.log('[PostLoadStep5] previous error', e); }
  }, [router]);

  const pickImages = useCallback(async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets) return;

      const ensured = await ensureFirebaseAuth();
      const uid = ensured ? auth.currentUser?.uid : undefined;
      if (!uid) {
        toast?.show?.('Sign in required before uploading photos', 'error');
        return;
      }
      const draftLoadId = String(draft.reference || `LOAD-${Date.now()}`);

      const already = (draft.photoUrls?.length || 0);
      const remainingTotal = Math.max(0, 20 - already);
      const toProcess = result.assets.slice(0, remainingTotal);

      const newItems = toProcess.map((a) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        localUri: a.uri,
        status: 'picked' as const,
        progress: 0,
      }));
      setPhotos(prev => [...prev, ...newItems]);

      for (const item of newItems) {
        try {
          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'resizing', progress: 5 } : p));
          const manipulated = await ImageManipulator.manipulateAsync(
            item.localUri,
            [{ resize: { width: 1600 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          const resizedUri = manipulated.uri;
          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, progress: 20 } : p));

          const resp = await fetch(resizedUri);
          const blob = await resp.blob();
          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading', progress: 40 } : p));

          const photoId = item.id;
          const path = `loads/${uid}/${draftLoadId}/${photoId}.jpg`;
          const sRef = storageRefV9(storage, path);
          await uploadBytes(sRef, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' });
          const url = await getDownloadURLv9(sRef);

          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploaded', progress: 100, url } : p));
          const nextUrls = (draft.photoUrls || []).concat(url);
          setField('photoUrls', nextUrls);
          const nextAttachments = (draft.attachments || []).concat([{ uri: url }]);
          setField('attachments', nextAttachments as any);
        } catch (e: any) {
          console.error('[PhotoUpload] error', e);
          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: e?.message || 'Upload failed' } : p));
          toast?.show?.('Photo upload failed. Try again.', 'error');
        }
      }
      toast?.show?.('Photos uploaded', 'success');
    } catch (error) {
      console.error('[PostLoadStep5] Image picker error:', error);
      toast?.show?.('Failed to pick images', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [draft.reference, draft.photoUrls, draft.attachments, setField, toast]);

  const uploadedCount = useMemo(() => (draft.photoUrls || []).filter(u => typeof u === 'string' && u.startsWith('https://')).length, [draft.photoUrls]);

  const handlePostLoad = useCallback(async () => {
    try {
      if (!contact?.trim()) {
        toast?.show?.('Please enter contact information', 'error');
        return;
      }
      await submitLoadWithPhotos(
        { ...draft, contact: contact.trim() },
        toast,
        router,
        loadsStore,
        (k: string, v: any) => setField(k as any, v)
      );
    } catch (error: any) {
      console.error('[PostLoadStep5] handlePostLoad error:', error);
      toast?.show?.(error?.message || 'Failed to post load', 'error');
    }
  }, [contact, draft, toast, router, loadsStore, setField]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={styles.scrollContent}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="postLoadHeaderTitle">Post Load</Text>
            <Stepper current={5} total={5} />
          </View>

          <Text style={styles.bigTitle} testID="contactReviewTitle">Contact & Review</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.blockLabel}>Contact Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number or email for carriers to contact"
              placeholderTextColor={theme.colors.gray}
              value={contact}
              onChangeText={setContact}
              keyboardType={Platform.select({ ios: 'email-address', android: 'email-address', default: 'default' }) as 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad' | undefined}
              autoCapitalize="none"
              testID="contactInput"
            />
          </View>

          <View style={styles.attachCard}>
            <Text style={styles.summaryTitle}>Photos</Text>
            <Text style={styles.helperText} testID="attachmentsHelper">Photos ready: {uploadedCount} (showing up to 12)</Text>

            <View style={styles.photoSection}>
              <View style={styles.photoHeader}>
                <Text style={styles.photoTitle}>Photos</Text>
                <Text style={styles.photoCount}>{Math.min(draft.photoUrls?.length || 0, 20)}/20</Text>
              </View>
              
              <Pressable 
                onPress={pickImages} 
                style={styles.addPhotosBtn}
                disabled={isUploading || (draft.photoUrls?.length || 0) >= 20}
              >
                <Upload color={theme.colors.white} size={20} />
                <Text style={styles.addPhotosBtnText}>
                  {isUploading ? 'Adding Photos...' : 'Add Photos'}
                </Text>
              </Pressable>
              
              {(draft.photoUrls?.length || 0) > 0 && (
                <View style={styles.photoGrid}>
                  {(draft.photoUrls || []).slice(0, 12).map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.photoPreview}>
                      <Image source={{ uri }} style={styles.photoImage} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Load Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Title:</Text>
              <Text style={styles.summaryValue}>{draft.title || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Route:</Text>
              <Text style={styles.summaryValue}>{draft.pickup || '-'} → {draft.delivery || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Vehicle:</Text>
              <Text style={styles.summaryValue}>{draft.vehicleType?.toUpperCase?.() || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Rate:</Text>
              <Text style={styles.summaryValue}>
                ${draft.rateAmount || '0'} ({draft.rateKind === 'per_mile' ? 'per mile' : 'flat'})
                {draft.rateKind === 'per_mile' && draft.miles ? ` × ${draft.miles} miles` : ''}
              </Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.stickyFooter}>
          <View style={styles.footerContent}>
            <Pressable onPress={onPrevious} style={styles.secondaryBtn} accessibilityRole="button" testID="prevButton">
              <Text style={styles.secondaryBtnText}>Previous</Text>
            </Pressable>
            <Pressable 
              onPress={handlePostLoad} 
              style={[styles.postBtn, (!contact?.trim() || uploadedCount < 1 || draft.isPosting) && styles.postBtnDisabled]} 
              disabled={!contact?.trim() || uploadedCount < 1 || draft.isPosting} 
              accessibilityRole="button" 
              accessibilityState={{ disabled: !contact?.trim() || uploadedCount < 1 || draft.isPosting }} 
              testID="postLoadBtn"
            >
              {draft.isPosting ? (
                <ActivityIndicator color={theme.colors.white} size={18} />
              ) : (
                <Send color={theme.colors.white} size={18} />
              )}
              <Text style={styles.postBtnText}>
                {draft.isPosting ? 'Posting...' : !contact?.trim() ? 'Enter Contact Info' : uploadedCount < 1 ? 'Add Photos' : 'Post Load'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scrollContent: { padding: 16, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark, marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepDotInactive: { backgroundColor: '#cbd5e1' },
  stepNumber: { fontSize: theme.fontSize.md, fontWeight: '700' },
  stepNumberActive: { color: theme.colors.white },
  stepNumberInactive: { color: theme.colors.dark, opacity: 0.7 },
  stepConnector: { width: 24, height: 4, backgroundColor: '#cbd5e1', marginHorizontal: 8, borderRadius: 2 },

  bigTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.dark, textAlign: 'center', marginBottom: 16 },
  fieldBlock: { marginBottom: 16 },
  blockLabel: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }) as number,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },

  attachCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  summaryTitle: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.dark, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryKey: { fontSize: theme.fontSize.md, color: theme.colors.dark, fontWeight: '800' },
  summaryValue: { fontSize: theme.fontSize.md, color: theme.colors.dark, fontWeight: '700' },

  helperText: { color: theme.colors.gray, marginTop: 4, marginBottom: 8, fontSize: theme.fontSize.md },
  errorText: { color: '#ef4444', fontWeight: '700', marginBottom: 8 },
  warningText: { color: theme.colors.warning, fontWeight: '600', marginBottom: 8 },
  uploadStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  uploadStatusText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  attachActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  attachBtn: { flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  attachBtnText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '800' },
  attachBtnAlt: { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  attachBtnAltText: { color: theme.colors.dark, fontSize: theme.fontSize.md, fontWeight: '800' },
  photoActions: { marginBottom: 12 },
  addPhotosBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  addPhotosBtnText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '800' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  photoPreview: { width: '30%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: theme.colors.lightGray },
  photoImage: { width: '100%', height: '70%', resizeMode: 'cover' },
  photoCaption: { fontSize: theme.fontSize.xs, color: theme.colors.gray, textAlign: 'center', padding: 4, backgroundColor: theme.colors.white },
  removePhotoBtn: { position: 'absolute', right: 4, top: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  removePhotoBtnText: { color: theme.colors.white, fontSize: 14, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: '23%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  stickyFooter: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 999, 
    elevation: 999 
  },
  footerContent: { 
    padding: 12, 
    backgroundColor: theme.colors.white, 
    borderTopWidth: 1, 
    borderColor: '#eee',
    flexDirection: 'row',
    gap: 12
  },
  secondaryBtn: { flex: 1, backgroundColor: '#cbd5e1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: theme.colors.dark, fontSize: theme.fontSize.lg, fontWeight: '800' },
  postBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  postBtnDisabled: { backgroundColor: '#94a3b8' },
  postBtnText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: '800' },
  photoSection: { marginTop: 8 },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    flex: 1,
  },
  photoCount: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginRight: 8,
  },
  settingsBtn: {
    padding: 4,
  },
  settingsText: {
    fontSize: 16,
  },
  warningBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningBannerText: {
    color: '#92400e',
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
});

export default PostLoadStep5;
