import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "@/utils/firebase";
import * as ImageManipulator from "expo-image-manipulator";

type Props = {
  loadId: string;
  userId: string;
  role: "shipper" | "driver";
  allowMultiple?: boolean;
  buttonLabel?: string;
  onUploaded?: (items: {id:string;url:string;path:string}[]) => void;
};

export default function PhotoUploader({
  loadId, userId, role, allowMultiple = true, buttonLabel = "Upload Photos", onUploaded
}: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const uploadSingleImage = async (uri: string, index: number, total: number) => {
    console.log(`[PhotoUploader] Uploading image ${index}/${total}`);
    setProgress(`Uploading ${index}/${total}...`);
    
    try {
      // Compress image
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert to blob
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();

      // Create storage reference - simplified path
      const storage = getStorage();
      const fileId = `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.jpg`;
      const path = `photos/${userId}/${fileId}`;
      const storageRef = ref(storage, path);

      // Simple upload without progress tracking
      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`[PhotoUploader] Successfully uploaded image ${index}/${total}`);
      
      return { id: fileId, url: downloadURL, path };
    } catch (error) {
      console.error(`[PhotoUploader] Failed to upload image ${index}:`, error);
      throw error;
    }
  };

  const pick = async () => {
    try {
      console.log('[PhotoUploader] Starting photo selection...');
      
      // Check permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Media library permission is required to upload photos.");
        return;
      }

      // Check auth
      if (!auth.currentUser) {
        Alert.alert("Authentication Required", "Please sign in to upload photos.");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: allowMultiple,
        selectionLimit: allowMultiple ? 10 : 1,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('[PhotoUploader] User canceled photo selection');
        return;
      }
      
      const assets = "assets" in result ? result.assets : [];
      console.log(`[PhotoUploader] Selected ${assets.length} photos`);
      
      if (assets.length === 0) {
        console.log('[PhotoUploader] No assets selected');
        return;
      }
      
      setBusy(true);
      setProgress('Starting upload...');

      const uploadedItems: {id:string;url:string;path:string}[] = [];
      
      // Upload each image sequentially
      for (let i = 0; i < assets.length; i++) {
        try {
          const uploaded = await uploadSingleImage(assets[i].uri, i + 1, assets.length);
          uploadedItems.push(uploaded);
        } catch (error: any) {
          console.error(`[PhotoUploader] Failed to upload image ${i + 1}:`, error);
          Alert.alert("Upload Error", `Failed to upload image ${i + 1}: ${error?.message || 'Unknown error'}`);
        }
      }

      setBusy(false);
      setProgress('');
      
      console.log(`[PhotoUploader] Upload complete. Successfully uploaded ${uploadedItems.length} out of ${assets.length} photos`);
      
      if (uploadedItems.length > 0) {
        onUploaded?.(uploadedItems);
        Alert.alert("Success", `Successfully uploaded ${uploadedItems.length} photo${uploadedItems.length > 1 ? 's' : ''}!`);
      }
      
    } catch (error: any) {
      console.error('[PhotoUploader] Photo picker error:', error);
      setBusy(false);
      setProgress('');
      Alert.alert("Error", `Photo selection failed: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={pick}
        style={[styles.button, busy && styles.buttonDisabled]}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? "Uploading..." : buttonLabel}</Text>
      </Pressable>

      {busy ? (
        <View style={styles.progressContainer}>
          <ActivityIndicator />
          <Text style={styles.progressText}>{progress}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#666',
    marginLeft: 12,
  },
});