import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { PhotoUploader } from '@/components/PhotoUploader';
import { useToast } from '@/components/Toast';
import { CheckCircle, AlertCircle, Camera, Settings } from 'lucide-react-native';
import uuid from 'react-native-uuid';

export default function AuthPhotoTestScreen() {
  const router = useRouter();
  const toast = useToast();
  const [testEntityId] = useState(() => uuid.v4() as string);
  const [photos, setPhotos] = useState<string[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>('');
  const [uploadsInProgress, setUploadsInProgress] = useState<number>(0);

  const handlePhotoChange = (newPhotos: string[], newPrimaryPhoto: string, newUploadsInProgress: number) => {
    console.log('[AuthPhotoTest] Photo change:', {
      photos: newPhotos.length,
      primaryPhoto: !!newPrimaryPhoto,
      uploadsInProgress: newUploadsInProgress
    });
    
    setPhotos(newPhotos);
    setPrimaryPhoto(newPrimaryPhoto);
    setUploadsInProgress(newUploadsInProgress);
  };

  const handleTestVehicleEdit = () => {
    router.push('/vehicle-edit');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen 
        options={{ 
          title: 'Auth & Photo Test',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
        }} 
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Test Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication & Photo Upload Test</Text>
          <Text style={styles.sectionSubtitle}>
            This screen tests the fixed authentication and photo upload functionality.
          </Text>
          
          <View style={styles.statusRow}>
            <CheckCircle color={theme.colors.success} size={20} />
            <Text style={styles.statusText}>Enhanced authentication with fallback handling</Text>
          </View>
          
          <View style={styles.statusRow}>
            <CheckCircle color={theme.colors.success} size={20} />
            <Text style={styles.statusText}>User-friendly error messages with recovery instructions</Text>
          </View>
          
          <View style={styles.statusRow}>
            <CheckCircle color={theme.colors.success} size={20} />
            <Text style={styles.statusText}>Fresh token refresh to prevent auth errors</Text>
          </View>
          
          <View style={styles.statusRow}>
            <CheckCircle color={theme.colors.success} size={20} />
            <Text style={styles.statusText}>Cross-platform compatibility (web, iOS, Android)</Text>
          </View>
        </View>

        {/* Photo Upload Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Upload Test</Text>
          <Text style={styles.sectionSubtitle}>
            Test photo uploads with the enhanced authentication system.
          </Text>
          
          <PhotoUploader
            entityType="vehicle"
            entityId={testEntityId}
            minPhotos={2}
            maxPhotos={10}
            onChange={handlePhotoChange}
          />
          
          {/* Upload Status */}
          <View style={styles.uploadStatus}>
            <Text style={styles.uploadStatusTitle}>Upload Status:</Text>
            <Text style={styles.uploadStatusText}>
              Photos: {photos.length} | Primary: {primaryPhoto ? '✅' : '❌'} | Uploading: {uploadsInProgress}
            </Text>
          </View>
        </View>

        {/* Vehicle Edit Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Edit Test</Text>
          <Text style={styles.sectionSubtitle}>
            Test the vehicle edit screen with enhanced authentication.
          </Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestVehicleEdit}
          >
            <Settings color={theme.colors.white} size={20} />
            <Text style={styles.testButtonText}>Test Vehicle Edit Screen</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Instructions</Text>
          <Text style={styles.instructionText}>
            1. Try uploading photos using the PhotoUploader above{'\n'}
            2. If you get authentication errors, the system should show user-friendly messages{'\n'}
            3. Test the Vehicle Edit screen by tapping the button{'\n'}
            4. Both should now handle authentication gracefully with proper error recovery{'\n'}
            5. Check the console logs for detailed authentication flow information
          </Text>
        </View>

        {/* Error Recovery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Recovery</Text>
          <Text style={styles.instructionText}>
            If you encounter authentication errors:{'\n'}
            • The app will show clear instructions to refresh and sign in{'\n'}
            • No more generic "Authentication required" messages{'\n'}
            • Enhanced error handling prevents crashes{'\n'}
            • Fresh token refresh prevents permission denied errors
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  uploadStatus: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  uploadStatusTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  uploadStatusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontFamily: 'monospace',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  testButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    lineHeight: 20,
  },
});