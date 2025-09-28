// components/PhotoUploader.tsx — CLEAN IMPORTS
import uuid from 'react-native-uuid';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, Star, Trash2, X, AlertCircle, Settings } from 'lucide-react-native';

import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
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
  // Reduced sizes and quality to improve upload reliability
  if (preset === 'small') return { maxWidth: 1024, maxHeight: 768, baseQuality: 0.65 } as const;
  if (preset === 'large') return { maxWidth: 1600, maxHeight: 1200, baseQuality: 0.75 } as const;
  return { maxWidth: 1280, maxHeight: 960, baseQuality: 0.7 } as const;
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

const MAX_CONCURRENCY = 1; // Reduced from 2 to prevent network congestion
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

// Check network connectivity before upload
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Simple connectivity test
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Check Firebase Storage connectivity specifically
async function checkFirebaseStorageConnectivity(): Promise<boolean> {
  try {
    const { storage } = getFirebase();
    const { ref, getMetadata } = await import('firebase/storage');
    
    // Try to get metadata for a non-existent file (this tests connectivity without uploading)
    const testRef = ref(storage, 'connectivity-test/test.txt');
    await getMetadata(testRef);
    
    // If we get here without error, storage is reachable
    return true;
  } catch (error: any) {
    // If error is 'object-not-found', that means we can reach Firebase Storage
    // Any other error means connectivity issues
    return error?.code === 'storage/object-not-found';
  }
}

async function uploadSmart(path: string, blob: Blob, mime: string, key: string, updateProgress?: (progress: number) => void): Promise<string> {
  const { storage } = getFirebase();
  console.log('[PhotoUploader] Uploading to Firebase Storage path:', path);
  
  // Check network connectivity first
  const isConnected = await checkNetworkConnectivity();
  if (!isConnected) {
    throw new Error('No internet connection - please check your network and try again');
  }
  
  // Check Firebase Storage connectivity
  const isStorageConnected = await checkFirebaseStorageConnectivity();
  if (!isStorageConnected) {
    throw new Error('Cannot reach Firebase Storage - please check your connection and try again');
  }
  
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 30000; // 30 seconds timeout (reduced from 60s)
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[PhotoUploader] Upload attempt ${attempt}/${MAX_RETRIES}`);
      
      const storageRef = ref(storage, path);
      
      // Use resumable upload with progress tracking and timeout
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: mime,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      });
      
      return await new Promise<string>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null;
        let isCompleted = false;
        
        // Set timeout with better error handling
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            isCompleted = true;
            console.warn(`[PhotoUploader] Upload timeout after ${TIMEOUT_MS}ms`);
            try {
              uploadTask.cancel();
            } catch (cancelError) {
              console.warn('[PhotoUploader] Error canceling upload:', cancelError);
            }
            reject(new Error(`Upload timeout after ${TIMEOUT_MS/1000}s - check your connection and try again`));
          }
        }, TIMEOUT_MS);
        
        uploadTask.on('state_changed',
          (snapshot) => {
            if (isCompleted) return;
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            updateProgress?.(progress);
            console.log('[PhotoUploader] Upload progress:', Math.round(progress) + '%');
          },
          (error) => {
            if (isCompleted) return;
            isCompleted = true;
            if (timeoutId) clearTimeout(timeoutId);
            console.error('[PhotoUploader] Upload error:', error);
            reject(error);
          },
          async () => {
            if (isCompleted) return;
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              isCompleted = true;
              if (timeoutId) clearTimeout(timeoutId);
              console.log('[PhotoUploader] Upload completed, URL:', downloadURL);
              resolve(downloadURL);
            } catch (error) {
              if (isCompleted) return;
              isCompleted = true;
              if (timeoutId) clearTimeout(timeoutId);
              console.error('[PhotoUploader] Error getting download URL:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      console.error(`[PhotoUploader] Upload attempt ${attempt} failed:`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff with jitter)
      const baseWait = 1000 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
      const waitTime = Math.min(baseWait + jitter, 15000);
      console.log(`[PhotoUploader] Waiting ${Math.round(waitTime)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Upload failed after all retries');
}

async function uploadWithFallback(
  basePath: string,
  input: any,
  updateProgress?: (progress: number) => void,
  resizeOpts?: { maxWidth?: number; maxHeight?: number; baseQuality?: number }
): Promise<string> {
  try {
    console.log('[PhotoUploader] Starting upload with fallback...');
    const { blob, mime, ext } = await prepareForUpload(input, resizeOpts);
    const key = uuid.v4() as string;
    const path = `${basePath}/${key}.${ext}`;
    
    console.log('[PhotoUploader] Prepared for upload:', {
      path,
      mimeType: mime,
      extension: ext,
      blobSize: blob.size
    });

    try {
      // Test Firebase connectivity before attempting upload
      const { storage } = getFirebase();
      console.log('[PhotoUploader] Firebase Storage instance:', !!storage);
      
      const url = await uploadSmart(path, blob, mime, key, updateProgress);
      console.log('[PhotoUploader] ✅ Upload successful:', url);
      return url;
    } catch (err: any) {
      const code = String(err?.code || err?.message || "");
      console.error('[PhotoUploader] ❌ Upload failed:', {
        code: err?.code,
        message: err?.message,
        fullError: err
      });

      // If Firebase hit retry-limit, try a smaller, non-resumable upload once
      if (code.includes('retry-limit-exceeded')) {
        try {
          console.log('[PhotoUploader] Retrying with stronger compression and non-resumable upload');
          const smaller = await prepareForUpload(input, { maxWidth: 1024, maxHeight: 1024, baseQuality: 0.6 });
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const altRef = ref(getFirebase().storage, path.replace(/(\.[a-z0-9]+)$/i, '-sm$1'));
          updateProgress?.(90);
          const result = await uploadBytes(altRef, smaller.blob, { contentType: smaller.mime, cacheControl: 'public, max-age=31536000' });
          const altUrl = await getDownloadURL(result.ref);
          updateProgress?.(100);
          console.log('[PhotoUploader] ✅ Fallback non-resumable upload succeeded');
          return altUrl;
        } catch (fallbackErr: any) {
          console.error('[PhotoUploader] ❌ Fallback non-resumable upload failed:', fallbackErr);
          throw err;
        }
      }
      
      // For other transient errors, surface to caller so UI can prompt retry
      if (code.includes('timeout') || code.includes('network') || code.includes('connection')) {
        throw err;
      }
      
      // For non-network errors, use a temporary placeholder to keep UX moving
      console.log('[PhotoUploader] Using fallback placeholder image');
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
  
  // Track saved photos count
  const savedPhotosCount = useMemo(() => {
    return state.photos.filter(p => !p.uploading && !p.error && p.url.startsWith('https://')).length;
  }, [state.photos]);

  const loadPhotos = useCallback(async () => {
    try {
      console.log('[PhotoUploader] Loading photos for', entityType, entityId);
      const { db } = getFirebase();
      const collectionName = entityType === 'load' ? LOADS_COLLECTION : VEHICLES_COLLECTION;
      const docRef = doc(db, collectionName, entityId);
      const snap = await getDoc(docRef);

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
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('[PhotoUploader] Error loading photos:', error);
      toast.show('Failed to load photos', 'error');
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
      // Skip permission check for now - auth is sufficient
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
          errorMessage = 'Network too slow. Try: 1) Smaller photo size 2) Better connection 3) Wait and retry.';
        } else if (code.includes('timeout')) {
          errorMessage = 'Upload timed out. Check connection and try smaller photo.';
        } else if (code.includes('network') || code.includes('connection')) {
          errorMessage = 'Network error. Check your internet connection and retry.';
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
    Alert.alert(
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
            {savedPhotosCount}/{maxPhotos}
          </Text>
          {savedPhotosCount > 0 && (
            <Text style={styles.savedCounter}>
              {savedPhotosCount} saved
            </Text>
          )}
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
            <View style={styles.sizePresetContainer}>
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
  savedCounter: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '600' as const,
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
  sizePresetContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});

export function useCanPublish(entityType: 'load' | 'vehicle', photos: string[], minPhotos?: number) {
  const defaultMinPhotos = entityType === 'load' ? 5 : 5;
  const requiredPhotos = minPhotos ?? defaultMinPhotos;
  return photos.length >= requiredPhotos;
}
