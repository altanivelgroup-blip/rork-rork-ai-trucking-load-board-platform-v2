import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface CleanPhotoUploaderProps {
  loadId: string;
  userId: string;
  role: 'shipper' | 'driver';
  onUploaded: (urls: string[]) => void;
}

export default function CleanPhotoUploader({ loadId, userId, role, onUploaded }: CleanPhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const pickAndUploadPhotos = async () => {
    try {
      setIsUploading(true);
      setProgress('Selecting photos...');

      // Request permission and pick images
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled || !result.assets) {
        setIsUploading(false);
        setProgress('');
        return;
      }

      const assets = result.assets;
      setProgress(`Processing ${assets.length} photo(s)...`);

      const uploadedUrls: string[] = [];
      const storage = getStorage();

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setProgress(`Uploading photo ${i + 1} of ${assets.length}...`);

        // Compress image
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 600 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Convert to blob
        const response = await fetch(manipulated.uri);
        const blob = await response.blob();

        // Create storage path
        const timestamp = Date.now();
        const fileId = `${timestamp}-${i + 1}.jpg`;
        const path = `loads/${loadId}/${role}/${userId}/${fileId}`;
        const storageRef = ref(storage, path);

        console.log('[CleanPhotoUploader] Upload path:', path);
        console.log('[CleanPhotoUploader] Using role:', role, 'user:', userId, 'loadId:', loadId);

        // Upload to Firebase
        await uploadBytes(storageRef, blob, {
          contentType: 'image/jpeg',
          customMetadata: {
            uploadedBy: userId,
            uploadedAt: timestamp.toString(),
          }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadURL);

        console.log('[CleanPhotoUploader] Successfully uploaded:', downloadURL);
      }

      setProgress('');
      setIsUploading(false);
      
      Alert.alert('Success', `${uploadedUrls.length} photo(s) uploaded successfully!`);
      onUploaded(uploadedUrls);

    } catch (error) {
      console.error('[CleanPhotoUploader] Upload error:', error);
      setIsUploading(false);
      setProgress('');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Upload Failed', `Failed to upload photos: ${errorMessage}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={pickAndUploadPhotos}
        disabled={isUploading}
      >
        <Text style={styles.buttonText}>
          {isUploading ? 'Uploading...' : 'Upload Photos'}
        </Text>
      </TouchableOpacity>

      {isUploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.progressText}>{progress}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'center',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});