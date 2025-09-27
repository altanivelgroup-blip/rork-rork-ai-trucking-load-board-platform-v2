import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "@/lib/uploadImage";

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

  const pick = async () => {
    try {
      console.log('[PhotoUploader] Starting photo selection...');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Media library permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: allowMultiple,
        selectionLimit: allowMultiple ? 10 : 1,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
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

    const out: {id:string;url:string;path:string}[] = [];
    let index = 0;
    for (const asset of assets) {
      index++;
      try {
        const uploaded = await uploadImage({
          uri: asset.uri,
          loadId, userId, role,
          orderIndex: index,
          onProgress: (p) =>
            setProgress(Math.round(((index - 1) / assets.length) * 100 + p / assets.length))
        });
        out.push(uploaded);
      } catch (e: any) {
        console.error("Upload failed:", e);
        alert(`Upload failed on item ${index}: ${e?.message || e}`);
      }
    }

    setBusy(false);
    setProgress(0);
    setSelectedCount(0);
    
    console.log(`[PhotoUploader] Upload complete. Successfully uploaded ${out.length} out of ${assets.length} photos`);
    onUploaded?.(out);
    
    } catch (error: any) {
      console.error('[PhotoUploader] Photo picker error:', error);
      setBusy(false);
      setProgress(0);
      setSelectedCount(0);
      alert(`Photo selection failed: ${error?.message || error}`);
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