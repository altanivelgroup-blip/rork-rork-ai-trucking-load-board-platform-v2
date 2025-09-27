import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth } from "@/utils/firebase";
import { doc, serverTimestamp, setDoc, collection } from "firebase/firestore";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

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
  const [progress, setProgress] = useState<number>(0);
  const [selectedCount, setSelectedCount] = useState(0);

  const uploadSingleImage = async (uri: string, index: number) => {
    console.log('[PhotoUploader] Uploading image', index);
    
    // Compress image
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to blob
    const response = await fetch(manipulated.uri);
    const blob = await response.blob();

    // Create storage reference
    const storage = getStorage();
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const path = `loads/${loadId}/${role}/${userId}/${fileId}`;
    const storageRef = ref(storage, path);

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: "public,max-age=31536000",
    });

    return new Promise<{id: string; url: string; path: string}>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progressPercent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(Math.round(((index - 1) / selectedCount) * 100 + progressPercent / selectedCount));
        },
        (error) => {
          console.error('[PhotoUploader] Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save metadata to Firestore
            const photosCol = collection(db, "loads", loadId, "photos");
            const photoDoc = doc(photosCol);
            await setDoc(photoDoc, {
              url: downloadURL,
              storagePath: path,
              role,
              uploadedBy: userId,
              kind: 'other',
              orderIndex: index,
              size: uploadTask.snapshot.totalBytes,
              contentType: 'image/jpeg',
              platform: Platform.OS,
              createdAt: serverTimestamp(),
            });
            
            resolve({ id: photoDoc.id, url: downloadURL, path });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
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
      
      setSelectedCount(assets.length);
      setBusy(true);
      setProgress(0);

      const uploadedItems: {id:string;url:string;path:string}[] = [];
      
      // Upload each image sequentially
      for (let i = 0; i < assets.length; i++) {
        try {
          const uploaded = await uploadSingleImage(assets[i].uri, i + 1);
          uploadedItems.push(uploaded);
          console.log(`[PhotoUploader] Uploaded ${i + 1}/${assets.length}`);
        } catch (error: any) {
          console.error(`[PhotoUploader] Failed to upload image ${i + 1}:`, error);
          Alert.alert("Upload Error", `Failed to upload image ${i + 1}: ${error?.message || 'Unknown error'}`);
        }
      }

      setBusy(false);
      setProgress(0);
      setSelectedCount(0);
      
      console.log(`[PhotoUploader] Upload complete. Successfully uploaded ${uploadedItems.length} out of ${assets.length} photos`);
      
      if (uploadedItems.length > 0) {
        onUploaded?.(uploadedItems);
      }
      
    } catch (error: any) {
      console.error('[PhotoUploader] Photo picker error:', error);
      setBusy(false);
      setProgress(0);
      setSelectedCount(0);
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
          <Text style={styles.progressText}>{progress}% • {selectedCount} selected</Text>
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