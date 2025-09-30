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
import { theme } from '@/constants/theme';

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
        const compressed = await prepareForUpload(input, {
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

  const pickImages = useCallback(async () => {
    if (disabled || uploading) return;
    
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      Alert.alert('Maximum Photos', `You can only upload ${maxPhotos} photos.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: remaining,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const newPhotos = [...photos];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const tempIndex = newPhotos.length;
        
        newPhotos.push({
          url: asset.uri,
          path: null,
          uploading: true,
          progress: 0,
        });
        
        onPhotosChange(newPhotos);

        const uploaded = await uploadFile(
          asset.uri,
          tempIndex,
          (idx, progress) => {
            newPhotos[idx] = {
              ...newPhotos[idx],
              progress,
            };
            onPhotosChange([...newPhotos]);
          }
        );

        if (uploaded) {
          newPhotos[tempIndex] = {
            ...uploaded,
            uploading: false,
          };
        } else {
          newPhotos[tempIndex] = {
            ...newPhotos[tempIndex],
            uploading: false,
            error: 'Upload failed',
          };
        }
        
        onPhotosChange([...newPhotos]);
      }
    } catch (error: any) {
      console.error('[PhotoUploader] Pick images error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [photos, maxPhotos, disabled, uploading, onPhotosChange, uploadFile]);

  const takePhoto = useCallback(async () => {
    if (disabled || uploading) return;
    
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      Alert.alert('Maximum Photos', `You can only upload ${maxPhotos} photos.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const newPhotos = [...photos];
      const asset = result.assets[0];
      const tempIndex = newPhotos.length;
      
      newPhotos.push({
        url: asset.uri,
        path: null,
        uploading: true,
        progress: 0,
      });
      
      onPhotosChange(newPhotos);

      const uploaded = await uploadFile(
        asset.uri,
        tempIndex,
        (idx, progress) => {
          newPhotos[idx] = {
            ...newPhotos[idx],
            progress,
          };
          onPhotosChange([...newPhotos]);
        }
      );

      if (uploaded) {
        newPhotos[tempIndex] = {
          ...uploaded,
          uploading: false,
        };
      } else {
        newPhotos[tempIndex] = {
          ...newPhotos[tempIndex],
          uploading: false,
          error: 'Upload failed',
        };
      }
      
      onPhotosChange([...newPhotos]);
    } catch (error: any) {
      console.error('[PhotoUploader] Take photo error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [photos, maxPhotos, disabled, uploading, onPhotosChange, uploadFile]);

  const removePhoto = useCallback(async (index: number) => {
    const photo = photos[index];
    
    if (photo.uploading) {
      Alert.alert('Upload in Progress', 'Please wait for the upload to complete before removing.');
      return;
    }

    try {
      if (photo.path) {
        const { storage } = getFirebase();
        const storageRef = ref(storage, photo.path);
        await deleteObject(storageRef);
        console.log('[PhotoUploader] Photo deleted from storage:', photo.path);
      }

      const newPhotos = photos.filter((_, i) => i !== index);
      onPhotosChange(newPhotos);
    } catch (error: any) {
      console.error('[PhotoUploader] Remove photo error:', error);
      if (error?.code !== 'storage/object-not-found') {
        Alert.alert('Error', 'Failed to remove photo. Please try again.');
      } else {
        const newPhotos = photos.filter((_, i) => i !== index);
        onPhotosChange(newPhotos);
      }
    }
  }, [photos, onPhotosChange]);

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={pickImages}
          disabled={disabled || uploading}
        >
          <ImageIcon size={20} color={theme.colors.white} />
          <Text style={styles.buttonText}>Choose Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={takePhoto}
          disabled={disabled || uploading}
        >
          <Camera size={20} color={theme.colors.white} />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo.url }} style={styles.photo} />
              
              {photo.uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color={theme.colors.white} />
                  {photo.progress !== undefined && (
                    <Text style={styles.progressText}>{photo.progress}%</Text>
                  )}
                </View>
              )}

              {photo.error && (
                <View style={styles.errorOverlay}>
                  <Text style={styles.errorText}>Failed</Text>
                </View>
              )}

              {!photo.uploading && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                >
                  <X size={16} color={theme.colors.white} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.hint}>
        {photos.length} / {maxPhotos} photos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  photoScroll: {
    marginTop: 8,
  },
  photoContainer: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.lightGray,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'center',
  },
});
