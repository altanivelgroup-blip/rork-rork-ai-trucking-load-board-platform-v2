import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Image as ImageIcon } from 'lucide-react-native';
import { getFirebase } from '@/utils/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { MAX_PHOTOS } from '@/utils/photos';
import { prepareForUpload, humanSize, type AnyImage } from '@/utils/imagePreprocessor';
import { useAuth } from '@/hooks/useAuth';

type PhotoItem = {
  url: string;
  path: string | null;
  uploading?: boolean;
  progress?: number;
  error?: string;
};

type PhotoUploaderProps = {
  draftId: string;
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  context?: 'load' | 'vehicle' | 'document' | 'other';
};

type UploadPrepared = {
  blob: Blob;
  mime: string;
  ext: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export default function PhotoUploader({
  draftId,
  photos,
  onPhotosChange,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
  context = 'load',
}: PhotoUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<PhotoItem[]>(photos);

  const uploadFile = useCallback(
    async (
      input: AnyImage,
      index: number,
      onProgressUpdate: (index: number, progress: number) => void
    ): Promise<PhotoItem | null> => {
      try {
        console.log('[PhotoUploader] Starting upload for input');
        console.log('[PhotoUploader] Context:', context);
        console.log('[PhotoUploader] DraftId:', draftId);

        const { auth, storage } = getFirebase();
        
        if (!auth.currentUser) {
          console.error('[PhotoUploader] ❌ No authenticated user');
          Alert.alert('Authentication Required', 'Please sign in to upload photos.');
          throw new Error('Not signed in');
        }
        
        const uid = auth.currentUser.uid;
        console.log('[PhotoUploader] ✅ Authenticated user:', uid);
        console.log('[PhotoUploader] User email:', auth.currentUser.email);
        console.log('[PhotoUploader] Is anonymous:', auth.currentUser.isAnonymous);

        console.log('[PhotoUploader] Compressing image...');
        const compressed: UploadPrepared = await prepareForUpload(input, {
          maxWidth: Platform.OS === 'web' ? 1600 : 1920,
          maxHeight: Platform.OS === 'web' ? 1200 : 1080,
          baseQuality: 0.8,
        });

        console.log('[PhotoUploader] Compression complete:', {
          originalSize: 'unknown',
          compressedSize: humanSize(compressed.sizeBytes),
          dimensions: `${compressed.width}x${compressed.height}`,
        });

        const safeId = String(draftId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '_');
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const role = user?.role || 'driver';
        
        let fullPath: string;
        if (context === 'vehicle' || context === 'document' || safeId.startsWith('driver-') || safeId.startsWith('shipper-')) {
          fullPath = `profiles/${uid}/${context || 'vehicle'}/${photoId}.${compressed.ext}`;
        } else {
          fullPath = `loads/${safeId}/${role}/${uid}/${photoId}.${compressed.ext}`;
        }

        console.log('[PhotoUploader] 📤 Upload details:', {
          path: fullPath,
          uid,
          role,
          context,
          safeId,
          isAuthenticated: !!auth.currentUser,
          userEmail: auth.currentUser?.email,
          isAnonymous: auth.currentUser?.isAnonymous,
          fileSize: humanSize(compressed.sizeBytes),
        });

        console.log('[PhotoUploader] 📁 Creating storage reference...');
        const storageRef = ref(storage, fullPath);
        console.log('[PhotoUploader] Storage ref created:', storageRef.fullPath);
        
        console.log('[PhotoUploader] 🚀 Starting upload task...');
        const uploadTask = uploadBytesResumable(storageRef, compressed.blob, {
          contentType: compressed.mime,
          cacheControl: 'public,max-age=31536000',
        });
        
        console.log('[PhotoUploader] ✅ Upload task created successfully');

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes)) * 100
              );
              onProgressUpdate(index, progress);
              console.log('[PhotoUploader] Upload progress:', progress + '%', snapshot.bytesTransferred, '/', snapshot.totalBytes);
            },
            (error) => {
              console.error('[PhotoUploader] Upload error:', error);
              reject(error);
            },
            () => {
              console.log('[PhotoUploader] Upload complete');
              resolve();
            }
          );
        });

        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        console.log('[PhotoUploader] ✅ Upload successful:', {
          path: fullPath,
          url: downloadURL.slice(0, 100) + '...',
        });

        return {
          url: downloadURL,
          path: fullPath,
        };
      } catch (error: any) {
        const { auth: authInstance } = getFirebase();
        
        console.error('[PhotoUploader] ❌ Upload error:', {
          code: error?.code,
          message: error?.message,
          name: error?.name,
          stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
          input,
        });

        let errorMessage = 'Upload failed';
        let errorTitle = 'Upload Failed';
        
        if (error?.code === 'storage/unauthorized' || error?.code === 'permission-denied') {
          errorTitle = 'Permission Denied';
          errorMessage = 'Storage permission denied. Please check:\n\n1. You are signed in\n2. Storage rules are deployed\n3. Try signing out and back in';
          console.error('[PhotoUploader] ❌ Permission denied - auth state:', {
            hasCurrentUser: !!authInstance?.currentUser,
            uid: authInstance?.currentUser?.uid,
            email: authInstance?.currentUser?.email,
            isAnonymous: authInstance?.currentUser?.isAnonymous,
            context,
            draftId,
          });
        } else if (error?.code === 'storage/canceled') {
          errorMessage = 'Upload canceled';
        } else if (error?.code === 'storage/unknown') {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error?.message) {
          errorMessage = error.message;
        }

        Alert.alert(errorTitle, errorMessage);
        return null;
      }
    },
    [draftId, user?.role, context]
  );

  // The rest of the code (pickImages, takePhoto, removePhoto, and return JSX) remains the same as your original.
  // No changes needed there—it's already clean!

  // ... (paste the rest of your original code here, from pickImages onward)
}

// Styles remain the same
const styles = StyleSheet.create({
  // ... (your original styles)
});