import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import PhotoUploader from '@/components/PhotoUploader';
import { auth } from '@/utils/firebase';

export default function PhotoTest() {
  const [uploadedPhotos, setUploadedPhotos] = useState<{id:string;url:string;path:string}[]>([]);

  const handlePhotosUploaded = (items: {id:string;url:string;path:string}[]) => {
    console.log('[PhotoTest] Photos uploaded:', items.length);
    setUploadedPhotos(prev => [...prev, ...items]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Photo Upload Test</Text>
        
        <Text style={styles.subtitle}>
          User: {auth.currentUser?.uid ? 'Signed In' : 'Not Signed In'}
        </Text>

        <View style={styles.uploaderContainer}>
          <PhotoUploader
            loadId="test-load-123"
            userId={auth.currentUser?.uid || 'anonymous'}
            role="shipper"
            allowMultiple={true}
            buttonLabel="Test Photo Upload"
            onUploaded={handlePhotosUploaded}
          />
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            Uploaded Photos ({uploadedPhotos.length})
          </Text>
          
          {uploadedPhotos.map((photo, index) => (
            <View key={photo.id} style={styles.photoResult}>
              <Text style={styles.photoIndex}>#{index + 1}</Text>
              <Text style={styles.photoUrl} numberOfLines={2}>
                {photo.url}
              </Text>
            </View>
          ))}
          
          {uploadedPhotos.length === 0 && (
            <Text style={styles.noPhotos}>No photos uploaded yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  uploaderContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 12,
  },
  photoResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  photoIndex: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: 12,
    minWidth: 30,
  },
  photoUrl: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    flex: 1,
  },
  noPhotos: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});