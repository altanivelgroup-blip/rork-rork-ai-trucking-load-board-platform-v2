import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db } from "@/utils/firebase";
import { doc, serverTimestamp, setDoc, collection } from "firebase/firestore";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

type Role = "shipper" | "driver";
type Kind = "vehicle" | "document" | "other";

export type UploadParams = {
  uri: string;            // local file (ImagePicker asset.uri)
  loadId: string;         // Firestore load id
  userId: string;         // auth uid
  role: Role;             // "shipper" or "driver"
  kind?: Kind;            // optional tag
  caption?: string;
  orderIndex?: number;
  onProgress?: (pct:number)=>void;
};

const guessContentType = (uri: string) => {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

export async function uploadImage(params: UploadParams) {
  const { uri, loadId, userId, role, kind = "other", caption, orderIndex, onProgress } = params;

  console.log('[uploadImage] Starting upload:', {
    loadId,
    userId,
    role,
    kind,
    orderIndex,
    uriLength: uri?.length || 0
  });

  // 1) Compress/normalize (max 1600px long side, ~85% quality)
  console.log('[uploadImage] Compressing image...');
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  console.log('[uploadImage] Image compressed successfully');

  const contentType = guessContentType(manipulated.uri);
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const path = `loads/${loadId}/${role}/${userId}/${fileId}`;

  // 2) Blob
  console.log('[uploadImage] Converting to blob...');
  const res = await fetch(manipulated.uri);
  const blob = await res.blob();
  console.log('[uploadImage] Blob created, size:', blob.size);

  // 3) Upload with progress
  console.log('[uploadImage] Starting Firebase upload to path:', path);
  const storage = getStorage();
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, blob, {
    contentType,
    cacheControl: "public,max-age=31536000",
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      snap => {
        if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);
  console.log('[uploadImage] Got download URL:', url.substring(0, 50) + '...');

  // 4) Record metadata under /loads/{loadId}/photos/{photoId}
  console.log('[uploadImage] Saving metadata to Firestore...');
  const photosCol = collection(db, "loads", loadId, "photos");
  const photoDoc = doc(photosCol);
  await setDoc(photoDoc, {
    url,
    storagePath: path,
    role,
    uploadedBy: userId,
    kind,
    caption: caption || null,
    orderIndex: orderIndex ?? null,
    size: task.snapshot.totalBytes,
    contentType,
    platform: Platform.OS,
    createdAt: serverTimestamp(),
  });
  
  console.log('[uploadImage] Upload completed successfully, photo ID:', photoDoc.id);
  return { url, path, id: photoDoc.id };
}