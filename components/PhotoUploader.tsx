import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Platform } from "react-native";
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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const checkFirebase = () => {
      const user = auth.currentUser;
      const info = `Auth: ${user ? 'Signed In' : 'Not Signed In'} | Platform: ${Platform.OS}`;
      setDebugInfo(info);
      console.log('[PhotoUploader] Debug info:', info);
    };
    
    checkFirebase();
    const unsubscribe = auth.onAuthStateChanged(checkFirebase);
    return unsubscribe;
  }, []);

  const uploadSingleImage = async (uri: string, index: number): Promise<{id:string;url:string;path:string}> => {
    console.log(`[PhotoUploader] Starting upload for image ${index}`);
    
    // Validate auth first
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Compress image aggressively for speed
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Reasonable size
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    console.log(`[PhotoUploader] Image ${index} compressed`);

    // Convert to blob with timeout
    const response = await Promise.race([
      fetch(manipulated.uri),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 10000)
      )
    ]);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log(`[PhotoUploader] Image ${index} converted to blob: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

    // Create storage reference
    const storage = getStorage();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2, 8);
    const fileId = `${timestamp}-${randomId}-${index}.jpg`;
    const path = `photos/${userId}/${fileId}`;
    const storageRef = ref(storage, path);
    
    console.log(`[PhotoUploader] Uploading image ${index} to: ${path}`);

    // Upload with timeout
    await Promise.race([
      uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: timestamp.toString()
        }
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout - please try again')), 30000)
      )
    ]);
    
    console.log(`[PhotoUploader] Image ${index} uploaded successfully`);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`[PhotoUploader] Image ${index} URL obtained: ${downloadURL}`);
    
    return { id: fileId, url: downloadURL, path };
  };

  const pick = async () => {
    try {
      console.log('[PhotoUploader] Starting photo selection...');
      setBusy(true);
      setProgress('Checking permissions...');
      setUploadedCount(0);
      setTotalCount(0);
      
      // Check permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setBusy(false);
        setProgress('');
        Alert.alert("Permission Required", "Media library permission is required to upload photos.");
        return;
      }
      console.log('[PhotoUploader] Permissions granted');

      // Check auth
      if (!auth.currentUser) {
        setBusy(false);
        setProgress('');
        Alert.alert("Authentication Required", "Please sign in to upload photos.");
        return;
      }
      console.log('[PhotoUploader] User authenticated:', auth.currentUser.uid);

      setProgress('Opening photo picker...');
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: allowMultiple,
        selectionLimit: allowMultiple ? 8 : 1, // Reduced limit for better performance
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('[PhotoUploader] User canceled photo selection');
        setBusy(false);
        setProgress('');
        return;
      }
      
      const assets = "assets" in result ? result.assets : [];
      console.log(`[PhotoUploader] Selected ${assets.length} photos`);
      
      if (assets.length === 0) {
        console.log('[PhotoUploader] No assets selected');
        setBusy(false);
        setProgress('');
        return;
      }
      
      setTotalCount(assets.length);
      setProgress(`Uploading 0/${assets.length} photos...`);

      const uploadedItems: {id:string;url:string;path:string}[] = [];
      const failedUploads: string[] = [];
      
      // Upload images concurrently in batches of 3 for better performance
      const batchSize = 3;
      for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        const batchPromises = batch.map(async (asset, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            console.log(`[PhotoUploader] Starting upload for image ${globalIndex + 1}/${assets.length}`);
            const uploaded = await uploadSingleImage(asset.uri, globalIndex + 1);
            setUploadedCount(prev => {
              const newCount = prev + 1;
              setProgress(`Uploaded ${newCount}/${assets.length} photos...`);
              return newCount;
            });
            return { success: true, data: uploaded, index: globalIndex + 1 };
          } catch (error: any) {
            console.error(`[PhotoUploader] Failed to upload image ${globalIndex + 1}:`, error);
            const errorMsg = error?.message || 'Unknown error';
            return { success: false, error: `Image ${globalIndex + 1}: ${errorMsg}`, index: globalIndex + 1 };
          }
        });
        
        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Process batch results
        batchResults.forEach(result => {
          if (result.success) {
            uploadedItems.push(result.data);
            console.log(`[PhotoUploader] Successfully uploaded image ${result.index}`);
          } else {
            failedUploads.push(result.error);
            console.log(`[PhotoUploader] Failed to upload image ${result.index}`);
          }
        });
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < assets.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setBusy(false);
      setProgress('');
      setUploadedCount(0);
      setTotalCount(0);
      
      console.log(`[PhotoUploader] Upload complete. Successfully uploaded ${uploadedItems.length} out of ${assets.length} photos`);
      
      // Handle results
      if (uploadedItems.length > 0) {
        console.log(`[PhotoUploader] Calling onUploaded with ${uploadedItems.length} items`);
        onUploaded?.(uploadedItems);
        
        let message = `Successfully uploaded ${uploadedItems.length} photo${uploadedItems.length > 1 ? 's' : ''}!`;
        if (failedUploads.length > 0) {
          message += `\n\n${failedUploads.length} upload${failedUploads.length > 1 ? 's' : ''} failed.`;
        }
        
        Alert.alert("Upload Complete", message);
      } else if (failedUploads.length > 0) {
        const errorDetails = failedUploads.slice(0, 3).join('\n');
        const moreErrors = failedUploads.length > 3 ? `\n...and ${failedUploads.length - 3} more` : '';
        Alert.alert("Upload Failed", `All uploads failed:\n${errorDetails}${moreErrors}`);
      } else {
        Alert.alert("No Photos", "No photos were selected or processed.");
      }
      
    } catch (error: any) {
      console.error('[PhotoUploader] Photo picker error:', error);
      setBusy(false);
      setProgress('');
      setUploadedCount(0);
      setTotalCount(0);
      Alert.alert("Error", `Photo selection failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    setBusy(false);
    setProgress('');
    setUploadedCount(0);
    setTotalCount(0);
    Alert.alert('Upload Cancelled', 'Photo upload has been cancelled.');
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
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.progressText}>{progress}</Text>
          {totalCount > 0 && (
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${(uploadedCount / totalCount) * 100}%` }]} 
              />
            </View>
          )}
        </View>
      ) : null}
      
      {busy && (
        <View style={styles.actionButtons}>
          <Pressable onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel Upload</Text>
          </Pressable>
        </View>
      )}
      
      <Text style={styles.debugText}>{debugInfo}</Text>
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
    flex: 1,
  },
  actionButtons: {
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});