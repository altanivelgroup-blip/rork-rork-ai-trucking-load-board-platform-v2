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

    if (result.canceled) return;
    const assets = "assets" in result ? result.assets : [];
    setSelectedCount(assets.length);
    setBusy(true);

    const out: {id:string;url:string;path:string}[] = [];
    let index = 0;
    for (const asset of assets) {
      index++;
      const uploaded = await uploadImage({
        uri: asset.uri,
        loadId, userId, role,
        orderIndex: index,
        onProgress: (p) =>
          setProgress(Math.round(((index - 1) / assets.length) * 100 + p / assets.length))
      });
      out.push(uploaded);
    }

    setBusy(false);
    setProgress(0);
    setSelectedCount(0);
    onUploaded?.(out);
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
    gap: 12,
  },
  progressText: {
    color: '#666',
  },
});