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
import { prepareForUpload, humanSize } from '@/utils/imagePreprocessor';
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
      uri: string,
      index: number,
      onProgressUpdate: (index: number, progress: number) => void
    ): Promise<PhotoItem | null> => {
      try {
        console.log('[PhotoUploader] Starting upload for:', uri);
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
        const compressed = await prepareForUpload(uri, {
          maxWidth: 1920,
          maxHeight: 1080,
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
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              onProgressUpdate(index, progress);
              console.log('[PhotoUploader] Upload progress:', progress + '%');
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
          uri,
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
    if (disabled) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to upload images.'
        );
        return;
      }

      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) {
        Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1.0,
        selectionLimit: remaining,
      });

      if (result.canceled) return;

      setUploading(true);

      const selectedUris = result.assets.map((asset) => asset.uri);
      console.log('[PhotoUploader] Selected images:', selectedUris.length);

      const tempPhotos: PhotoItem[] = selectedUris.map((uri) => ({
        url: uri,
        path: null,
        uploading: true,
        progress: 0,
      }));

      const startIndex = photos.length;
      const photosWithTemp = [...photos, ...tempPhotos];
      setLocalPhotos(photosWithTemp);
      onPhotosChange(photosWithTemp);

      const handleProgressUpdate = (relativeIndex: number, progress: number) => {
        setLocalPhotos((currentPhotos: PhotoItem[]) => {
          const absoluteIndex = startIndex + relativeIndex;
          const updated = [...currentPhotos];
          if (updated[absoluteIndex]) {
            updated[absoluteIndex] = {
              ...updated[absoluteIndex],
              progress,
            };
          }
          return updated;
        });
      };

      const uploadPromises = selectedUris.map((uri, idx) =>
        uploadFile(uri, idx, handleProgressUpdate)
      );
      const uploadedPhotos = await Promise.all(uploadPromises);

      const successfulUploads = uploadedPhotos.filter(
        (photo): photo is PhotoItem => photo !== null
      );

      const updatedPhotos = photos.concat(successfulUploads);
      onPhotosChange(updatedPhotos);

      console.log('[PhotoUploader] ✅ All uploads complete:', {
        attempted: selectedUris.length,
        successful: successfulUploads.length,
      });
    } catch (error: any) {
      console.error('[PhotoUploader] Pick images error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [disabled, maxPhotos, photos, onPhotosChange, uploadFile]);

  const takePhoto = useCallback(async () => {
    if (disabled) return;

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera access to take photos.'
        );
        return;
      }

      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) {
        Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1.0,
        allowsEditing: false,
      });

      if (result.canceled) return;

      setUploading(true);

      const uri = result.assets[0].uri;
      console.log('[PhotoUploader] Captured photo:', uri);

      const tempPhoto: PhotoItem = {
        url: uri,
        path: null,
        uploading: true,
        progress: 0,
      };

      const startIndex = photos.length;
      const photosWithTemp = [...photos, tempPhoto];
      setLocalPhotos(photosWithTemp);
      onPhotosChange(photosWithTemp);

      const handleProgressUpdate = (relativeIndex: number, progress: number) => {
        setLocalPhotos((currentPhotos: PhotoItem[]) => {
          const updated = [...currentPhotos];
          if (updated[startIndex]) {
            updated[startIndex] = {
              ...updated[startIndex],
              progress,
            };
          }
          return updated;
        });
      };

      const uploadedPhoto = await uploadFile(uri, 0, handleProgressUpdate);

      if (uploadedPhoto) {
        const updatedPhotos = [...photos, uploadedPhoto];
        onPhotosChange(updatedPhotos);
        console.log('[PhotoUploader] ✅ Camera photo uploaded');
      } else {
        onPhotosChange(photos);
      }
    } catch (error: any) {
      console.error('[PhotoUploader] Take photo error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [disabled, maxPhotos, photos, onPhotosChange, uploadFile]);

  const removePhoto = useCallback(
    async (index: number) => {
      if (disabled) return;

      const photo = photos[index];
      if (!photo) return;

      try {
        if (photo.path) {
          console.log('[PhotoUploader] Deleting from storage:', photo.path);
          const { storage } = getFirebase();
          const storageRef = ref(storage, photo.path);
          await deleteObject(storageRef);
          console.log('[PhotoUploader] ✅ Deleted from storage');
        }

        const updatedPhotos = photos.filter((_, i) => i !== index);
        onPhotosChange(updatedPhotos);
      } catch (error: any) {
        console.error('[PhotoUploader] Delete error:', error);
        if (error?.code === 'storage/object-not-found') {
          const updatedPhotos = photos.filter((_, i) => i !== index);
          onPhotosChange(updatedPhotos);
        } else {
          Alert.alert('Error', 'Failed to delete photo. Please try again.');
        }
      }
    },
    [disabled, photos, onPhotosChange]
  );

  const remaining = maxPhotos - photos.length;

  const displayPhotos = localPhotos.length > 0 ? localPhotos : photos;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.count}>
          {displayPhotos.length} / {maxPhotos}
        </Text>
      </View>

      {displayPhotos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroll}
          contentContainerStyle={styles.photosContent}
        >
          {displayPhotos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image
                source={{ uri: photo.url }}
                style={styles.photo}
                resizeMode="cover"
              />
              {photo.uploading && (
                <View style={styles.uploadingOverlay}>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${photo.progress || 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {photo.progress || 0}%
                    </Text>
                  </View>
                </View>
              )}
              {!photo.uploading && !disabled && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                  testID={`remove-photo-${index}`}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {remaining > 0 && !disabled && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, uploading && styles.actionButtonDisabled]}
            onPress={pickImages}
            disabled={uploading}
            testID="pick-images-button"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <ImageIcon size={20} color="#007AFF" />
                <Text style={styles.actionText}>Choose Photos</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.actionButton, uploading && styles.actionButtonDisabled]}
              onPress={takePhoto}
              disabled={uploading}
              testID="take-photo-button"
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <Camera size={20} color="#007AFF" />
                  <Text style={styles.actionText}>Take Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {remaining <= 0 && (
        <Text style={styles.limitText}>Maximum photos reached</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
  photosScroll: {
    marginHorizontal: -16,
  },
  photosContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  limitText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
