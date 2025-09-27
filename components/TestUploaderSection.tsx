import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { ensureTestLoad } from "@/lib/ensureTestLoad";
import PhotoUploader from "@/components/PhotoUploader";
import LoadPhotoGallery from "@/components/LoadPhotoGallery";

export default function TestUploaderSection({ role }: { role: "shipper" | "driver" }) {
  const { userId, isLoading } = useAuth();
  const [loadId, setLoadId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreatingLoad, setIsCreatingLoad] = React.useState(false);

  React.useEffect(() => {
    if (!userId) {
      console.log('[TestUploaderSection] No user ID available');
      return;
    }
    
    console.log('[TestUploaderSection] Creating test load for user:', userId);
    setIsCreatingLoad(true);
    setError(null);
    
    ensureTestLoad(userId)
      .then((id) => {
        console.log('[TestUploaderSection] Test load ready:', id);
        setLoadId(id);
        setError(null);
      })
      .catch((err) => {
        console.error('[TestUploaderSection] Failed to create test load:', err);
        setError(err?.message || 'Failed to create test load');
      })
      .finally(() => {
        setIsCreatingLoad(false);
      });
  }, [userId]);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Photo Uploader (TEST)</Text>
        <Text>Loading user authentication...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Photo Uploader (TEST)</Text>
        <Text style={styles.error}>Please sign in to test photo uploads</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Photo Uploader (TEST)</Text>
      <Text style={styles.sub}>Uses your private test load. Safe to try anytime.</Text>

      {error ? (
        <View>
          <Text style={styles.error}>Error: {error}</Text>
          <Pressable 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsCreatingLoad(true);
              ensureTestLoad(userId)
                .then(setLoadId)
                .catch((err) => setError(err?.message || 'Failed to create test load'))
                .finally(() => setIsCreatingLoad(false));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : loadId ? (
        <>
          <PhotoUploader
            loadId={loadId}
            userId={userId}
            role={role}
            allowMultiple
            buttonLabel="Pick Photos"
            onUploaded={(items) => {
              console.log('[TestUploaderSection] Photos uploaded:', items.length);
            }}
          />
          <View style={styles.galleryContainer}>
            <LoadPhotoGallery loadId={loadId} />
          </View>
        </>
      ) : (
        <Text>{isCreatingLoad ? 'Creating test load...' : 'Preparing test load…'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600" },
  sub: { opacity: 0.7, marginBottom: 8 },
  galleryContainer: { marginTop: 12 },
  error: { color: '#dc2626', marginTop: 8, marginBottom: 8 },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});