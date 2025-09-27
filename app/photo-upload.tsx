import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react-native';
import PhotoUploader from '@/components/PhotoUploader';
import { auth } from '@/utils/firebase';
import { useToast } from '@/components/Toast';

export default function PhotoUploadPage() {
  const router = useRouter();
  const toast = useToast();
  const [uploadedPhotos, setUploadedPhotos] = useState<{id:string;url:string;path:string}[]>([]);

  const handleBack = () => {
    router.back();
  };

  const handlePhotosUploaded = (items: {id:string;url:string;path:string}[]) => {
    console.log('[PhotoUploadPage] Photos uploaded:', items.length);
    setUploadedPhotos(prev => [...prev, ...items]);
    toast?.success?.(`Successfully uploaded ${items.length} photo${items.length > 1 ? 's' : ''}!`);
  };

  const clearUploaded = () => {
    setUploadedPhotos([]);
    toast?.show?.('Cleared uploaded photos', 'info');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.dark} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Photo Upload</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Upload color={theme.colors.primary} size={32} />
          <Text style={styles.infoTitle}>Quick Photo Upload</Text>
          <Text style={styles.infoText}>
            Upload photos directly to Firebase Storage. Perfect for testing or adding photos to your loads.
          </Text>
        </View>

        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Upload Photos</Text>
          <Text style={styles.sectionSubtitle}>
            Select and upload multiple photos at once
          </Text>
          
          <PhotoUploader
            loadId={`direct-upload-${Date.now()}`}
            userId={auth?.currentUser?.uid || 'anonymous'}
            role="shipper"
            allowMultiple={true}
            buttonLabel="Select & Upload Photos"
            onUploaded={handlePhotosUploaded}
          />
        </View>

        {uploadedPhotos.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <CheckCircle color="#22c55e" size={24} />
              <Text style={styles.resultsTitle}>
                Successfully Uploaded ({uploadedPhotos.length})
              </Text>
            </View>
            
            <View style={styles.photosList}>
              {uploadedPhotos.map((photo, index) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Text style={styles.photoIndex}>{index + 1}.</Text>
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoId} numberOfLines={1}>
                      ID: {photo.id}
                    </Text>
                    <Text style={styles.photoUrl} numberOfLines={1}>
                      {photo.url}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable onPress={clearUploaded} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear List</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>How to Use</Text>
          <Text style={styles.helpText}>
            1. Tap "Select & Upload Photos" to choose photos from your device
          </Text>
          <Text style={styles.helpText}>
            2. Photos will be automatically compressed and uploaded to Firebase Storage
          </Text>
          <Text style={styles.helpText}>
            3. You'll see the upload progress and get confirmation when complete
          </Text>
          <Text style={styles.helpText}>
            4. If upload gets stuck, use the "Force Stop" button to cancel and retry
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadSection: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: 16,
  },
  resultsSection: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginLeft: 8,
  },
  photosList: {
    gap: 12,
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
  },
  photoIndex: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: 8,
    minWidth: 20,
  },
  photoInfo: {
    flex: 1,
  },
  photoId: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  photoUrl: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  clearButton: {
    backgroundColor: theme.colors.gray + '20',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  clearButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  helpSection: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helpTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 12,
  },
  helpText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: 8,
    lineHeight: 20,
  },
});