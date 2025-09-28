import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface BarePhotoUploaderProps {
  minPhotos?: number;
  maxPhotos?: number;
}

export default function BarePhotoUploader({ 
  minPhotos = 5, 
  maxPhotos = 20 
}: BarePhotoUploaderProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const selectPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setSelectedPhotos(prev => {
          const combined = [...prev, ...newUris];
          return combined.slice(0, maxPhotos);
        });
      }
    } catch (error) {
      console.log('Error selecting photos:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={selectPhotos}>
        <Text style={styles.buttonText}>Select Photos</Text>
      </TouchableOpacity>
      
      <Text style={styles.counter}>Selected: {selectedPhotos.length} / {maxPhotos}</Text>
      
      {selectedPhotos.length < minPhotos && (
        <Text style={styles.warning}>
          Need at least {minPhotos} photos
        </Text>
      )}
      
      {selectedPhotos.length > 0 && (
        <View style={styles.grid}>
          {selectedPhotos.map((uri, index) => (
            <Image 
              key={index} 
              source={{ uri }} 
              style={styles.thumbnail} 
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  counter: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  warning: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});