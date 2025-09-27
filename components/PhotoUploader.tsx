import React, { useState, useEffect, useRef } from "react";
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
  const [retryQueue, setRetryQueue] = useState<{uri: string, index: number}[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const uploadSingleImage = async (uri: string, index: number, retryCount = 0): Promise<{id:string;url:string;path:string}> => {
    const maxRetries = 3;
    console.log(`[PhotoUploader] Starting upload for image ${index} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Validate auth first
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Progressive compression based on retry count
      const compressionLevel = Math.max(0.4, 0.8 - (retryCount * 0.2));
      const maxWidth = Math.max(600, 1000 - (retryCount * 200));
      
      console.log(`[PhotoUploader] Compressing image ${index} - quality: ${compressionLevel}, maxWidth: ${maxWidth}`);
      
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        { compress: compressionLevel, format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log(`[PhotoUploader] Image ${index} compressed successfully`);

      // Create abort controller for this upload
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      try {
        // Convert to blob with abort signal
        const response = await fetch(manipulated.uri, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        console.log(`[PhotoUploader] Image ${index} converted to blob: ${sizeMB}MB`);

        // Create storage reference with better naming
        const storage = getStorage();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).slice(2, 8);
        const fileId = `${timestamp}-${randomId}-img${index}.jpg`;
        const path = `photos/${userId}/${loadId}/${fileId}`;
        const storageRef = ref(storage, path);
        
        console.log(`[PhotoUploader] Uploading image ${index} to: ${path}`);

        // Upload with metadata
        await uploadBytes(storageRef, blob, {
          contentType: 'image/jpeg',
          customMetadata: {
            uploadedBy: userId,
            uploadedAt: timestamp.toString(),
            loadId: loadId,
            originalSize: blob.size.toString(),
            compressionLevel: compressionLevel.toString()
          }
        });
        
        console.log(`[PhotoUploader] Image ${index} uploaded successfully`);
        
        // Get download URL with retry logic
        let downloadURL: string;
        let urlRetries = 0;
        const maxUrlRetries = 3;
        
        while (urlRetries < maxUrlRetries) {
          try {
            downloadURL = await getDownloadURL(storageRef);
            console.log(`[PhotoUploader] Image ${index} URL obtained: ${downloadURL}`);
            break;
          } catch (urlError) {
            urlRetries++;
            console.warn(`[PhotoUploader] Failed to get URL for image ${index}, retry ${urlRetries}/${maxUrlRetries}:`, urlError);
            if (urlRetries >= maxUrlRetries) {
              throw new Error(`Failed to get download URL after ${maxUrlRetries} attempts`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * urlRetries));
          }
        }
        
        // Return successful upload info
        const uploadInfo = { id: fileId, url: downloadURL!, path };
        console.log(`[PhotoUploader] Upload info created:`, uploadInfo);
        
        return uploadInfo;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error(`[PhotoUploader] Upload attempt ${retryCount + 1} failed for image ${index}:`, error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        console.log(`[PhotoUploader] Retrying image ${index} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadSingleImage(uri, index, retryCount + 1);
      }
      
      // Final failure
      const errorMessage = error?.message || 'Unknown upload error';
      throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${errorMessage}`);
    }
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
      
      // Create abort controller for the entire upload session
      abortControllerRef.current = new AbortController();
      
      // Upload images sequentially for better reliability
      for (let i = 0; i < assets.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('[PhotoUploader] Upload cancelled by user');
          break;
        }
        
        const asset = assets[i];
        const imageIndex = i + 1;
        
        try {
          console.log(`[PhotoUploader] Starting upload for image ${imageIndex}/${assets.length}`);
          setProgress(`Uploading image ${imageIndex}/${assets.length}...`);
          
          const uploaded = await uploadSingleImage(asset.uri, imageIndex);
          
          uploadedItems.push(uploaded);
          setUploadedCount(prev => {
            const newCount = prev + 1;
            setProgress(`Uploaded ${newCount}/${assets.length} photos...`);
            return newCount;
          });
          
          console.log(`[PhotoUploader] Successfully uploaded image ${imageIndex}`);
          
          // Small delay between uploads to prevent overwhelming Firebase
          if (i < assets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
        } catch (error: any) {
          console.error(`[PhotoUploader] Failed to upload image ${imageIndex}:`, error);
          const errorMsg = error?.message || 'Unknown error';
          failedUploads.push(`Image ${imageIndex}: ${errorMsg}`);
          
          // Add to retry queue
          setRetryQueue(prev => [...prev, { uri: asset.uri, index: imageIndex }]);
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
    // Abort current uploads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setBusy(false);
    setProgress('');
    setUploadedCount(0);
    setTotalCount(0);
    setRetryQueue([]);
    Alert.alert('Upload Cancelled', 'Photo upload has been cancelled.');
  };
  
  const handleRetryFailed = async () => {
    if (retryQueue.length === 0) return;
    
    console.log(`[PhotoUploader] Retrying ${retryQueue.length} failed uploads`);
    setBusy(true);
    setProgress('Retrying failed uploads...');
    setTotalCount(retryQueue.length);
    setUploadedCount(0);
    
    const uploadedItems: {id:string;url:string;path:string}[] = [];
    const stillFailed: {uri: string, index: number}[] = [];
    
    for (let i = 0; i < retryQueue.length; i++) {
      const item = retryQueue[i];
      try {
        setProgress(`Retrying image ${i + 1}/${retryQueue.length}...`);
        const uploaded = await uploadSingleImage(item.uri, item.index);
        uploadedItems.push(uploaded);
        setUploadedCount(prev => prev + 1);
        console.log(`[PhotoUploader] Retry successful for image ${item.index}`);
      } catch (error: any) {
        console.error(`[PhotoUploader] Retry failed for image ${item.index}:`, error);
        stillFailed.push(item);
      }
    }
    
    setRetryQueue(stillFailed);
    setBusy(false);
    setProgress('');
    setUploadedCount(0);
    setTotalCount(0);
    
    if (uploadedItems.length > 0) {
      onUploaded?.(uploadedItems);
      Alert.alert(
        'Retry Complete',
        `Successfully uploaded ${uploadedItems.length} photos.${stillFailed.length > 0 ? ` ${stillFailed.length} still failed.` : ''}`
      );
    } else {
      Alert.alert('Retry Failed', 'All retry attempts failed. Please check your connection and try again.');
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
      
      {!busy && retryQueue.length > 0 && (
        <View style={styles.retryContainer}>
          <Text style={styles.retryText}>{retryQueue.length} photos failed to upload</Text>
          <Pressable onPress={handleRetryFailed} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry Failed Uploads</Text>
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
  retryContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  retryText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});