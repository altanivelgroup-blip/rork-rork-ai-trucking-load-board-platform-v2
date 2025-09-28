import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { ArrowLeft, Upload } from 'lucide-react-native';

export default function PhotoUploadPage() {
  const router = useRouter();

  const handleBack = () => {
    console.log('[PhotoUploadPage] Back pressed');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="photo-upload-removed-screen">
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} testID="btn-back">
          <ArrowLeft color={theme.colors.dark} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Photo Upload</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard} testID="info-removed">
          <Upload color={theme.colors.primary} size={32} />
          <Text style={styles.infoTitle}>Feature Not Available</Text>
          <Text style={styles.infoText}>
            The previous photo upload component and related references have been removed. This screen remains
            to preserve navigation without breaking the app.
          </Text>
          <Text style={styles.infoText}>
            If you need local-only testing, consider using the BarePhotoUploader pattern, but note it is currently
            not included in this app build.
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
    fontWeight: '700' as const,
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
    gap: 8,
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginTop: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
