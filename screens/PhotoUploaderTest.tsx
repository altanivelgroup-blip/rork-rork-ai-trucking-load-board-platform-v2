import React from 'react';
import { View, Text } from 'react-native';
import { PhotoUploader } from '@/components/PhotoUploader';

export default function PhotoUploaderTest() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Photo Uploader Test (Fake Mode - Safe Testing)</Text>
      <PhotoUploader 
        entityType="load"
        entityId="testLoad123"
        minPhotos={5}
        maxPhotos={20}
        mockMode={true}  // Fake uploads only
        onChange={(photos, primary, inProgress) => console.log("[PhotoUploader] Photos changed. Total:", photos.length, "Uploading:", inProgress)}
      />
    </View>
  );
}