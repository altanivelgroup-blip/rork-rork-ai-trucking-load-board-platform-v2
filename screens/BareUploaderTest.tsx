import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarePhotoUploader } from '@/components/BarePhotoUploader';

export default function BareUploaderTest() {
  return (
    <View style={styles.container}>
      <Text>Bare Uploader Test (Local Only)</Text>
      <BarePhotoUploader minPhotos={5} maxPhotos={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});