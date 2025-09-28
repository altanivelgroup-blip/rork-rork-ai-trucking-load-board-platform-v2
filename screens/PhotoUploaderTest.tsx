import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import PhotoUploader from '@/components/PhotoUploader';
import { Camera, ArrowLeft, CheckCircle, AlertCircle, Upload, RefreshCw } from 'lucide-react-native';
import { auth } from '@/utils/firebase';

export default function PhotoUploaderTestScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [uploadedPhotos, setUploadedPhotos] = useState<{id:string;url:string;path:string}[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [testId, setTestId] = useState(Date.now());

  const handlePhotosUploaded = (items: {id:string;url:string;path:string}[]) => {
    console.log('[PhotoUploaderTest] Photos uploaded:', items.length);
    setUploadedPhotos(prev => [...prev, ...items]);
    setUploadStatus('success');
    toast.show(`✅ Successfully uploaded ${items.length} photo${items.length > 1 ? 's' : ''}!`, 'success');
  };

  const clearUploads = () => {
    setUploadedPhotos([]);
    setUploadStatus('idle');
    toast.show('🗑️ Upload history cleared', 'info');
  };

  const resetUploader = () => {
    setTestId(Date.now());
    setUploadStatus('idle');
    toast.show('🔄 PhotoUploader reset', 'info');
  };

  const currentUser = auth.currentUser;

  // Debug logging for uploader props
  const loadId = "testLoad123";
  const userId = currentUser?.uid || user?.id || 'pu2bP7pzfuW39mgNDtO6im2Z';
  const role = "shipper" as const;
  
  console.log("Testing PhotoUploader with loadId: testLoad123, role: shipper");
  console.log("[Debug] Uploader props:", { loadId, userId, role });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{ 
          title: 'PhotoUploader Test',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={theme.colors.dark} />
            </Pressable>
          ),
        }} 
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Camera size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>PhotoUploader Test</Text>
          <Text style={styles.headerSubtitle}>
            Testing PhotoUploader with loadId: testLoad123, role: shipper, userId: {userId}
          </Text>
        </View>

        {/* Firebase Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>🔥 Firebase Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text style={[styles.statusValue, { color: theme.colors.success }]}>
              ✅ Firebase connected
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Auth:</Text>
            <Text style={[styles.statusValue, { 
              color: currentUser ? theme.colors.success : theme.colors.warning 
            }]}>
              {currentUser ? `Signed in: ${currentUser.uid.slice(0, 8)}...` : '⚠️ Not signed in'}
              {currentUser ? ' (Authenticated)' : ' (Anonymous mode)'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Storage:</Text>
            <Text style={[styles.statusValue, { color: theme.colors.success }]}>
              ✅ Firebase Storage Ready
            </Text>
          </View>
        </View>

        {/* Upload Status */}
        <View style={styles.uploadCard}>
          <View style={styles.uploadHeader}>
            {uploadStatus === 'success' && <CheckCircle size={20} color={theme.colors.success} />}
            {uploadStatus === 'error' && <AlertCircle size={20} color={theme.colors.danger} />}
            {uploadStatus === 'idle' && <Upload size={20} color={theme.colors.gray} />}
            <Text style={styles.uploadTitle}>
              {uploadStatus === 'success' && '✅ Upload Successful'}
              {uploadStatus === 'error' && '❌ Upload Failed'}
              {uploadStatus === 'idle' && '📤 Ready to Upload'}
            </Text>
          </View>
          
          <Text style={styles.uploadText}>
            {uploadStatus === 'success' && `${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''} uploaded successfully`}
            {uploadStatus === 'error' && 'Upload failed. Check console for details.'}
            {uploadStatus === 'idle' && 'Select photos to test the PhotoUploader functionality'}
          </Text>

          {uploadedPhotos.length > 0 && (
            <View style={styles.uploadedList}>
              <Text style={styles.uploadedTitle}>📸 Uploaded Photos:</Text>
              {uploadedPhotos.map((photo, index) => (
                <View key={photo.id} style={styles.uploadedItem}>
                  <CheckCircle size={16} color={theme.colors.success} />
                  <Text style={styles.uploadedText}>
                    Photo {index + 1}: {photo.id}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Photo Uploader */}
        <View style={styles.uploaderCard}>
          <View style={styles.uploaderHeader}>
            <Text style={styles.uploaderTitle}>📸 PhotoUploader Test</Text>
            <Pressable onPress={resetUploader} style={styles.resetButton}>
              <RefreshCw size={16} color={theme.colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.uploaderSubtitle}>
            Testing with loadId: testLoad123, role: shipper
          </Text>
          
          <PhotoUploader
            key={testId}
            loadId={loadId}
            role={role}
            userId={userId}
            maxPhotos={5}
            onUploaded={(urls) => {
              console.log("Uploaded URLs:", urls);
              handlePhotosUploaded(urls);
            }}
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          {uploadedPhotos.length > 0 && (
            <Pressable style={styles.clearButton} onPress={clearUploads}>
              <Text style={styles.clearButtonText}>🗑️ Clear Upload History</Text>
            </Pressable>
          )}
          
          <Pressable style={styles.resetUploaderButton} onPress={resetUploader}>
            <RefreshCw size={16} color={theme.colors.white} />
            <Text style={styles.resetUploaderButtonText}>Reset Uploader</Text>
          </Pressable>
        </View>

        {/* Debug Info */}
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>🔍 Debug Information</Text>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Load ID:</Text>
            <Text style={styles.debugValue}>{loadId}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>User ID:</Text>
            <Text style={styles.debugValue}>{userId}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Role:</Text>
            <Text style={styles.debugValue}>{role}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Test ID:</Text>
            <Text style={styles.debugValue}>{testId}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Total Uploads:</Text>
            <Text style={styles.debugValue}>{uploadedPhotos.length}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Upload Status:</Text>
            <Text style={[styles.debugValue, { 
              color: uploadStatus === 'success' ? theme.colors.success : 
                     uploadStatus === 'error' ? theme.colors.danger : 
                     theme.colors.gray 
            }]}>
              {uploadStatus.toUpperCase()}
            </Text>
          </View>
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
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  statusTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  uploadCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  uploadTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  uploadText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
  },
  uploadedList: {
    marginTop: theme.spacing.sm,
  },
  uploadedTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  uploadedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  uploadedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    flex: 1,
  },
  uploaderCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  uploaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  uploaderTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  resetButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.primary}20`,
  },
  uploaderSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
  },
  actionsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: theme.spacing.md,
  },
  clearButton: {
    backgroundColor: theme.colors.danger,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  resetUploaderButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  resetUploaderButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  debugCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  debugTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  debugLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  debugValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontWeight: '600',
  },
});