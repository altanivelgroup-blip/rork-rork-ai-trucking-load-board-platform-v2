import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
// import { PhotoUploader } from '@/components/PhotoUploader'; // Removed for restructuring
import { theme } from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';

export default function PhotoValidationTestScreen() {
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [otherPhotos, setOtherPhotos] = useState<string[]>([]);
  const [vehiclePrimary, setVehiclePrimary] = useState<string>('');
  const [otherPrimary, setOtherPrimary] = useState<string>('');
  const [vehicleUploadsInProgress, setVehicleUploadsInProgress] = useState<number>(0);
  const [otherUploadsInProgress, setOtherUploadsInProgress] = useState<number>(0);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Photo Upload Validation Test',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft color={theme.colors.primary} size={24} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Load Photos (Mandatory: 5 photos)</Text>
          <Text style={styles.sectionDescription}>
            Vehicle loads require exactly 5 photos for protection. This is mandatory.
          </Text>
          
          <Text style={{ color: '#666', fontStyle: 'italic' }}>PhotoUploader removed for restructuring</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: {vehiclePhotos.length}/5 photos uploaded
            </Text>
            {vehicleUploadsInProgress > 0 && (
              <Text style={styles.uploadingText}>
                {vehicleUploadsInProgress} uploads in progress...
              </Text>
            )}
            {vehiclePhotos.length === 5 && vehicleUploadsInProgress === 0 && (
              <Text style={styles.successText}>
                ✅ Vehicle load ready! All mandatory photos uploaded.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Load Photos (Optional: 2-3 photos)</Text>
          <Text style={styles.sectionDescription}>
            Other load types need at least 2 photos, up to 3 photos allowed.
          </Text>
          
          <Text style={{ color: '#666', fontStyle: 'italic' }}>PhotoUploader removed for restructuring</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: {otherPhotos.length}/3 photos uploaded (min: 2)
            </Text>
            {otherUploadsInProgress > 0 && (
              <Text style={styles.uploadingText}>
                {otherUploadsInProgress} uploads in progress...
              </Text>
            )}
            {otherPhotos.length >= 2 && otherUploadsInProgress === 0 && (
              <Text style={styles.successText}>
                ✅ Load ready! Minimum photos uploaded.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.testResults}>
          <Text style={styles.testTitle}>Validation Test Results</Text>
          
          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Vehicle Load Validation:</Text>
            <Text style={[styles.testValue, vehiclePhotos.length === 5 ? styles.testPass : styles.testFail]}>
              {vehiclePhotos.length === 5 ? 'PASS' : 'FAIL'} ({vehiclePhotos.length}/5)
            </Text>
          </View>
          
          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Other Load Validation:</Text>
            <Text style={[styles.testValue, otherPhotos.length >= 2 ? styles.testPass : styles.testFail]}>
              {otherPhotos.length >= 2 ? 'PASS' : 'FAIL'} ({otherPhotos.length}/3, min: 2)
            </Text>
          </View>
          
          <View style={styles.testItem}>
            <Text style={styles.testLabel}>Upload Progress:</Text>
            <Text style={styles.testValue}>
              Vehicle: {vehicleUploadsInProgress}, Other: {otherUploadsInProgress}
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
    backgroundColor: theme.colors.white,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  sectionDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  statusContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '500' as const,
  },
  uploadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  successText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '600' as const,
    marginTop: theme.spacing.xs,
  },
  testResults: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
  },
  testTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  testLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  testValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  testPass: {
    color: theme.colors.success,
  },
  testFail: {
    color: theme.colors.danger,
  },
});