import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoUploader, { PhotoData } from '@/components/PhotoUploader';
import { theme } from '@/constants/theme';

export default function PhotoUploaderTestScreen() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  const handlePhotosChange = (newPhotos: PhotoData[]) => {
    console.log('[PhotoUploaderTest] Photos changed:', newPhotos.length);
    setPhotos(newPhotos);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'Photo Uploader Test' }} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Uploader Test</Text>
          <Text style={styles.sectionSubtitle}>
            This tests the PhotoUploader component with all progress indicators,
            photo count, and upload status features.
          </Text>
          
          <PhotoUploader
            photos={photos}
            onPhotosChange={handlePhotosChange}
            maxPhotos={20}
            storagePath="test/photos"
            mockMode={true}
          />
        </View>
        
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>Total photos: {photos.length}</Text>
          <Text style={styles.debugText}>
            Completed: {photos.filter(p => p.status === 'completed').length}
          </Text>
          <Text style={styles.debugText}>
            Uploading: {photos.filter(p => p.status === 'uploading').length}
          </Text>
          <Text style={styles.debugText}>
            Failed: {photos.filter(p => p.status === 'failed').length}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  debugSection: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  debugText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
});