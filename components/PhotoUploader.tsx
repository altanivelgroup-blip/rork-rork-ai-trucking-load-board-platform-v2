import uuid from 'react-native-uuid';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X, AlertCircle, CheckCircle } from 'lucide-react-native';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/components/Toast';

export interface PhotoData {
  id: string;
  uri: string;
  uploadUrl?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  timestamp: number;
}

interface PhotoUploaderProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  storagePath: string;
  mockMode?: boolean;
}

export default function PhotoUploader({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  storagePath,
  mockMode = true,
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    console.log('[PhotoUploader] Loading photos, count:', photos.length);
  }, [photos]);

  const requestPermissions = async () => {
    console.log('[PhotoUploader] Requesting camera permissions');
    
    // Request both camera and media library permissions
    const [mediaLibraryResult, cameraResult] = await Promise.all([
      ImagePicker.requestMediaLibraryPermissionsAsync(),
      ImagePicker.requestCameraPermissionsAsync()
    ]);
    
    if (mediaLibraryResult.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library permissions to upload photos.');
      return false;
    }
    
    if (cameraResult.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return false;
    }
    
    return true;
  };

  const pickImage = async () => {
    console.log('[PhotoUploader] Starting image picker');
    
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    try {
      // Request media library permission specifically
      console.log('[PhotoUploader] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[PhotoUploader] Media library permission status:', status);
      
      if (Platform.OS !== 'web' && status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permissions to select photos.');
        return;
      }

      console.log('[PhotoUploader] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 20,
      });

      console.log('[PhotoUploader] Image picker result:', { canceled: result.canceled, assetsLength: result.assets?.length });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[PhotoUploader] Images selected, creating photo data for', result.assets.length);
        const newPhotos: PhotoData[] = result.assets.map((asset) => ({
          id: uuid.v4() as string,
          uri: asset.uri,
          status: 'pending',
          timestamp: Date.now(),
        }));

        const updatedPhotos = [...photos, ...newPhotos].slice(0, maxPhotos);
        onPhotosChange(updatedPhotos);
        
        // Start upload immediately for each new photo
        console.log('[PhotoUploader] 🚀 Starting uploads for', newPhotos.length, 'new photos');
        newPhotos.forEach((p) => {
          console.log('[PhotoUploader] 📤 Queuing upload for photo:', p.id);
          uploadPhoto(p);
        });
      } else {
        console.log('[PhotoUploader] Image picker was canceled or no assets');
      }
    } catch (error) {
      console.error('[PhotoUploader] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    console.log('[PhotoUploader] Starting camera');
    
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    try {
      // Request camera permission specifically
      console.log('[PhotoUploader] Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[PhotoUploader] Camera permission status:', status);
      
      if (Platform.OS !== 'web' && status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
        return;
      }

      console.log('[PhotoUploader] Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('[PhotoUploader] Camera result:', { canceled: result.canceled, assetsLength: result.assets?.length });

      if (!result.canceled && result.assets[0]) {
        console.log('[PhotoUploader] Photo taken, creating photo data');
        const newPhoto: PhotoData = {
          id: uuid.v4() as string,
          uri: result.assets[0].uri,
          status: 'pending',
          timestamp: Date.now(),
        };

        const updatedPhotos = [...photos, newPhoto];
        onPhotosChange(updatedPhotos);
        
        // Start upload immediately
        console.log('[PhotoUploader] 📤 Queuing upload for camera photo:', newPhoto.id);
        uploadPhoto(newPhoto);
      } else {
        console.log('[PhotoUploader] Camera was canceled or no assets');
      }
    } catch (error) {
      console.error('[PhotoUploader] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadSmart = async (photo: PhotoData): Promise<string> => {
    if (mockMode) {
      console.log('[PhotoUploader] Starting fake upload for photo:', photo.id);
      
      // Simulate progress updates with proper state updates
      updatePhotoProgress(photo.id, 10);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updatePhotoProgress(photo.id, 30);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updatePhotoProgress(photo.id, 60);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updatePhotoProgress(photo.id, 90);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updatePhotoProgress(photo.id, 100);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return a fake URL
      const fakeUrl = `https://picsum.photos/800/600?random=${photo.id}`;
      console.log('[PhotoUploader] ✅ Fake upload completed for photo:', photo.id, 'URL:', fakeUrl);
      return fakeUrl;
    } else {
      console.log('[PhotoUploader] Real mode: uploading to Firebase for photo', photo.id);
      
      try {
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        
        const fileName = `${Date.now()}_${photo.id}.jpg`;
        const storageRef = ref(storage, `${storagePath}/${fileName}`);
        
        return new Promise((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, blob);
          
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('[PhotoUploader] Upload progress for', photo.id, ':', Math.round(progress) + '%');
              updatePhotoProgress(photo.id, progress);
            },
            (error) => {
              console.error('[PhotoUploader] Upload error for photo', photo.id, ':', error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                console.log('[PhotoUploader] ✅ Real upload completed for photo:', photo.id, 'URL:', downloadURL);
                resolve(downloadURL);
              } catch (error) {
                console.error('[PhotoUploader] Error getting download URL for photo', photo.id, ':', error);
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        console.error('[PhotoUploader] Error preparing upload for photo', photo.id, ':', error);
        throw error;
      }
    }
  };

  const uploadPhoto = async (photo: PhotoData) => {
    console.log('[PhotoUploader] 🚀 Starting upload for photo:', photo.id);
    setIsUploading(true);
    
    // Update photo status to uploading with 0% progress
    updatePhotoStatus(photo.id, 'uploading');
    updatePhotoProgress(photo.id, 0);

    try {
      const uploadUrl = await uploadSmart(photo);
      
      console.log('[PhotoUploader] ✅ Upload completed for photo:', photo.id, 'URL:', uploadUrl);
      updatePhotoStatus(photo.id, 'completed', uploadUrl);
      toast.show('Photo uploaded successfully!', 'success');
    } catch (error) {
      console.error('[PhotoUploader] ❌ Upload failed for photo:', photo.id, error);
      updatePhotoStatus(photo.id, 'failed', undefined, error instanceof Error ? error.message : 'Upload failed');
      toast.show('Failed to upload photo. Tap retry to try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const updatePhotoStatus = (photoId: string, status: PhotoData['status'], uploadUrl?: string, error?: string) => {
    console.log('[PhotoUploader] 📊 Updating photo status:', photoId, 'to', status, uploadUrl ? 'with URL' : 'no URL');
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, status, uploadUrl, error, progress: status === 'completed' ? 100 : photo.progress }
        : photo
    );
    onPhotosChange(updatedPhotos);
  };

  const updatePhotoProgress = (photoId: string, progress: number) => {
    console.log('[PhotoUploader] 📈 Updating progress for photo:', photoId, 'to', Math.round(progress) + '%');
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, progress: Math.round(progress) }
        : photo
    );
    onPhotosChange(updatedPhotos);
  };

  const removePhoto = (photoId: string) => {
    console.log('[PhotoUploader] Removing photo:', photoId);
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosChange(updatedPhotos);
  };

  const retryUpload = (photo: PhotoData) => {
    console.log('[PhotoUploader] Retrying upload for photo:', photo.id);
    uploadPhoto(photo);
  };

  const renderPhoto = (photo: PhotoData) => {
    const getStatusIcon = () => {
      switch (photo.status) {
        case 'uploading':
          return <ActivityIndicator size="small" color="#007AFF" />;
        case 'completed':
          return <CheckCircle size={20} color="#34C759" />;
        case 'failed':
          return <AlertCircle size={20} color="#FF3B30" />;
        default:
          return null;
      }
    };

    return (
      <View key={photo.id} style={styles.photoContainer}>
        <Image source={{ uri: photo.uri }} style={styles.photo} />
        
        {/* Status overlay */}
        <View style={styles.statusOverlay}>
          {getStatusIcon()}
        </View>

        {/* Progress percentage bubble */}
        {photo.status === 'uploading' && (
          <View style={styles.progressBubble}>
            <Text style={styles.progressText}>{Math.round(photo.progress ?? 0)}%</Text>
          </View>
        )}

        {/* Saved pill */}
        {photo.status === 'completed' && (
          <View style={styles.savedPill}>
            <CheckCircle size={12} color="#FFFFFF" />
            <Text style={styles.savedPillText}>Saved</Text>
          </View>
        )}

        {/* Progress bar for uploading */}
        {photo.status === 'uploading' && photo.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${photo.progress}%` }]} />
          </View>
        )}

        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removePhoto(photo.id)}
        >
          <X size={16} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Retry button for failed uploads */}
        {photo.status === 'failed' && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => retryUpload(photo)}
          >
            <Upload size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const canAddMore = photos.length < maxPhotos;
  const completedPhotos = photos.filter(p => p.status === 'completed').length;
  const failedPhotos = photos.filter(p => p.status === 'failed').length;
  const uploading = photos.filter(p => p.status === 'uploading');
  const overallProgress = uploading.length
    ? Math.round(uploading.reduce((acc, p) => acc + (p.progress ?? 0), 0) / uploading.length)
    : completedPhotos > 0 ? 100 : 0;

  const showAddPhotosOptions = () => {
    console.log('[PhotoUploader] Showing add photos options');
    if (Platform.OS === 'web') {
      // Web Alert buttons are limited; open gallery directly
      pickImage();
      return;
    }
    Alert.alert(
      'Add Photos',
      'Choose how you want to add photos',
      [
        { text: 'Camera', onPress: () => {
          console.log('[PhotoUploader] User selected Camera');
          takePhoto();
        }},
        { text: 'Gallery', onPress: () => {
          console.log('[PhotoUploader] User selected Gallery');
          pickImage();
        }},
        { text: 'Cancel', style: 'cancel', onPress: () => {
          console.log('[PhotoUploader] User canceled photo selection');
        }},
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Photos header with count */}
      <View style={styles.photosHeader}>
        <Text style={styles.photosTitle}>Photos</Text>
        <Text style={styles.photosCount}>{completedPhotos}/{maxPhotos}</Text>
      </View>

      {/* Add Photos Button */}
      {canAddMore && (
        <TouchableOpacity
          style={[styles.addPhotosButton, isUploading && styles.addPhotosButtonDisabled]}
          onPress={() => {
            console.log('[PhotoUploader] Add Photos button pressed');
            showAddPhotosOptions();
          }}
          disabled={isUploading}
          testID="add-photos-button"
          accessibilityRole="button"
          accessibilityLabel="Add Photos"
        >
          <Upload size={20} color="#FFFFFF" />
          <Text style={styles.addPhotosButtonText}>
            {isUploading ? 'Uploading...' : 'Add Photos'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll} testID="photo-scroll">
          {photos.map(renderPhoto)}
        </ScrollView>
      )}

      {/* Overall upload status */}
      <View style={styles.statusRow} testID="upload-status-row">
        {uploading.length > 0 ? (
          <>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>Uploading {uploading.length} photo(s)... {overallProgress}%</Text>
          </>
        ) : (
          <>
            <CheckCircle size={16} color="#34C759" />
            <Text style={styles.statusText}>{completedPhotos} saved{completedPhotos > 0 ? ' • All set' : ''}</Text>
          </>
        )}
      </View>

      {/* Warning for minimum photos */}
      {completedPhotos < 5 && (
        <View style={styles.warningContainer}>
          <AlertCircle size={16} color="#FF9500" />
          <Text style={styles.warningText}>You need at least 5 photos to publish.</Text>
        </View>
      )}

      {/* Error for failed uploads */}
      {failedPhotos > 0 && (
        <View style={styles.errorContainer} testID="upload-error">
          <AlertCircle size={16} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load photos.</Text>
        </View>
      )}

      {/* Requirements */}
      <View style={styles.requirementsContainer}>
        <AlertCircle size={16} color="#FF9500" />
        <View style={styles.requirementsTextContainer}>
          <Text style={styles.requirementsTitle}>Requirements for Publishing</Text>
          <Text style={styles.requirementsText}>
            • Complete all required fields{"\n"}
            • Upload at least 5 photos{"\n"}
            • Wait for all photos to finish uploading
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#3C3C43',
    fontWeight: '500',
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  photosCount: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addPhotosButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addPhotosButtonDisabled: {
    opacity: 0.6,
  },
  photoScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  statusOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  progressBubble: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  savedPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savedPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 4,
  },
  retryButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    flex: 1,
  },
  requirementsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  requirementsTextContainer: {
    flex: 1,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: 4,
  },
  requirementsText: {
    fontSize: 13,
    color: '#FF9500',
    lineHeight: 18,
  },
});

// Hook to check if user can publish (all photos uploaded)
export function useCanPublish(photos: PhotoData[]): boolean {
  return useMemo(() => {
    if (photos.length === 0) return true; // No photos is fine
    return photos.every(photo => photo.status === 'completed');
  }, [photos]);
}