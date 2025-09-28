import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PhotoUploader, { PhotoData } from '@/components/PhotoUploader';

export default function PhotoUploaderTest() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  const handlePhotosChange = (newPhotos: PhotoData[]) => {
    console.log("[PhotoUploader] Photos changed. Total:", newPhotos.length);
    setPhotos(newPhotos);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Uploader Test (Fake Mode - Safe Testing)</Text>
      <PhotoUploader 
        photos={photos}
        onPhotosChange={handlePhotosChange}
        maxPhotos={10}
        storagePath="test-uploads"
        mockMode={true}  // Fake uploads only, no real stuff
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