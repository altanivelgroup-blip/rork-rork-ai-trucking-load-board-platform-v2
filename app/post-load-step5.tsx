import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Send, Clock } from 'lucide-react-native';

import { usePostLoad } from '@/hooks/usePostLoad';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/components/Toast';
import { useLoads } from '@/hooks/useLoads';
import { Image } from 'expo-image';
import { db } from '@/utils/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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

const auth = getAuth();
const storage = getStorage();

async function uploadPhotosForLoad(uid: string, loadId: string, picked: any[]) {
  const assets = normalizeAssets(picked).filter((a) => (a as any).file || (a as any).uri);
  console.log('[Upload] normalized:', assets.length);
  const urls: string[] = [];
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const safeName = a.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const refPath = `loadPhotos/${uid}/${loadId}/${String(i).padStart(2,'0')}-${safeName}`;
    const fileRef = ref(storage, refPath);
    console.log('[Upload] ->', fileRef.fullPath);

    if (a.kind === 'file') {
      await uploadBytesResumable(fileRef, a.file, { contentType: a.mime || 'image/jpeg' });
    } else {
      const resp = await fetch(a.uri);
      const blob = await resp.blob();
      await uploadBytesResumable(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
    }
    const url = await getDownloadURL(fileRef);
    urls.push(url);
  }
  return urls;
}

async function submitLoadWithPhotos(draft: any, toast: any, router: any, loadsStore?: any) {
  try {
    if (draft?.isPosting) return;
    if (!auth.currentUser?.uid) throw new Error('Please sign in');

    const picked = draft?.photosLocal ?? draft?.photos ?? [];
    if (!Array.isArray(picked) || picked.length < 5) {
      throw new Error('Please add at least 5 photos.');
    }

    draft.isPosting = true;
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

    const docRef = await addDoc(collection(db, 'loads'), base);
    console.log('[PostLoad] created id:', docRef.id);

    const urls = await uploadPhotosForLoad(uid, docRef.id, picked);
    console.log('[PostLoad] uploaded urls:', urls.length);

    await updateDoc(doc(db, 'loads', docRef.id), {
      photos: urls,
      photoCount: urls.length,
      updatedAt: serverTimestamp(),
    });

    try {
      if (loadsStore?.prepend) {
        await loadsStore.prepend({ id: docRef.id, ...base, photos: urls, photoCount: urls.length });
      }
    } catch (e) {
      console.log('[PostLoad] optional prepend failed', e);
    }

    toast?.success?.('Load posted successfully');
    router?.replace?.('/loads');
  } catch (err: any) {
    console.error('[PostLoad] failed:', err?.code || '', err?.message || err);
    toast?.error?.(err?.message || 'Post failed — please try again');
  } finally {
    if (draft) draft.isPosting = false;
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
export default function PostLoadStep5() {
  const router = useRouter();
  const { draft, setField, reset } = usePostLoad();
  const [contact, setContact] = useState<string>(draft.contact || '');
  const [uploadsInProgress, setUploadsInProgress] = useState<number>(0);
  const toast = useToast();
  const loadsStore = useLoads();

  const onPrevious = useCallback(() => {
    try { router.back(); } catch (e) { console.log('[PostLoadStep5] previous error', e); }
  }, [router]);

  const handleAddPhotos = useCallback(async () => {
    try {
      if (draft.photosLocal.length === 0) {
        setField('photoUrls', []);
        console.log('[PostLoad] Cleared previous photos for new load');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset, index) => {
          const uriParts = asset.uri.split('/');
          const fileName = (asset as any).fileName || uriParts[uriParts.length - 1] || `photo-${Date.now()}-${index}.jpg`;
          return {
            uri: asset.uri,
            name: fileName,
            type: (asset as any).mimeType || 'image/jpeg',
          } as const;
        });

        setField('photosLocal', [...draft.photosLocal, ...newPhotos]);
        console.log('[PostLoad] Added photos to photosLocal:', newPhotos.length, 'total:', draft.photosLocal.length + newPhotos.length);
      }
    } catch (error) {
      console.error('[PostLoad] Error selecting photos:', error);
      toast.show('Failed to select photos', 'error');
    }
  }, [draft.photosLocal, setField, toast]);

  const handleRemovePhoto = useCallback((index: number) => {
    const updatedPhotos = draft.photosLocal.filter((_, i) => i !== index);
    setField('photosLocal', updatedPhotos);
    console.log('[PostLoad] Removed photo at index:', index);
  }, [draft.photosLocal, setField]);


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
            <Text style={styles.summaryTitle}>Photos (min 5 required)</Text>
            {uploadsInProgress > 0 && (
              <View style={styles.uploadStatusContainer}>
                <Clock color={theme.colors.primary} size={18} />
                <Text style={styles.uploadStatusText}>
                  Uploading photos ({uploadsInProgress}/{draft.photosLocal?.length || 0})... Please wait.
                </Text>
              </View>
            )}
            <Text style={styles.helperText} testID="attachmentsHelper">
              Photos selected: {draft.photosLocal?.length || 0} (min 5 required)
            </Text>
            {(!draft.photosLocal || draft.photosLocal.length < 5) && uploadsInProgress === 0 && (
              <Text style={styles.errorText} testID="attachmentsError">
                Minimum 5 photos required to post.
              </Text>
            )}
            <View style={styles.photoActions}>
              <Pressable
                onPress={handleAddPhotos}
                style={styles.addPhotosBtn}
                accessibilityRole="button"
                testID="addPhotosBtn"
              >
                <Text style={styles.addPhotosBtnText}>Add Photos</Text>
              </Pressable>
            </View>
            {draft.photosLocal && draft.photosLocal.length > 0 && (
              <View style={styles.photoGrid}>
                {draft.photosLocal.map((photo: any, index: number) => {
                  const displayName = (photo.name ? String(photo.name).split('/').pop() : undefined) || `photo-${index + 1}.jpg`;
                  return (
                    <View key={`${photo.uri}-${index}`} style={styles.photoPreview}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoImage}
                        contentFit="cover"
                        transition={100}
                        onError={(e: unknown) => {
                          console.log('[PostLoad] preview image error', e);
                        }}
                      />
                      <Text style={styles.photoCaption} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Pressable
                        onPress={() => handleRemovePhoto(index)}
                        style={styles.removePhotoBtn}
                        accessibilityRole="button"
                        testID={`removePhoto-${index}`}
                      >
                        <Text style={styles.removePhotoBtnText}>×</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
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
              onPress={() => submitLoadWithPhotos(draft, toast, router, loadsStore)} 
              style={[
                styles.postBtn, 
                (uploadsInProgress > 0 || 
                 !draft.photosLocal || 
                 draft.photosLocal.length < 5 || 
                 draft.isPosting) && styles.postBtnDisabled
              ]} 
              disabled={
                uploadsInProgress > 0 || 
                !draft.photosLocal || 
                draft.photosLocal.length < 5 || 
                draft.isPosting
              } 
              accessibilityRole="button" 
              accessibilityState={{ 
                disabled: uploadsInProgress > 0 || 
                         !draft.photosLocal || 
                         draft.photosLocal.length < 5 || 
                         draft.isPosting 
              }} 
              testID="postLoadBtn"
            >
              {draft.isPosting ? (
                <ActivityIndicator color={theme.colors.white} size={18} />
              ) : (
                <Send color={theme.colors.white} size={18} />
              )}
              <Text style={styles.postBtnText}>
                {uploadsInProgress > 0 
                  ? `Uploading photos (${uploadsInProgress}/${draft.photosLocal?.length || 0})...` 
                  : draft.isPosting 
                  ? 'Posting...' 
                  : 'Post Load'
                }
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
});
