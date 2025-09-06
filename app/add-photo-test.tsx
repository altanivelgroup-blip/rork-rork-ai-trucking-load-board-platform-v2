import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { PhotoUploader } from '@/components/PhotoUploader';
import { theme } from '@/constants/theme';
import { useToast } from '@/components/Toast';

export default function AddPhotoTest() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string>('');
  const [inProgress, setInProgress] = useState<number>(0);
  const toast = useToast();

  const handleChange = (p: string[], cover: string, uploads: number) => {
    console.log('[AddPhotoTest] change', { count: p.length, uploads });
    setPhotos(p);
    setPrimary(cover);
    setInProgress(uploads);
  };

  return (
    <View style={styles.container} testID="addPhotoTestScreen">
      <Stack.Screen
        options={{
          title: 'Add Photo Test',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} testID="addPhotoTestTitle">Quick Photo Uploader</Text>
        <Text style={styles.subtitle} testID="addPhotoTestSubtitle">
          Use this page to quickly test photo selection and upload without the 5-step flow.
        </Text>

        <View style={styles.card} testID="photoUploaderCard">
          <PhotoUploader
            entityType="load"
            entityId="single-test-load"
            minPhotos={1}
            onChange={handleChange}
          />
        </View>

        <View style={styles.status} testID="uploadStatus">
          <Text style={styles.statusText}>Photos: {photos.length}</Text>
          {primary ? <Text style={styles.statusText}> • Cover set</Text> : null}
          {inProgress > 0 ? (
            <Text style={styles.statusUploading}> • Uploading {inProgress}...</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700' as const, color: theme.colors.dark },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.gray },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, overflow: 'hidden' },
  status: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm },
  statusText: { fontSize: theme.fontSize.md, color: theme.colors.dark },
  statusUploading: { fontSize: theme.fontSize.md, color: theme.colors.primary },
});
