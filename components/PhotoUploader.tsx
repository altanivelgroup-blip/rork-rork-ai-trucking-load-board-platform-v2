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
  const [uploadTimeout, setUploadTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debug Firebase connection
    const checkFirebase = () => {
      const user = auth.currentUser;
      const info = `Auth: ${user ? 'Signed In' : 'Not Signed In'} | Platform: ${Platform.OS}`;
      setDebugInfo(info);
      console.log('[PhotoUploader] Debug info:', info);
    };
    
    checkFirebase();
    const unsubscribe = auth.onAuthStateChanged(checkFirebase);
    return () => {
      unsubscribe();
      if (uploadTimeout) {
        clearTimeout(uploadTimeout);
      }
    };
  }, [uploadTimeout]);

  const uploadSingleImage = async (uri: string, index: number, total: number, retryCount = 0): Promise<{id:string;url:string;path:string}> => {
    const maxRetries = 2;
    console.log(`[PhotoUploader] Uploading image ${index}/${total} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    setProgress(`Uploading ${index}/${total}${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`);
    
    try {
      // Validate auth first
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      console.log(`[PhotoUploader] Starting image processing for ${uri}`);
      
      // Compress image with more aggressive compression for faster upload
      let manipulated;
      try {
        manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 600 } }], // Even smaller for faster processing
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        console.log(`[PhotoUploader] Image compressed successfully`);
      } catch (manipError) {
        console.warn(`[PhotoUploader] Image compression failed, using original:`, manipError);
        manipulated = { uri }; // Use original if manipulation fails
      }

      // Convert to blob with shorter timeout and retry logic
      console.log(`[PhotoUploader] Converting to blob...`);
      let blob;
      try {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => {
          console.log(`[PhotoUploader] Fetch timeout for image ${index}`);
          controller.abort();
        }, 15000); // 15s fetch timeout
        
        const response = await fetch(manipulated.uri, { signal: controller.signal });
        clearTimeout(fetchTimeout);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        blob = await response.blob();
        console.log(`[PhotoUploader] Blob created, size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (fetchError: any) {
        console.error(`[PhotoUploader] Blob conversion failed:`, fetchError);
        if (retryCount < maxRetries && !fetchError.name?.includes('AbortError')) {
          console.log(`[PhotoUploader] Retrying blob conversion for image ${index}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
          return uploadSingleImage(uri, index, total, retryCount + 1);
        }
        throw new Error(`Failed to process image: ${fetchError?.message || 'Network error'}`);
      }

      // Create storage reference with better path structure
      const storage = getStorage();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).slice(2, 8);
      const fileId = `${timestamp}-${randomId}.jpg`;
      const path = `photos/${userId}/${fileId}`;
      const storageRef = ref(storage, path);
      
      console.log(`[PhotoUploader] Uploading to Firebase Storage: ${path}`);

      // Upload with retry logic
      try {
        await uploadBytes(storageRef, blob, {
          contentType: 'image/jpeg',
          customMetadata: {
            uploadedBy: userId,
            uploadedAt: timestamp.toString(),
            originalSize: blob.size.toString()
          }
        });
        console.log(`[PhotoUploader] Upload completed successfully`);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log(`[PhotoUploader] Successfully uploaded image ${index}/${total}: ${downloadURL}`);
        
        return { id: fileId, url: downloadURL, path };
      } catch (uploadError: any) {
        console.error(`[PhotoUploader] Firebase upload failed:`, uploadError);
        
        // Retry on certain errors
        if (retryCount < maxRetries && (
          uploadError.code === 'storage/unknown' ||
          uploadError.code === 'storage/retry-limit-exceeded' ||
          uploadError.message?.includes('network') ||
          uploadError.message?.includes('timeout')
        )) {
          console.log(`[PhotoUploader] Retrying upload for image ${index}...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Progressive delay
          return uploadSingleImage(uri, index, total, retryCount + 1);
        }
        
        // Provide specific error messages
        let errorMessage = 'Upload failed';
        if (uploadError.code === 'storage/unauthorized') {
          errorMessage = 'Permission denied. Please check your account permissions.';
        } else if (uploadError.code === 'storage/canceled') {
          errorMessage = 'Upload was canceled.';
        } else if (uploadError.code === 'storage/unknown') {
          errorMessage = 'Network error occurred during upload.';
        } else if (uploadError.code === 'storage/retry-limit-exceeded') {
          errorMessage = 'Upload failed after multiple retries.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error(`[PhotoUploader] Failed to upload image ${index}:`, error);
      console.error(`[PhotoUploader] Error details:`, {
        message: error?.message,
        code: error?.code,
        name: error?.name
      });
      
      // Final retry for unexpected errors
      if (retryCount < maxRetries && !error.message?.includes('not authenticated')) {
        console.log(`[PhotoUploader] Final retry for image ${index}...`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
        return uploadSingleImage(uri, index, total, retryCount + 1);
      }
      
      throw error;
    }
  };

  const pick = async () => {
    try {
      console.log('[PhotoUploader] Starting photo selection...');
      setBusy(true);
      setProgress('Checking permissions...');
      
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
        selectionLimit: allowMultiple ? 10 : 1,
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
      
      setProgress('Starting upload...');

      const uploadedItems: {id:string;url:string;path:string}[] = [];
      const failedUploads: string[] = [];
      
      // Upload each image sequentially with better error recovery
      for (let i = 0; i < assets.length; i++) {
        try {
          setProgress(`Processing image ${i + 1}/${assets.length}...`);
          const uploaded = await uploadSingleImage(assets[i].uri, i + 1, assets.length);
          uploadedItems.push(uploaded);
          console.log(`[PhotoUploader] Successfully uploaded ${i + 1}/${assets.length}`);
        } catch (error: any) {
          console.error(`[PhotoUploader] Failed to upload image ${i + 1}:`, error);
          const errorMsg = error?.message || 'Unknown error';
          failedUploads.push(`Image ${i + 1}: ${errorMsg}`);
          
          // Continue with other images even if one fails
          console.log(`[PhotoUploader] Continuing with remaining images...`);
        }
      }

      setBusy(false);
      setProgress('');
      
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
        const errorDetails = failedUploads.slice(0, 3).join('\n'); // Show first 3 errors
        const moreErrors = failedUploads.length > 3 ? `\n...and ${failedUploads.length - 3} more` : '';
        Alert.alert("Upload Failed", `All uploads failed:\n${errorDetails}${moreErrors}`);
      } else {
        Alert.alert("No Photos", "No photos were selected or processed.");
      }
      
    } catch (error: any) {
      console.error('[PhotoUploader] Photo picker error:', error);
      setBusy(false);
      setProgress('');
      Alert.alert("Error", `Photo selection failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleRetry = () => {
    if (uploadTimeout) {
      clearTimeout(uploadTimeout);
      setUploadTimeout(null);
    }
    setBusy(false);
    setProgress('');
  };

  const forceStop = () => {
    if (uploadTimeout) {
      clearTimeout(uploadTimeout);
      setUploadTimeout(null);
    }
    setBusy(false);
    setProgress('');
    Alert.alert('Upload Stopped', 'Photo upload has been stopped. You can try again.');
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
        </View>
      ) : null}
      
      {busy && (
        <View style={styles.actionButtons}>
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={forceStop} style={styles.stopButton}>
            <Text style={styles.stopText}>Force Stop</Text>
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
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  stopButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  stopText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});