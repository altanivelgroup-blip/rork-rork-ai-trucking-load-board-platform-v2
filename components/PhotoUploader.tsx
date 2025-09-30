import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig'; // Adjust import to your Firebase config file
import { useAuth } from '@hooks/useAuth'; // Assuming you have an auth hook for userId

interface PhotoUploaderProps {
  entityType: string; // e.g., 'vehicle'
  entityId: string;
  onUploadSuccess?: (url: string) => void;
  onUploadFailure?: (error: string) => void;
  maxPhotos?: number; // Default to 5 if not provided
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  entityType,
  entityId,
  onUploadSuccess,
  onUploadFailure,
  maxPhotos = 5,
}) => {
  const { user } = useAuth(); // Get current user ID
  const userId = user?.uid;
  if (!userId) {
    Alert.alert('Error', 'You must be logged in to upload photos.');
    return null;
  }

  const [photos, setPhotos] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);

  const pickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can upload up to ${maxPhotos} photos.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      await uploadImage(uri);
    }
  };

  const uploadImage = async (uri: string, retryCount = 0) => {
    setUploading(true);
    const fileName = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const storagePath = `users/${userId}/${entityType}s/${entityId}/photos/${fileName}`;
    const storageRef = ref(storage, storagePath);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(prog);
        },
        (error) => {
          console.error('Upload error:', error.code, error.message);
          if (error.code === 'storage/canceled' && retryCount < 3) {
            console.log(`Retrying upload (attempt ${retryCount + 1})`);
            uploadImage(uri, retryCount + 1); // Retry on cancel
          } else {
            Alert.alert('Upload Failed', error.message);
            onUploadFailure?.(error.message);
            setUploading(false);
          }
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotos((prev) => [...prev, downloadURL]);
          onUploadSuccess?.(downloadURL);
          setUploading(false);
          setProgress(0);
        }
      );
    } catch (error) {
      console.error('Upload exception:', error);
      if (retryCount < 3) {
        uploadImage(uri, retryCount + 1);
      } else {
        Alert.alert('Upload Failed', 'An unexpected error occurred.');
        onUploadFailure?.('Unexpected error');
        setUploading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text>Photos: Add at least 3 high-quality photos of your vehicle. The first photo is used as the cover.</Text>
      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={uploading}>
        <Text>Add Photo {photos.length}/{maxPhotos}</Text>
      </TouchableOpacity>
      {uploading && <Text>Uploading: {progress}%</Text>}
      <ScrollView horizontal>
        {photos.map((url, index) => (
          <View key={index} style={styles.photo}>
            {/* Render image preview here, e.g., <Image source={{ uri: url }} style={styles.image} /> */}
            <Text>Photo {index + 1}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  button: { backgroundColor: 'blue', padding: 10, margin: 10 },
  photo: { margin: 5 },
});

export default PhotoUploader;