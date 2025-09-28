import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function BarePhotoUploader() {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const selectPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedPhotos(prev => [...prev, uri]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={selectPhoto}>
        <Text style={styles.buttonText}>Select Photo</Text>
      </TouchableOpacity>
      
      <Text style={styles.counter}>Selected: {selectedPhotos.length} photos</Text>
      
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
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});