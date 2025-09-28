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
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    console.log('[PhotoUploader] Loading photos, count:', photos.length);
  }, [photos]);

  const requestPermissions = async () => {
    console.log('[PhotoUploader] Requesting camera permissions');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    console.log('[PhotoUploader] Starting image picker');
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (photos.length >= maxPhotos) {
      Alert.alert('Limit reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[PhotoUploader] Image selected, creating photo data');
        const newPhoto: PhotoData = {
          id: uuid.v4() as string,
          uri: result.assets[0].uri,
          status: 'pending',
          timestamp: Date.now(),
        };

        const updatedPhotos = [...photos, newPhoto];
        onPhotosChange(updatedPhotos);
        
        // Start upload immediately
        uploadPhoto(newPhoto);
      }
    } catch (error) {
      console.error('[PhotoUploader] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    console.log('[PhotoUploader] Starting camera');
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (photos.length >= maxPhotos) {
      Alert.alert('Limit reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

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
        uploadPhoto(newPhoto);
      }
    } catch (error) {
      console.error('[PhotoUploader] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadSmart = async (photo: PhotoData): Promise<string> => {
    if (mockMode) {
      console.log('[PhotoUploader] Mock mode: simulating upload for photo', photo.id);
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Return a mock URL from picsum
      return `https://picsum.photos/400/300?random=${photo.id}`;
    } else {
      console.log('[PhotoUploader] Real mode: uploading to Firebase for photo', photo.id);
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
            updatePhotoProgress(photo.id, progress);
          },
          (error) => {
            console.error('[PhotoUploader] Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    }
  };

  const uploadPhoto = async (photo: PhotoData) => {
    console.log('[PhotoUploader] Starting upload for photo:', photo.id);
    setIsUploading(true);
    
    // Update photo status to uploading
    updatePhotoStatus(photo.id, 'uploading');

    try {
      const uploadUrl = await uploadSmart(photo);
      
      console.log('[PhotoUploader] Upload completed for photo:', photo.id);
      updatePhotoStatus(photo.id, 'completed', uploadUrl);
    } catch (error) {
      console.error('[PhotoUploader] Upload failed for photo:', photo.id, error);
      updatePhotoStatus(photo.id, 'failed', undefined, error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const updatePhotoStatus = (photoId: string, status: PhotoData['status'], uploadUrl?: string, error?: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, status, uploadUrl, error, progress: status === 'completed' ? 100 : photo.progress }
        : photo
    );
    onPhotosChange(updatedPhotos);
  };

  const updatePhotoProgress = (photoId: string, progress: number) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, progress }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Photos ({photos.length}/{maxPhotos})</Text>
        {mockMode && (
          <Text style={styles.mockBadge}>MOCK MODE</Text>
        )}
      </View>

      {/* Status summary */}
      {photos.length > 0 && (
        <View style={styles.statusSummary}>
          <Text style={styles.statusText}>
            {completedPhotos} uploaded, {failedPhotos} failed
          </Text>
        </View>
      )}

      {/* Photo grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
        {photos.map(renderPhoto)}
        
        {/* Add photo buttons */}
        {canAddMore && (
          <View style={styles.addButtonsContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={takePhoto}
              disabled={isUploading}
            >
              <Camera size={24} color="#007AFF" />
              <Text style={styles.addButtonText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={pickImage}
              disabled={isUploading}
            >
              <Upload size={24} color="#007AFF" />
              <Text style={styles.addButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Error messages */}
      {failedPhotos > 0 && (
        <Text style={styles.errorText}>
          Some photos failed to upload. Tap the retry button to try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  mockBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusSummary: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
  },
  photoScroll: {
    flexDirection: 'row',
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
  addButtonsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  addButton: {
    width: 100,
    height: 46,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
  },
});

// Hook to check if user can publish (all photos uploaded)
export function useCanPublish(photos: PhotoData[]): boolean {
  return useMemo(() => {
    if (photos.length === 0) return true; // No photos is fine
    return photos.every(photo => photo.status === 'completed');
  }, [photos]);
}