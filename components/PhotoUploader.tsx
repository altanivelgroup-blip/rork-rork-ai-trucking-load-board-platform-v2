import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
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
    <View className="w-full">
      <Pressable
        onPress={pick}
        className="bg-blue-600 rounded-2xl px-4 py-3 items-center"
        disabled={busy}
      >
        <Text className="text-white font-semibold">{busy ? "Uploading..." : buttonLabel}</Text>
      </Pressable>

      {busy ? (
        <View className="mt-3 flex-row items-center gap-3">
          <ActivityIndicator />
          <Text>{progress}% • {selectedCount} selected</Text>
        </View>
      ) : null}
    </View>
  );
}