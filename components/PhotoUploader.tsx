import React, { useState, useCallback, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Image as ImageIcon, Star } from 'lucide-react-native';
import { getFirebase } from '@/utils/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { theme } from '@/constants/theme';
import { prepareForUpload, humanSize, type AnyImage } from '@/utils/imagePreprocessor';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

type PhotoItem = {
  url: string;
  path: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
};

type PhotoUploaderProps = {
  entityType: 'load' | 'vehicle';
  entityId: string;
  maxPhotos?: number;
  onChange?: (photos: string[], primaryPhoto: string, uploadsInProgress: number) => void;
};

type UploadPrepared = {
  blob: Blob;
  mime: string;
  ext: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export function PhotoUploader({
  entityType,
  entityId,
  maxPhotos = 20,
  onChange,
}: PhotoUploaderProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>('');
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const urls = photos.map(p => p.url);
      onChange(urls, primaryPhoto, uploadsInProgress);
    }
  }, [photos, primaryPhoto, uploadsInProgress, onChange]);

  const updateFirestore = useCallback(async () => {
    try {
      const { db } = getFirebase();
      const collection = entityType === 'vehicle' ? 'vehicles' : 'loads';
      const docRef = doc(db, collection, entityId);
      
      await updateDoc(docRef, {
        photos: photos.filter(p => !p.uploading).map(p => p.url),
        primaryPhoto,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('[PhotoUploader] Firestore update error:', error);
    }
  }, [entityType, entityId, photos, primaryPhoto]);

  const uploadFile = useCallback(
    async (
      input: AnyImage,
      tempId: string,
      onProgressUpdate: (progress: number) => void
    ): Promise<{ url: string; path: string } | null> => {
      try {
        console.log('[PhotoUploader] Starting upload');
        
        const { auth, storage } = getFirebase();
        
        if (!auth.currentUser) {
          console.error('[PhotoUploader] ❌ No authenticated user');
          Alert.alert('Authentication Required', 'Please sign in to upload photos.');
          throw new Error('Not signed in');
        }
        
        const uid = auth.currentUser.uid;
        console.log('[PhotoUploader] ✅ Authenticated user:', uid);

        console.log('[PhotoUploader] Compressing image...');
        const compressed: UploadPrepared = await prepareForUpload(input, {
          maxWidth: Platform.OS === 'web' ? 1600 : 1920,
          maxHeight: Platform.OS === 'web' ? 1200 : 1080,
          baseQuality: 0.8,
        });

        console.log('[PhotoUploader] Compression complete:', {
          compressedSize: humanSize(compressed.sizeBytes),
          dimensions: `${compressed.width}x${compressed.height}`,
        });

        const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const role = user?.role || 'driver';
        
        let fullPath: string;
        if (entityType === 'vehicle') {
          fullPath = `profiles/${uid}/vehicle/${photoId}.${compressed.ext}`;
        } else {
          fullPath = `loads/${entityId}/${role}/${uid}/${photoId}.${compressed.ext}`;
        }

        console.log('[PhotoUploader] 📤 Upload path:', fullPath);

        const storageRef = ref(storage, fullPath);
        const uploadTask = uploadBytesResumable(storageRef, compressed.blob, {
          contentType: compressed.mime,
          cacheControl: 'public,max-age=31536000',
        });

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes)) * 100
              );
              onProgressUpdate(progress);
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

        console.log('[PhotoUploader] ✅ Upload successful');

        return {
          url: downloadURL,
          path: fullPath,
        };
      } catch (error: any) {
        console.error('[PhotoUploader] ❌ Upload error:', error);

        let errorMessage = 'Upload failed';
        
        if (error?.code === 'storage/unauthorized' || error?.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please sign in and try again.';
        } else if (error?.code === 'storage/canceled') {
          errorMessage = 'Upload canceled';
        } else if (error?.code === 'storage/unknown') {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error?.message) {
          errorMessage = error.message;
        }

        Alert.alert('Upload Failed', errorMessage);
        return null;
      }
    },
    [entityType, entityId, user?.role]
  );

  const pickImages = useCallback(async () => {
    try {
      if (photos.length >= maxPhotos) {
        toast.show(`Maximum ${maxPhotos} photos allowed`, 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: maxPhotos - photos.length,
      });

      if (result.canceled) {
        return;
      }

      const selectedAssets = result.assets || [];
      if (selectedAssets.length === 0) {
        return;
      }

      console.log('[PhotoUploader] Selected', selectedAssets.length, 'images');

      // Create temp photo items
      const tempPhotos: PhotoItem[] = selectedAssets.map((asset, index) => ({
        url: asset.uri,
        path: '',
        uploading: true,
        progress: 0,
      }));

      setPhotos(prev => [...prev, ...tempPhotos]);
      setUploadsInProgress(prev => prev + tempPhotos.length);

      // Upload each photo
      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        const tempIndex = photos.length + i;
        const tempId = `temp-${Date.now()}-${i}`;

        const result = await uploadFile(
          { uri: asset.uri },
          tempId,
          (progress) => {
            setPhotos(prev => {
              const updated = [...prev];
              if (updated[tempIndex]) {
                updated[tempIndex] = {
                  ...updated[tempIndex],
                  progress,
                };
              }
              return updated;
            });
          }
        );

        if (result) {
          setPhotos(prev => {
            const updated = [...prev];
            if (updated[tempIndex]) {
              updated[tempIndex] = {
                url: result.url,
                path: result.path,
                uploading: false,
              };
            }
            return updated;
          });

          // Set first photo as primary if none set
          if (!primaryPhoto) {
            setPrimaryPhoto(result.url);
          }
        } else {
          // Remove failed upload
          setPhotos(prev => prev.filter((_, idx) => idx !== tempIndex));
        }

        setUploadsInProgress(prev => prev - 1);
      }

      // Update Firestore
      await updateFirestore();
      
      toast.show('Photos uploaded successfully', 'success');
    } catch (error: any) {
      console.error('[PhotoUploader] Pick images error:', error);
      toast.show('Failed to pick images', 'error');
    }
  }, [photos, maxPhotos, primaryPhoto, uploadFile, toast, updateFirestore]);

  const takePhoto = useCallback(async () => {
    try {
      if (photos.length >= maxPhotos) {
        toast.show(`Maximum ${maxPhotos} photos allowed`, 'error');
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const tempIndex = photos.length;
      const tempId = `temp-${Date.now()}`;

      // Add temp photo
      const tempPhoto: PhotoItem = {
        url: asset.uri,
        path: '',
        uploading: true,
        progress: 0,
      };

      setPhotos(prev => [...prev, tempPhoto]);
      setUploadsInProgress(prev => prev + 1);

      const uploadResult = await uploadFile(
        { uri: asset.uri },
        tempId,
        (progress) => {
          setPhotos(prev => {
            const updated = [...prev];
            if (updated[tempIndex]) {
              updated[tempIndex] = {
                ...updated[tempIndex],
                progress,
              };
            }
            return updated;
          });
        }
      );

      if (uploadResult) {
        setPhotos(prev => {
          const updated = [...prev];
          if (updated[tempIndex]) {
            updated[tempIndex] = {
              url: uploadResult.url,
              path: uploadResult.path,
              uploading: false,
            };
          }
          return updated;
        });

        // Set as primary if first photo
        if (!primaryPhoto) {
          setPrimaryPhoto(uploadResult.url);
        }

        await updateFirestore();
        toast.show('Photo uploaded successfully', 'success');
      } else {
        setPhotos(prev => prev.filter((_, idx) => idx !== tempIndex));
      }

      setUploadsInProgress(prev => prev - 1);
    } catch (error: any) {
      console.error('[PhotoUploader] Take photo error:', error);
      toast.show('Failed to take photo', 'error');
    }
  }, [photos, maxPhotos, primaryPhoto, uploadFile, toast, updateFirestore]);

  const removePhoto = useCallback(async (photo: PhotoItem, index: number) => {
    try {
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
                // Delete from storage
                if (photo.path) {
                  const { storage } = getFirebase();
                  const storageRef = ref(storage, photo.path);
                  await deleteObject(storageRef);
                }

                // Remove from state
                setPhotos(prev => prev.filter((_, idx) => idx !== index));

                // Update primary if needed
                if (primaryPhoto === photo.url) {
                  const remaining = photos.filter((_, idx) => idx !== index);
                  setPrimaryPhoto(remaining[0]?.url || '');
                }

                await updateFirestore();
                toast.show('Photo deleted', 'success');
              } catch (error: any) {
                console.error('[PhotoUploader] Delete error:', error);
                toast.show('Failed to delete photo', 'error');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[PhotoUploader] Remove photo error:', error);
    }
  }, [photos, primaryPhoto, toast, updateFirestore]);

  const setPrimary = useCallback(async (url: string) => {
    setPrimaryPhoto(url);
    await updateFirestore();
    toast.show('Primary photo updated', 'success');
  }, [toast, updateFirestore]);



  const canAddMore = photos.length < maxPhotos && uploadsInProgress === 0;

  return (
    <View style={styles.container}>
      {/* Photo Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <TouchableOpacity
                onPress={() => !photo.uploading && setSelectedPhoto(photo.url)}
                disabled={photo.uploading}
              >
                <Image source={{ uri: photo.url }} style={styles.photo} />
                
                {photo.uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={theme.colors.white} />
                    <Text style={styles.progressText}>{photo.progress}%</Text>
                  </View>
                )}

                {!photo.uploading && primaryPhoto === photo.url && (
                  <View style={styles.primaryBadge}>
                    <Star size={12} color={theme.colors.warning} fill={theme.colors.warning} />
                  </View>
                )}
              </TouchableOpacity>

              {!photo.uploading && (
                <View style={styles.photoActions}>
                  {primaryPhoto !== photo.url && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setPrimary(photo.url)}
                    >
                      <Star size={14} color={theme.colors.white} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => removePhoto(photo, index)}
                  >
                    <X size={14} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* Add Photo Buttons */}
          {canAddMore && (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={pickImages}
              >
                <ImageIcon size={24} color={theme.colors.primary} />
                <Text style={styles.addButtonText}>Gallery</Text>
              </TouchableOpacity>

              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={takePhoto}
                >
                  <Camera size={24} color={theme.colors.primary} />
                  <Text style={styles.addButtonText}>Camera</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Photo Counter */}
      <Text style={styles.counter}>
        {photos.length} / {maxPhotos} photos
        {uploadsInProgress > 0 && ` (${uploadsInProgress} uploading...)`}
      </Text>

      {/* Full Size Photo Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <X size={24} color={theme.colors.white} />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullSizePhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
  },
  photoScroll: {
    marginBottom: theme.spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    fontWeight: '600' as const,
  },
  primaryBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  photoActions: {
    position: 'absolute',
    bottom: theme.spacing.xs,
    right: theme.spacing.xs,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 6,
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
  },
  addButtonText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  counter: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullSizePhoto: {
    width: '90%',
    height: '80%',
  },
});

export default PhotoUploader;
