import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { PhotoUploader, useCanPublish } from '@/components/PhotoUploader';
import { theme } from '@/constants/theme';
import { useToast } from '@/components/Toast';

export default function PhotoUploaderDemo() {
  const [loadPhotos, setLoadPhotos] = useState<string[]>([]);
  const [loadPrimaryPhoto, setLoadPrimaryPhoto] = useState<string>('');
  const [loadUploadsInProgress, setLoadUploadsInProgress] = useState<number>(0);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [vehiclePrimaryPhoto, setVehiclePrimaryPhoto] = useState<string>('');
  const [vehicleUploadsInProgress, setVehicleUploadsInProgress] = useState<number>(0);
  
  const toast = useToast();
  
  const canPublishLoad = useCanPublish('load', loadPhotos) && loadUploadsInProgress === 0;
  const canPublishVehicle = useCanPublish('vehicle', vehiclePhotos) && vehicleUploadsInProgress === 0;

  const handleLoadPhotosChange = (photos: string[], primaryPhoto: string, uploadsInProgress: number) => {
    console.log('[Demo] Load photos changed:', photos.length, 'primary:', primaryPhoto, 'uploadsInProgress:', uploadsInProgress);
    setLoadPhotos(photos);
    setLoadPrimaryPhoto(primaryPhoto);
    setLoadUploadsInProgress(uploadsInProgress);
  };

  const handleVehiclePhotosChange = (photos: string[], primaryPhoto: string, uploadsInProgress: number) => {
    console.log('[Demo] Vehicle photos changed:', photos.length, 'primary:', primaryPhoto, 'uploadsInProgress:', uploadsInProgress);
    setVehiclePhotos(photos);
    setVehiclePrimaryPhoto(primaryPhoto);
    setVehicleUploadsInProgress(uploadsInProgress);
  };

  const handlePublishLoad = () => {
    if (loadUploadsInProgress > 0) {
      toast.show('Please wait, uploading photos...', 'warning');
    } else if (canPublishLoad) {
      toast.show('Load published successfully!', 'success');
    } else {
      toast.show('Cannot publish load - need at least 2 photos', 'error');
    }
  };

  const handlePublishVehicle = () => {
    if (vehicleUploadsInProgress > 0) {
      toast.show('Please wait, uploading photos...', 'warning');
    } else if (canPublishVehicle) {
      toast.show('Vehicle published successfully!', 'success');
    } else {
      toast.show('Cannot publish vehicle - need at least 5 photos', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Photo Uploader Demo',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Load Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Load Photos (Min: 2)</Text>
          <Text style={styles.sectionSubtitle}>
            Current: {loadPhotos.length} photos
            {loadUploadsInProgress > 0 && ` • Uploading: ${loadUploadsInProgress}`}
            {loadPrimaryPhoto && ` • Primary: ${loadPrimaryPhoto.substring(0, 30)}...`}
          </Text>
          
          <View style={styles.uploaderContainer}>
            <PhotoUploader
              entityType="load"
              entityId="demo-load-123"
              onChange={handleLoadPhotosChange}
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.publishButton,
              canPublishLoad ? styles.publishButtonEnabled : styles.publishButtonDisabled
            ]}
            onPress={handlePublishLoad}
            disabled={!canPublishLoad}
          >
            <Text style={[
              styles.publishButtonText,
              canPublishLoad ? styles.publishButtonTextEnabled : styles.publishButtonTextDisabled
            ]}>
              {loadUploadsInProgress > 0 ? 'Uploading...' : canPublishLoad ? 'Publish Load' : `Need ${2 - loadPhotos.length} more photos`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Photos (Min: 5)</Text>
          <Text style={styles.sectionSubtitle}>
            Current: {vehiclePhotos.length} photos
            {vehicleUploadsInProgress > 0 && ` • Uploading: ${vehicleUploadsInProgress}`}
            {vehiclePrimaryPhoto && ` • Primary: ${vehiclePrimaryPhoto.substring(0, 30)}...`}
          </Text>
          
          <View style={styles.uploaderContainer}>
            <PhotoUploader
              entityType="vehicle"
              entityId="demo-vehicle-456"
              onChange={handleVehiclePhotosChange}
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.publishButton,
              canPublishVehicle ? styles.publishButtonEnabled : styles.publishButtonDisabled
            ]}
            onPress={handlePublishVehicle}
            disabled={!canPublishVehicle}
          >
            <Text style={[
              styles.publishButtonText,
              canPublishVehicle ? styles.publishButtonTextEnabled : styles.publishButtonTextDisabled
            ]}>
              {vehicleUploadsInProgress > 0 ? 'Uploading...' : canPublishVehicle ? 'Publish Vehicle' : `Need ${5 - vehiclePhotos.length} more photos`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to use:</Text>
          <Text style={styles.instructionText}>• Tap &quot;Add Photos&quot; to select from gallery</Text>
          <Text style={styles.instructionText}>• Tap &quot;Take Photo&quot; to use camera (mobile only)</Text>
          <Text style={styles.instructionText}>• Tap star icon to set cover photo</Text>
          <Text style={styles.instructionText}>• Tap trash icon to delete photo</Text>
          <Text style={styles.instructionText}>• Tap photo to view full size</Text>
          <Text style={styles.instructionText}>• Upload progress shown during upload</Text>
          <Text style={styles.instructionText}>• Photos are stored in Firebase Storage</Text>
          <Text style={styles.instructionText}>• URLs are saved to Firestore</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
  },
  uploaderContainer: {
    minHeight: 300,
    marginBottom: theme.spacing.lg,
  },
  publishButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  publishButtonEnabled: {
    backgroundColor: theme.colors.success,
  },
  publishButtonDisabled: {
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  publishButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  publishButtonTextEnabled: {
    color: theme.colors.white,
  },
  publishButtonTextDisabled: {
    color: theme.colors.gray,
  },
  instructionsContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  instructionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
});