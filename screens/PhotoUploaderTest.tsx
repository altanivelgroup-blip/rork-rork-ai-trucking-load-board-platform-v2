import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PhotoUploader, { PhotoData } from '@/components/PhotoUploader';

export default function PhotoUploaderTest() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  const handlePhotosChange = (updatedPhotos: PhotoData[]) => {
    console.log('[PhotoUploaderTest] Photos changed. Total:', updatedPhotos.length);
    setPhotos(updatedPhotos);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Uploader Test (Mock Mode - Safe Testing)</Text>
      <PhotoUploader 
        photos={photos}
        onPhotosChange={handlePhotosChange}
        maxPhotos={10}
        storagePath="test/photos"
        mockMode={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
});