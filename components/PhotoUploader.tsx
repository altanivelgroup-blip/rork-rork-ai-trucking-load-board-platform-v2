import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
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

  const uploadSingleImage = async (uri: string, index: number): Promise<{id:string;url:string;path:string}> => {
    if (!auth.currentUser) throw new Error("User not authenticated");

    // Compress image
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to blob
    const response = await Promise.race([
      fetch(manipulated.uri),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout (15s)')), 15000)
      ),
    ]);
    const blob = await response.blob();

    // Create storage ref
    const storage = getStorage();
    const timestamp = Date.now();
    const fileId = `${timestamp}-${index}.jpg`;
    const path = `photos/${auth.currentUser.uid}/${fileId}`;
    const storageRef = ref(storage, path);

    // Upload with resumable upload and timeout
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: auth.currentUser.uid,
        uploadedAt: timestamp.toString(),
      },
    });

    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error("Upload timeout (30s)"));
      }, 30000);

      uploadTask.on('state_changed',
        null,
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
        () => {
          clearTimeout(timer);
          resolve(true);
        }
      );
    });

    // Get URL
    const url = await getDownloadURL(storageRef);

    return { id: fileId, url, path };
  };

  const uploadWithRetry = async (uri: string, index: number, attempts = 3): Promise<{id:string;url:string;path:string}> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[PhotoUploader] Upload attempt ${attempt}/${attempts} for image ${index}`);
        return await uploadSingleImage(uri, index);
      } catch (error: any) {
        lastError = error;
        console.error(`[PhotoUploader] Upload attempt ${attempt} failed for image ${index}:`, error);
        
        if (attempt < attempts) {
          const delay = attempt * 1000; // 1s, 2s, 3s delays
          console.log(`[PhotoUploader] Waiting ${delay}ms before retry ${attempt + 1} for image ${index}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    const errorMessage = lastError?.message || 'Unknown upload error';
    // Check if it's a timeout or auth error for better messaging
    if (lastError?.message?.includes('timeout') || lastError?.message?.includes('abort')) {
      throw new Error('Network is slow — please try again.');
    } else if (lastError?.message?.includes('auth') || lastError?.message?.includes('permission')) {
      throw new Error('You must be signed in to upload photos.');
    } else {
      throw new Error('Upload failed — please check your connection and try again.');
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
        Alert.alert("Photo Access Required", "Photo access is required — enable permissions in Settings.");
        return;
      }
      console.log('[PhotoUploader] Permissions granted');

      // Check auth
      if (!auth.currentUser) {
        setBusy(false);
        setProgress('');
        Alert.alert("Sign In Required", "You must be signed in to upload photos.");
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
      
      // Upload images in batches of 3 with 500ms delay between batches
      const BATCH_SIZE = 3;
      const BATCH_DELAY = 500;
      
      for (let batchStart = 0; batchStart < assets.length; batchStart += BATCH_SIZE) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('[PhotoUploader] Upload cancelled by user');
          break;
        }
        
        const batchEnd = Math.min(batchStart + BATCH_SIZE, assets.length);
        const batch = assets.slice(batchStart, batchEnd);
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(assets.length / BATCH_SIZE);
        
        console.log(`[PhotoUploader] Processing batch ${batchNumber}/${totalBatches} (${batch.length} images)`);
        setProgress(`Processing batch ${batchNumber}/${totalBatches}...`);
        
        // Process batch concurrently (up to 3 uploads at once)
        const batchPromises = batch.map(async (asset, batchIndex) => {
          const globalIndex = batchStart + batchIndex + 1;
          
          try {
            console.log(`[PhotoUploader] Starting upload for image ${globalIndex}/${assets.length} in batch ${batchNumber}`);
            const uploaded = await uploadWithRetry(asset.uri, globalIndex);
            
            // Update progress atomically
            setUploadedCount(prev => {
              const newCount = prev + 1;
              setProgress(`Uploaded ${newCount}/${assets.length} photos...`);
              return newCount;
            });
            
            console.log(`[PhotoUploader] Successfully uploaded image ${globalIndex}`);
            return { success: true, data: uploaded, index: globalIndex };
            
          } catch (error: any) {
            console.error(`[PhotoUploader] Failed to upload image ${globalIndex}:`, error);
            const errorMsg = error?.message || 'Unknown error';
            return { 
              success: false, 
              error: `Image ${globalIndex}: ${errorMsg}`, 
              retryData: { uri: asset.uri, index: globalIndex },
              index: globalIndex 
            };
          }
        });
        
        // Wait for all uploads in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Process batch results
        batchResults.forEach(result => {
          if (result.success) {
            uploadedItems.push(result.data);
          } else {
            failedUploads.push(result.error);
            setRetryQueue(prev => [...prev, result.retryData]);
          }
        });
        
        console.log(`[PhotoUploader] Batch ${batchNumber} complete: ${batchResults.filter(r => r.success).length} successful, ${batchResults.filter(r => !r.success).length} failed`);
        
        // Add delay between batches (except for the last batch)
        if (batchEnd < assets.length) {
          console.log(`[PhotoUploader] Waiting ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
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
        
        Alert.alert("Photos Uploaded!", message);
      } else if (failedUploads.length > 0) {
        const errorDetails = failedUploads.slice(0, 3).join('\n');
        const moreErrors = failedUploads.length > 3 ? `\n...and ${failedUploads.length - 3} more` : '';
        Alert.alert("Upload Failed", `Network issues prevented upload:\n${errorDetails}${moreErrors}`);
      } else {
        Alert.alert("No Photos Selected", "Please select photos to upload.");
      }
      
    } catch (error: any) {
      console.error('[PhotoUploader] Photo picker error:', error);
      setBusy(false);
      setProgress('');
      setUploadedCount(0);
      setTotalCount(0);
      Alert.alert("Something Went Wrong", "Unable to access photos — please try again.");
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
    Alert.alert('Upload Stopped', 'Photo upload was cancelled.');
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
        const uploaded = await uploadWithRetry(item.uri, item.index);
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
        `Successfully uploaded ${uploadedItems.length} photo${uploadedItems.length > 1 ? 's' : ''}!${stillFailed.length > 0 ? ` ${stillFailed.length} still failed.` : ''}`
      );
    } else {
      Alert.alert('Retry Failed', 'Network is slow — please check your connection and try again.');
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