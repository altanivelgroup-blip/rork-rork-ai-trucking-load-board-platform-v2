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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { MAX_PHOTOS } from '@/utils/photos';

type PhotoItem = {
  url: string;
  path: string | null;
  uploading?: boolean;
  error?: string;
};

type PhotoUploaderProps = {
  draftId: string;
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
};

export default function PhotoUploader({
  draftId,
  photos,
  onPhotosChange,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(
    async (uri: string): Promise<PhotoItem | null> => {
      try {
        console.log('[PhotoUploader] Starting upload for:', uri);

        const { auth, storage } = getFirebase();
        const uid = auth?.currentUser?.uid;

        if (!uid) {
          throw new Error('Not signed in — please log in before uploading photos.');
        }

        const safeId = String(draftId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '_');
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const basePath = `loads/${uid}/${safeId}`;
        const fullPath = `${basePath}/${photoId}.${ext}`;

        console.log('[PhotoUploader] Upload path:', fullPath);

        const response = await fetch(uri);
        const blob = await response.blob();

        console.log('[PhotoUploader] Blob created:', {
          size: blob.size,
          type: blob.type,
        });

        const storageRef = ref(storage, fullPath);
        await uploadBytes(storageRef, blob);

        console.log('[PhotoUploader] Upload complete, getting download URL...');

        const downloadURL = await getDownloadURL(storageRef);

        console.log('[PhotoUploader] ✅ Upload successful:', {
          path: fullPath,
          url: downloadURL.slice(0, 100) + '...',
        });

        return {
          url: downloadURL,
          path: fullPath,
        };
      } catch (error: any) {
        console.error('[PhotoUploader] Upload error:', {
          code: error?.code,
          message: error?.message,
          uri,
        });

        let errorMessage = 'Upload failed';
        if (error?.code === 'storage/unauthorized') {
          errorMessage = 'Permission denied. Please check your account.';
        } else if (error?.code === 'storage/canceled') {
          errorMessage = 'Upload canceled';
        } else if (error?.code === 'storage/unknown') {
          errorMessage = 'Network error. Please try again.';
        } else if (error?.message) {
          errorMessage = error.message;
        }

        Alert.alert('Upload Failed', errorMessage);
        return null;
      }
    },
    [draftId]
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
        quality: 0.8,
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
      }));

      onPhotosChange([...photos, ...tempPhotos]);

      const uploadPromises = selectedUris.map((uri) => uploadFile(uri));
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
        quality: 0.8,
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
      };

      onPhotosChange([...photos, tempPhoto]);

      const uploadedPhoto = await uploadFile(uri);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.count}>
          {photos.length} / {maxPhotos}
        </Text>
      </View>

      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroll}
          contentContainerStyle={styles.photosContent}
        >
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image
                source={{ uri: photo.url }}
                style={styles.photo}
                resizeMode="cover"
              />
              {photo.uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
