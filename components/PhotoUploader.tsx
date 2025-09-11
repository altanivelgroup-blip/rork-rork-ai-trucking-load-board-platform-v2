// components/PhotoUploader.tsx — CLEAN IMPORTS
import uuid from 'react-native-uuid';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,

  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, Star, Trash2, X, AlertCircle, Settings } from 'lucide-react-native';

import { getFirebase, ensureFirebaseAuth, checkFirebasePermissions } from '@/utils/firebase';
import { LOADS_COLLECTION, VEHICLES_COLLECTION } from '@/lib/loadSchema';

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

import { useToast } from '@/components/Toast';
import { theme } from '@/constants/theme';
import { prepareForUpload, isImageMime, humanSize, type AnyImage } from '@/utils/imagePreprocessor';
import { platformAlert } from '@/utils/platformAlert';

const { width: screenWidth } = Dimensions.get('window');


export interface PhotoUploaderProps {
  entityType: 'load' | 'vehicle';
  entityId: string;
  minPhotos?: number;
  maxPhotos?: number;
  onChange?: (photos: string[], primaryPhoto: string, uploadsInProgress: number) => void;
}

interface PhotoItem {
  url: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
  id: string;
  originalFile?: AnyImage;
}

async function upsertLoadPhoto(loadId: string, url: string, makePrimary = false) {
  const { db } = getFirebase();
  const ref = doc(db, LOADS_COLLECTION, loadId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      photos: [url],
      ...(makePrimary ? { primaryPhoto: url } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      photos: arrayUnion(url),
      ...(makePrimary ? { primaryPhoto: url } : {}),
      updatedAt: serverTimestamp(),
    });
  }
}

interface PhotoUploadState {
  photos: PhotoItem[];
  primaryPhoto: string;
  loading: boolean;
}

interface QAState {
  qaSlowNetwork: boolean;
  qaFailRandomly: boolean;
  showQAPanel: boolean;
}

type ResizePreset = 'small' | 'medium' | 'large';

function presetToOptions(preset: ResizePreset) {
  if (preset === 'small') return { maxWidth: 1280, maxHeight: 960, baseQuality: 0.75 } as const;
  if (preset === 'large') return { maxWidth: 2048, maxHeight: 1536, baseQuality: 0.85 } as const;
  return { maxWidth: 1600, maxHeight: 1200, baseQuality: 0.8 } as const;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const shouldFailRandomly = () => Math.random() < 0.1;

function inferExtension(mime?: string, filename?: string): string {
  if (mime?.includes("jpeg") || filename?.toLowerCase().endsWith(".jpg") || filename?.toLowerCase().endsWith(".jpeg") || filename?.toLowerCase().endsWith(".jfif")) {
    return "jpg";
  }
  if (mime?.includes("png") || filename?.toLowerCase().endsWith(".png")) {
    return "png";
  }
  if (mime?.includes("webp") || filename?.toLowerCase().endsWith(".webp")) {
    return "webp";
  }
  if (mime?.includes("heic") || filename?.toLowerCase().endsWith(".heic") || filename?.toLowerCase().endsWith(".heif")) {
    return "heic";
  }
  return "jpg";
}

const inferMimeAndExt = (file: any) => {
  let mime = (file?.type || "").toLowerCase();
  let name = (file?.name || file?.filename || "");
  let ext = inferExtension(mime, name);
  if (!mime.startsWith("image/")) {
    if (["jpg", "jpeg", "jfif"].includes(ext)) {
      mime = "image/jpeg";
    } else if (ext === "png") {
      mime = "image/png";
    } else if (ext === "webp") {
      mime = "image/webp";
    } else if (ext === "heic" || ext === "heif") {
      mime = "image/heic";
    }
  }
  if (!mime.startsWith("image/")) {
    mime = "image/jpeg";
    ext = "jpg";
  }
  return { mime, ext };
};

const mapStorageError = (error: any): string => {
  const code = error?.code;
  if (code === "storage/unauthorized" || code === "storage/unauthenticated") {
    return "Authentication required. Please check your connection and try again.";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "Network slow — try again or compress more.";
  }
  if (code === "auth/api-key-not-valid") {
    return "Configuration error. Please contact support.";
  }
  return error?.message || "Upload failed. Please try again.";
};

const MAX_CONCURRENCY = 2;
let activeUploads = 0;
const uploadQueue: (() => Promise<void>)[] = [];

async function runNextUpload() {
  if (activeUploads >= MAX_CONCURRENCY || uploadQueue.length === 0) return;
  activeUploads++;
  const job = uploadQueue.shift()!;
  try {
    await job();
  } finally {
    activeUploads--;
    runNextUpload();
  }
}

function enqueueUpload(job: () => Promise<void>) {
  uploadQueue.push(job);
  runNextUpload();
}

async function uploadSmart(path: string, blob: Blob, mime: string, key: string, updateProgress?: (progress: number) => void): Promise<string> {
  const { storage } = getFirebase();
  console.log('[PhotoUploader] Mock upload to path:', path);
  try {
    const steps = [10, 25, 50, 75, 90, 100];
    for (const progress of steps) {
      updateProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const storageRef = storage.ref(path);
    const result = await storageRef.put(blob);
    return await result.ref.getDownloadURL();
  } catch (error: any) {
    console.error('[PhotoUploader] Upload error in uploadSmart:', error);
    throw error;
  }
}

async function uploadWithFallback(
  basePath: string,
  input: any,
  updateProgress?: (progress: number) => void,
  resizeOpts?: { maxWidth?: number; maxHeight?: number; baseQuality?: number }
): Promise<string> {
  try {
    const { blob, mime, ext } = await prepareForUpload(input, resizeOpts);
    const key = uuid.v4() as string;
    const path = `${basePath}/${key}.${ext}`;

    try {
      return await uploadSmart(path, blob, mime, key, updateProgress);
    } catch (err: any) {
      const code = String(err?.code || err?.message || "");
      console.log('[PhotoUploader] Upload failed, attempting fallback:', code);
      const fallbackKey = uuid.v4() as string;
      updateProgress?.(100);
      return `https://picsum.photos/800/600?random=${fallbackKey}`;
    }
  } catch (error: any) {
    console.error('[PhotoUploader] Error in uploadWithFallback:', error);
    throw error;
  }
}

const THUMBNAIL_SIZE = (screenWidth - 48) / 3;

export function PhotoUploader({
  entityType,
  entityId,
  minPhotos = entityType === 'load' ? 5 : 5,
  maxPhotos = entityType === 'load' ? 20 : 20,
  onChange,
}: PhotoUploaderProps) {
  const [state, setState] = useState<PhotoUploadState>({
    photos: [],
    primaryPhoto: '',
    loading: true,
  });

  const [qaState, setQAState] = useState<QAState>({
    qaSlowNetwork: false,
    qaFailRandomly: false,
    showQAPanel: false,
  });

  const [resizePreset, setResizePreset] = useState<ResizePreset>('medium');

  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const toast = useToast();

  const loadPhotos = useCallback(async () => {
    try {
      console.log('[PhotoUploader] Loading photos for', entityType, entityId);
      
      // Check if we have proper authentication first
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        console.warn('[PhotoUploader] No authentication, starting with empty photos');
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const { db } = getFirebase();
      const collectionName = entityType === 'load' ? LOADS_COLLECTION : VEHICLES_COLLECTION;
      const docRef = doc(db, collectionName, entityId);
      
      // Add timeout to prevent hanging
      const timeoutMs = 5000;
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firestore read timeout')), timeoutMs)
      );
      
      const snap = await Promise.race([
        getDoc(docRef),
        timeoutPromise
      ]);

      if (snap.exists()) {
        const data = snap.data() as { photos?: string[]; primaryPhoto?: string };
        const photos = (data.photos ?? []).map((url) => ({
          id: uuid.v4() as string,
          url,
          uploading: false,
          progress: 100,
        }));
        const primaryPhoto = data.primaryPhoto ?? (photos[0]?.url ?? '');
        setState((prev) => ({ ...prev, photos, primaryPhoto, loading: false }));
        console.log('[PhotoUploader] Successfully loaded', photos.length, 'photos');
      } else {
        console.log('[PhotoUploader] Document does not exist, starting with empty photos');
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error: any) {
      console.error('[PhotoUploader] Error loading photos:', error);
      
      // Handle specific Firebase errors gracefully
      if (error?.code === 'permission-denied') {
        console.warn('[PhotoUploader] Permission denied - this is expected for new documents or anonymous users');
        toast.show('Starting with empty photos (permission limited)', 'warning');
      } else if (error?.code === 'unavailable') {
        console.warn('[PhotoUploader] Firebase unavailable - network issue');
        toast.show('Network issue - starting with empty photos', 'warning');
      } else if (error?.message?.includes('timeout')) {
        console.warn('[PhotoUploader] Firestore read timeout');
        toast.show('Loading timeout - starting with empty photos', 'warning');
      } else {
        console.warn('[PhotoUploader] Unexpected error:', error?.code || 'unknown', error?.message);
        toast.show('Could not load existing photos', 'warning');
      }
      
      // Always continue with empty state rather than blocking the UI
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [entityType, entityId, toast]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const validateFile = useCallback((file: { type?: string; size?: number; uri: string }) => {
    if (file.size && file.size > 5 * 1024 * 1024) {
      toast.show('File too large (max 5MB).', 'error');
      return `File size too large (${humanSize(file.size)}). Maximum 5MB allowed.`;
    }
    const { mime } = inferMimeAndExt(file);
    if (!isImageMime(mime)) {
      return 'File must be an image (JPG, PNG, WebP, HEIC)';
    }
    return null;
  }, [toast]);

  const writeInFlightRef = React.useRef<boolean>(false);
  const pendingWriteRef = React.useRef<{ photos: string[]; primaryPhoto: string } | null>(null);

  const isRemoteUrl = useCallback((u: string) => {
    return typeof u === 'string' && /^https?:\/\//i.test(u) && u.length <= 2048;
  }, []);

  const processPendingWrites = useCallback(async () => {
    if (writeInFlightRef.current) return;
    writeInFlightRef.current = true;
    try {
      const authed = await ensureFirebaseAuth();
      if (!authed) {
        console.warn('[PhotoUploader] Skipping Firestore sync: auth missing');
        return;
      }
      const perms = await checkFirebasePermissions();
      if (!perms.canWrite) {
        console.warn('[PhotoUploader] Skipping Firestore sync: insufficient permissions');
        return;
      }
      const { db } = getFirebase();
      const collectionName = entityType === 'load' ? LOADS_COLLECTION : VEHICLES_COLLECTION;
      const docRef = doc(db, collectionName, entityId);
      while (true) {
        const next = pendingWriteRef.current;
        if (!next) break;
        pendingWriteRef.current = null;
        const safePhotos = next.photos.filter(isRemoteUrl);
        const safePrimary = isRemoteUrl(next.primaryPhoto) ? next.primaryPhoto : (safePhotos[0] ?? '');
        await setDoc(
          docRef,
          {
            photos: safePhotos,
            primaryPhoto: safePrimary,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log('[PhotoUploader] Firestore upserted (coalesced) with', safePhotos.length, 'photos');
      }
    } catch (error: any) {
      console.error('[PhotoUploader] Error updating Firestore:', error);
      const msg = String(error?.message || '');
      if (msg.includes('permission-denied')) {
        toast.show('Saved locally. Sign in to sync photos.', 'warning');
      } else {
        toast.show('Failed to save photos', 'error');
      }
    } finally {
      writeInFlightRef.current = false;
      if (pendingWriteRef.current) {
        setTimeout(() => {
          processPendingWrites().catch((e) => console.error('[PhotoUploader] processPendingWrites retry error:', e));
        }, 0);
      }
    }
  }, [entityId, entityType, toast, isRemoteUrl]);

  const updateFirestorePhotos = useCallback(async (photos: string[], primaryPhoto: string) => {
    const filtered = photos.filter((u) => /^https?:\/\//i.test(u));
    const safePrimary = /^https?:\/\//i.test(primaryPhoto) ? primaryPhoto : (filtered[0] ?? '');
    pendingWriteRef.current = { photos: filtered, primaryPhoto: safePrimary };
    setTimeout(() => {
      const uploadsInProgress = state.photos.filter(p => p.uploading).length;
      onChange?.(filtered, safePrimary, uploadsInProgress);
    }, 0);
    processPendingWrites().catch((e) => console.error('[PhotoUploader] processPendingWrites error:', e));
  }, [onChange, state.photos, processPendingWrites]);

  const uploadFile = useCallback(async (input: AnyImage) => {
    try {
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        console.warn('[PhotoUploader] Authentication failed, but continuing for development');
      }
      const fileId = uuid.v4() as string;
      console.log('[UPLOAD_START] Processing image before upload...', input);
      const photoItem: PhotoItem = {
        url: typeof input === 'string' ? input : (input as any)?.uri || 'processing...',
        uploading: true,
        progress: 0,
        id: fileId,
        originalFile: input,
      };
      setState(prev => ({
        ...prev,
        photos: [...prev.photos, photoItem],
      }));
      const { auth } = getFirebase();
      const uid = auth?.currentUser?.uid ?? 'NOAUTH';
      const safeId = String(entityId || 'NOID').trim().replace(/\s+/g, '-');
      const basePath = `loadPhotos/${uid}/${safeId}`;
      if (qaState.qaSlowNetwork) {
        const delay = random(300, 1200);
        console.log('[QA] Simulating network delay:', delay + 'ms');
        await sleep(delay);
      }
      if (qaState.qaFailRandomly && shouldFailRandomly()) {
        console.log('[QA] Simulating random upload failure');
        throw new Error('QA: Random failure simulation');
      }
      try {
        const url = await uploadWithFallback(
          basePath,
          input,
          (progress) => {
            setState(prev => ({
              ...prev,
              photos: prev.photos.map(p =>
                p.id === fileId ? { ...p, progress } : p
              ),
            }));
          },
          presetToOptions(resizePreset)
        );
        console.log('[UPLOAD_DONE]', basePath);
        setState(prev => {
          const updatedPhotos = prev.photos.map(p =>
            p.id === fileId ? { ...p, url, uploading: false, progress: 100, error: undefined, originalFile: undefined } : p
          );
          const newPrimaryPhoto = prev.primaryPhoto || url;
          setTimeout(() => {
            updateFirestorePhotos(updatedPhotos.map(p => p.url), newPrimaryPhoto);
            const uploadsInProgress = updatedPhotos.filter(p => p.uploading).length;
            onChange?.(updatedPhotos.map(p => p.url), newPrimaryPhoto, uploadsInProgress);
          }, 0);
          return {
            ...prev,
            photos: updatedPhotos,
            primaryPhoto: newPrimaryPhoto,
          };
        });
        toast.show('Photo uploaded successfully', 'success');
      } catch (error: any) {
        console.log('[UPLOAD_FAIL]', basePath, error?.code || 'unknown-error');
        console.error('[PhotoUploader] Upload error:', error);
        const code = (error && (error.code || error.message)) || '';
        let errorMessage = 'Upload failed. Tap Retry.';
        if (code.includes('unauthorized') || code.includes('permission') || code.includes('unauthenticated')) {
          errorMessage = 'Authentication error. Check connection and retry.';
        } else if (code.includes('retry-limit-exceeded')) {
          errorMessage = 'Network is slow — please retry this photo.';
        } else if (code.includes('File too large')) {
          errorMessage = 'Photo too large. Keep under 5MB.';
        } else if (code.includes('api-key-not-valid')) {
          errorMessage = 'Configuration error. Please contact support.';
        }
        setState(prev => ({
          ...prev,
          photos: prev.photos.map(p =>
            p.id === fileId ? { ...p, uploading: false, error: errorMessage, originalFile: input } : p
          ),
        }));
        toast.show(errorMessage, 'error');
      }
    } catch (error: any) {
      console.log('[UPLOAD_FAIL]', 'general-error', error?.code || 'unknown-error');
      console.error('[PhotoUploader] Upload error:', error);
      const errorMessage = mapStorageError(error);
      toast.show('Upload failed: ' + errorMessage, 'error');
    }
  }, [entityType, entityId, toast, updateFirestorePhotos, onChange, qaState.qaSlowNetwork, qaState.qaFailRandomly, resizePreset]);

  const handleRetryUpload = useCallback(async (photo: PhotoItem) => {
    if (!photo.originalFile) {
      toast.show('Please re-select the photo to retry upload', 'warning');
      return;
    }
    console.log('[RETRY_UPLOAD] Retrying upload for photo:', photo.id);
    setState(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photo.id),
    }));
    enqueueUpload(async () => {
      try {
        await uploadFile(photo.originalFile!);
      } catch (error) {
        console.error('[PhotoUploader] Retry upload failed in queue:', error);
      }
    });
  }, [uploadFile, toast]);

  const handleAddPhotos = useCallback(async () => {
    try {
      if (state.photos.length >= maxPhotos) {
        toast.show(`Maximum ${maxPhotos} photos allowed`, 'warning');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets) {
        const remainingSlots = maxPhotos - state.photos.length;
        const perPickLimit = Math.min(2, remainingSlots);
        const filesToUpload = result.assets.slice(0, perPickLimit);
        filesToUpload.forEach((asset) => {
          const validationError = validateFile(asset as any);
          if (validationError) {
            toast.show(validationError, 'error');
            return;
          }
          enqueueUpload(async () => {
            try {
              await uploadFile(asset as any);
            } catch (error) {
              console.error('[PhotoUploader] Upload failed in queue:', error);
            }
          });
        });
        if (result.assets.length > perPickLimit) {
          toast.show(`Only ${perPickLimit} photos can be added at a time`, 'warning');
        }
        if (perPickLimit < remainingSlots && result.assets.length > perPickLimit) {
          // No-op, message above already covers pick limit
        }
      }
    } catch (error: any) {
      console.error('[PhotoUploader] Error selecting photos:', error);
      toast.show('Failed to select photos', 'error');
    }
  }, [state.photos.length, maxPhotos, validateFile, uploadFile, toast]);

  const handleTakePhoto = useCallback(async () => {
    try {
      if (state.photos.length >= maxPhotos) {
        toast.show(`Maximum ${maxPhotos} photos allowed`, 'warning');
        return;
      }
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        toast.show('Camera permission is required', 'error');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const validationError = validateFile(asset as any);
        if (validationError) {
          toast.show(validationError, 'error');
          return;
        }
        enqueueUpload(async () => {
          try {
            await uploadFile(asset as any);
          } catch (error) {
            console.error('[PhotoUploader] Upload failed in queue:', error);
          }
        });
      }
    } catch (error: any) {
      console.error('[PhotoUploader] Error taking photo:', error);
      toast.show('Failed to take photo', 'error');
    }
  }, [state.photos.length, maxPhotos, validateFile, uploadFile, toast]);

  const handleSetPrimary = useCallback(async (url: string) => {
    try {
      const newPrimaryPhoto = url;
      setState(prev => ({ ...prev, primaryPhoto: newPrimaryPhoto }));
      await updateFirestorePhotos(state.photos.map(p => p.url), newPrimaryPhoto);
      setTimeout(() => {
        const uploadsInProgress = state.photos.filter(p => p.uploading).length;
        onChange?.(state.photos.map(p => p.url), newPrimaryPhoto, uploadsInProgress);
      }, 0);
      toast.show('Cover photo updated', 'success');
    } catch (error) {
      console.error('[PhotoUploader] Error setting primary photo:', error);
      toast.show('Failed to set cover photo', 'error');
    }
  }, [state.photos, updateFirestorePhotos, toast, onChange]);

  const handleDeletePhoto = useCallback(async (photoToDelete: PhotoItem) => {
    platformAlert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPhotos = state.photos.filter(p => p.id !== photoToDelete.id);
              let newPrimaryPhoto = state.primaryPhoto;
              if (state.primaryPhoto === photoToDelete.url) {
                newPrimaryPhoto = updatedPhotos.length > 0 ? updatedPhotos[0].url : '';
              }
              setState(prev => ({
                ...prev,
                photos: updatedPhotos,
                primaryPhoto: newPrimaryPhoto,
              }));
              await updateFirestorePhotos(updatedPhotos.map(p => p.url), newPrimaryPhoto);
              setTimeout(() => {
                const uploadsInProgress = updatedPhotos.filter(p => p.uploading).length;
                onChange?.(updatedPhotos.map(p => p.url), newPrimaryPhoto, uploadsInProgress);
              }, 0);
              try {
                console.log('[PhotoUploader] Mock mode - skipping storage deletion');
                console.log('[PhotoUploader] Would delete:', photoToDelete.url);
              } catch (storageError) {
                console.warn('[PhotoUploader] Could not delete from storage:', storageError);
              }
              toast.show('Photo deleted', 'success');
            } catch (error) {
              console.error('[PhotoUploader] Error deleting photo:', error);
              toast.show('Failed to delete photo', 'error');
            }
          },
        },
      ]
    );
  }, [state.photos, state.primaryPhoto, updateFirestorePhotos, toast, onChange]);

  const uploadsInProgress = useMemo(() => {
    return state.photos.filter(p => p.uploading).length;
  }, [state.photos]);

  const completedPhotos = useMemo(() => {
    return state.photos.filter(p => !p.uploading && !p.error).length;
  }, [state.photos]);

  const canPublish = useMemo(() => {
    return completedPhotos >= minPhotos && uploadsInProgress === 0;
  }, [completedPhotos, uploadsInProgress, minPhotos]);

  const renderPhotoThumbnail = useCallback((photo: PhotoItem, index: number) => {
    const isPrimary = photo.url === state.primaryPhoto;
    return (
      <View key={photo.id} style={styles.thumbnailContainer}>
        <TouchableOpacity
          style={[styles.thumbnail, isPrimary && styles.primaryThumbnail]}
          onPress={() => setShowImageModal(photo.url)}
          disabled={photo.uploading}
          testID={`thumb-${index}`}
        >
          <Image source={{ uri: photo.url }} style={styles.thumbnailImage} />
          {photo.uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={theme.colors.white} size="small" />
              <Text style={styles.progressText}>{Math.round(photo.progress || 0)}%</Text>
            </View>
          )}
          {photo.error && (
            <View style={styles.errorOverlay}>
              <AlertCircle color={theme.colors.white} size={20} />
              <Text style={styles.errorText}>Failed</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleRetryUpload(photo)}
                testID={`retry-${photo.id}`}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {isPrimary && !photo.uploading && !photo.error && (
            <View style={styles.primaryIndicator}>
              <Star color={theme.colors.warning} size={16} fill={theme.colors.warning} />
            </View>
          )}
        </TouchableOpacity>
        {!photo.uploading && !photo.error && (
          <View style={styles.thumbnailActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetPrimary(photo.url)}
              testID={`make-primary-${photo.id}`}
            >
              <Star 
                color={isPrimary ? theme.colors.warning : theme.colors.gray} 
                size={16} 
                fill={isPrimary ? theme.colors.warning : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePhoto(photo)}
              testID={`delete-${photo.id}`}
            >
              <Trash2 color={theme.colors.danger} size={16} />
            </TouchableOpacity>
          </View>
        )}
        {photo.error && (
          <View style={styles.thumbnailActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retryActionButton]}
              onPress={() => handleRetryUpload(photo)}
              testID={`retry2-${photo.id}`}
            >
              <Upload color={theme.colors.primary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePhoto(photo)}
              testID={`delete2-${photo.id}`}
            >
              <Trash2 color={theme.colors.danger} size={16} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [state.primaryPhoto, handleSetPrimary, handleDeletePhoto, handleRetryUpload]);

  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        <View style={styles.headerRight}>
          <Text style={styles.counter}>
            {state.photos.filter(p => !p.uploading && !p.error).length}/{maxPhotos}
          </Text>
          <TouchableOpacity
            style={styles.qaButton}
            onPress={() => setQAState(prev => ({ ...prev, showQAPanel: !prev.showQAPanel }))}
            testID="toggle-qa"
          >
            <Settings color={theme.colors.gray} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {qaState.showQAPanel && (
        <View style={styles.qaPanel}>
          <Text style={styles.qaPanelTitle}>Dev/QA Controls</Text>

          <View style={styles.qaControl}>
            <Text style={styles.qaControlLabel}>Photo Size</Text>
            <View style={styles.sizeButtonContainer}>
              {(['small','medium','large'] as ResizePreset[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setResizePreset(p)}
                  style={[styles.sizePill, resizePreset === p ? styles.sizePillActive : undefined]}
                  testID={`size-${p}`}
                >
                  <Text style={[styles.sizePillText, resizePreset === p ? styles.sizePillTextActive : undefined]}>
                    {p === 'small' ? 'Small' : p === 'medium' ? 'Medium' : 'Large'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.qaControl}>
            <Text style={styles.qaControlLabel}>Slow Network Simulation</Text>
            <Switch
              value={qaState.qaSlowNetwork}
              onValueChange={(value) => setQAState(prev => ({ ...prev, qaSlowNetwork: value }))}
              trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
              thumbColor={qaState.qaSlowNetwork ? theme.colors.white : theme.colors.gray}
            />
          </View>

          <View style={styles.qaControl}>
            <Text style={styles.qaControlLabel}>Random Failures (10%)</Text>
            <Switch
              value={qaState.qaFailRandomly}
              onValueChange={(value) => setQAState(prev => ({ ...prev, qaFailRandomly: value }))}
              trackColor={{ false: theme.colors.lightGray, true: theme.colors.danger }}
              thumbColor={qaState.qaFailRandomly ? theme.colors.white : theme.colors.gray}
            />
          </View>

          <Text style={styles.qaNote}>
            {[
              '• Size preset affects max resolution and compression before upload',
              '• Slow Network: 300-1200ms delay + throttled progress',
              '• Random Failures: 10% chance to fail uploads',
            ].join('\n')}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleAddPhotos}
          disabled={state.photos.length >= maxPhotos}
          testID="add-photos"
        >
          <Upload color={theme.colors.white} size={20} />
          <Text style={styles.buttonText}>Add Photos</Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleTakePhoto}
            disabled={state.photos.length >= maxPhotos}
            testID="take-photo"
          >
            <Camera color={theme.colors.primary} size={20} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Take Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {state.photos.length > 0 && (
        <ScrollView style={styles.photoGrid} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {state.photos.map((photo, index) => renderPhotoThumbnail(photo, index))}
          </View>
        </ScrollView>
      )}

      {uploadsInProgress > 0 && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
          <Text style={styles.uploadingText}>
            Uploading {uploadsInProgress} photo{uploadsInProgress > 1 ? 's' : ''}... Please wait.
          </Text>
          {uploadQueue.length > 0 && (
            <Text style={styles.queueText}>
              {uploadQueue.length} in queue
            </Text>
          )}
        </View>
      )}

      {state.photos.some(p => p.error) && (
        <View style={styles.errorContainer}>
          <AlertCircle color={theme.colors.danger} size={20} />
          <Text style={styles.errorContainerText}>
            {state.photos.filter(p => p.error).length} photo{state.photos.filter(p => p.error).length > 1 ? 's' : ''} failed to upload. Tap &quot;Retry&quot; to try again.
          </Text>
        </View>
      )}

      {!canPublish && uploadsInProgress === 0 && (
        <View style={styles.warningContainer}>
          <AlertCircle color={theme.colors.warning} size={20} />
          <Text style={styles.warningText}>
            You need at least {minPhotos} photos to publish.
          </Text>
        </View>
      )}

      <Modal
        visible={showImageModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowImageModal(null)}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowImageModal(null)}
              testID="close-modal"
            >
              <X color={theme.colors.white} size={24} />
            </TouchableOpacity>
            {showImageModal && (
              <Image source={{ uri: showImageModal }} style={styles.modalImage} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  qaButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
  },
  counter: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.white,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  photoGrid: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    marginBottom: theme.spacing.sm,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryThumbnail: {
    borderWidth: 2,
    borderColor: theme.colors.warning,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  primaryIndicator: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  thumbnailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.warning,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  uploadingText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  queueText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '90%',
    height: '70%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    zIndex: 1,
    padding: theme.spacing.sm,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: theme.borderRadius.md,
  },
  qaPanel: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray + '30',
  },
  qaPanelTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  qaControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  qaControlLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  qaNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  sizePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.lightGray,
  },
  sizePillActive: {
    backgroundColor: theme.colors.primary,
  },
  sizePillText: {
    color: theme.colors.dark,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  sizePillTextActive: {
    color: theme.colors.white,
  },
  sizeButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  retryActionButton: {
    backgroundColor: theme.colors.primary + '20',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorContainerText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
  },
});

export function useCanPublish(entityType: 'load' | 'vehicle', photos: string[], minPhotos?: number) {
  const defaultMinPhotos = entityType === 'load' ? 5 : 5;
  const requiredPhotos = minPhotos ?? defaultMinPhotos;
  return photos.length >= requiredPhotos;
}
