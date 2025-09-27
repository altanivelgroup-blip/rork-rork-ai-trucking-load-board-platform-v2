import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { ensureTestLoad } from "@/lib/ensureTestLoad";
import PhotoUploader from "@/components/PhotoUploader";
import LoadPhotoGallery from "@/components/LoadPhotoGallery";

export default function TestUploaderSection({ role }: { role: "shipper" | "driver" }) {
  const { user } = useAuth();
  const [loadId, setLoadId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    ensureTestLoad(user.uid).then(setLoadId).catch(console.error);
  }, [user?.uid]);

  if (!user?.uid) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Photo Uploader (TEST)</Text>
      <Text style={styles.sub}>Uses your private test load. Safe to try anytime.</Text>

      {loadId ? (
        <>
          <PhotoUploader
            loadId={loadId}
            userId={user.uid}
            role={role}
            allowMultiple
            buttonLabel="Pick Photos"
            onUploaded={()=>{}}
          />
          <View style={styles.galleryContainer}>
            <LoadPhotoGallery loadId={loadId} />
          </View>
        </>
      ) : (
        <Text>Preparing test load…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600" },
  sub: { opacity: 0.7, marginBottom: 8 },
  galleryContainer: { marginTop: 12 },
});