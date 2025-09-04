import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Send, Clock } from 'lucide-react-native';

import { usePostLoad } from '@/hooks/usePostLoad';
import { PhotoUploader } from '@/components/PhotoUploader';
import { useToast } from '@/components/Toast';
import { getFirebase } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function Stepper({ current, total }: { current: number; total: number }) {
  const items = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  return (
    <View style={styles.stepper}>
      {items.map((n, idx) => {
        const active = n === current;
        return (
          <View key={n} style={styles.stepItem}>
            <View style={[styles.stepDot, active ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepNumber, active ? styles.stepNumberActive : styles.stepNumberInactive]}>{n}</Text>
            </View>
            {idx < items.length - 1 && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );
}
export default function PostLoadStep5() {
  const router = useRouter();
  const { draft, setField } = usePostLoad();
  const [contact, setContact] = useState<string>(draft.contact || '');
  const [, setPhotoUploadStatus] = useState<{ uploading: boolean; completedCount: number; totalCount: number }>({ uploading: false, completedCount: 0, totalCount: 0 });
  const [uploadsInProgress, setUploadsInProgress] = useState<number>(0);
  const toast = useToast();



  const onPrevious = useCallback(() => {
    try { router.back(); } catch (e) { console.log('[PostLoadStep5] previous error', e); }
  }, [router]);



  // Helper functions
  const str = useCallback((v: any) => typeof v === 'string' ? v.trim() : '', []);
  
  const mapFirestoreError = useCallback((err: any) => {
    if (err?.code === 'permission-denied') return 'Permission denied. Check Firestore rules for /loads.';
    if (err?.code === 'invalid-argument') return 'Bad field types. Ensure numbers are numbers.';
    return err?.message || 'Failed to post. Try again.';
  }, []);

  const onSubmit = useCallback(async () => {
    console.log('POST BTN FIRED - onSubmit called');
    
    try {
      // Validation checks
      if (uploadsInProgress > 0) {
        toast.show('Please wait, uploading photos…', 'warning');
        return;
      }
      
      if (!Array.isArray(draft.photoUrls) || draft.photoUrls.length < 5) {
        toast.show('Need at least 5 photos.', 'error');
        return;
      }
      
      if (!draft.photoUrls[0]) {
        toast.show('Primary photo is required.', 'error');
        return;
      }
      
      if (draft.isPosting) {
        console.log('Already posting, aborting duplicate submit');
        return;
      }
      
      // Set posting state
      setField('isPosting', true);
      
      // Prepare payload
      const load_id = `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const photos = draft.photoUrls || [];
      const primaryPhoto = photos[0] || '';
      
      const payload = {
        title: str(draft.title),
        route: { 
          pickupZip: str(draft.pickup), 
          dropZip: str(draft.delivery) 
        },
        vehicleType: str(draft.vehicleType || 'CAR-HAULER'),
        rateUsd: Number(draft.rateAmount || 0),
        membership_required: 'Basic',
        is_featured: false,
        photos,
        primaryPhoto,
        created_at: serverTimestamp(),
        status: 'posted'
      };
      
      console.log('Posting load:', load_id, photos, primaryPhoto);
      
      // Post to Firestore
      const { db } = getFirebase();
      await setDoc(doc(db, 'loads', load_id), payload, { merge: true });
      
      toast.show('Load posted!', 'success');
      router.replace('/(tabs)/(loads)');
      
    } catch (err) {
      console.error('POST_LOAD_ERROR', err);
      toast.show(mapFirestoreError(err), 'error');
      setField('isPosting', false);
    }
  }, [router, setField, draft, uploadsInProgress, toast, str, mapFirestoreError]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={styles.scrollContent}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="postLoadHeaderTitle">Post Load</Text>
            <Stepper current={5} total={5} />
          </View>

          <Text style={styles.bigTitle} testID="contactReviewTitle">Contact & Review</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.blockLabel}>Contact Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number or email for carriers to contact"
              placeholderTextColor={theme.colors.gray}
              value={contact}
              onChangeText={setContact}
              keyboardType={Platform.select({ ios: 'email-address', android: 'email-address', default: 'default' }) as 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad' | undefined}
              autoCapitalize="none"
              testID="contactInput"
            />
          </View>

          <View style={styles.attachCard}>
            <Text style={styles.summaryTitle}>Photos (min 5 required)</Text>
            
            {/* Upload status indicator */}
            {uploadsInProgress > 0 && (
              <View style={styles.uploadStatusContainer}>
                <Clock color={theme.colors.primary} size={18} />
                <Text style={styles.uploadStatusText}>
                  Uploading {uploadsInProgress} photo{uploadsInProgress > 1 ? 's' : ''}... Please wait.
                </Text>
              </View>
            )}
            
            <Text style={styles.helperText} testID="attachmentsHelper">
              Photos completed: {draft.photoUrls?.length || 0} (min 5 required)
            </Text>
            
            {(!draft.photoUrls || draft.photoUrls.length < 5) && uploadsInProgress === 0 && (
              <Text style={styles.errorText} testID="attachmentsError">
                Minimum 5 photos required to post.
              </Text>
            )}
            
            {/* Use PhotoUploader component */}
            <PhotoUploader
              entityType="load"
              entityId={draft.reference}
              minPhotos={5}
              maxPhotos={20}
              onChange={(photos, primaryPhoto, newUploadsInProgress) => {
                console.log('PhotoUploader onChange:', { photos: photos.length, primaryPhoto, uploadsInProgress: newUploadsInProgress });
                setUploadsInProgress(newUploadsInProgress);
                // Update photo upload status for UI
                setPhotoUploadStatus({
                  uploading: newUploadsInProgress > 0,
                  completedCount: photos.length,
                  totalCount: photos.length + newUploadsInProgress
                });
                // Update draft with photo URLs
                setField('photoUrls', photos);
              }}
            />
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Load Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Title:</Text>
              <Text style={styles.summaryValue}>{draft.title || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Route:</Text>
              <Text style={styles.summaryValue}>{draft.pickup || '-'} → {draft.delivery || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Vehicle:</Text>
              <Text style={styles.summaryValue}>{draft.vehicleType?.toUpperCase?.() || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Rate:</Text>
              <Text style={styles.summaryValue}>
                ${draft.rateAmount || '0'} ({draft.rateKind === 'per_mile' ? 'per mile' : 'flat'})
                {draft.rateKind === 'per_mile' && draft.miles ? ` × ${draft.miles} miles` : ''}
              </Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.stickyFooter}>
          <View style={styles.footerContent}>
            <Pressable onPress={onPrevious} style={styles.secondaryBtn} accessibilityRole="button" testID="prevButton">
              <Text style={styles.secondaryBtnText}>Previous</Text>
            </Pressable>
            <Pressable 
              onPress={onSubmit} 
              style={[
                styles.postBtn, 
                (uploadsInProgress > 0 || 
                 !draft.photoUrls || 
                 draft.photoUrls.length < 5 || 
                 !draft.photoUrls[0] || 
                 draft.isPosting) && styles.postBtnDisabled
              ]} 
              disabled={
                uploadsInProgress > 0 || 
                !draft.photoUrls || 
                draft.photoUrls.length < 5 || 
                !draft.photoUrls[0] || 
                draft.isPosting
              } 
              accessibilityRole="button" 
              accessibilityState={{ 
                disabled: uploadsInProgress > 0 || 
                         !draft.photoUrls || 
                         draft.photoUrls.length < 5 || 
                         !draft.photoUrls[0] || 
                         draft.isPosting 
              }} 
              testID="postLoadBtn"
            >
              {draft.isPosting ? (
                <ActivityIndicator color={theme.colors.white} size={18} />
              ) : (
                <Send color={theme.colors.white} size={18} />
              )}
              <Text style={styles.postBtnText}>
                {uploadsInProgress > 0 
                  ? 'Please wait, uploading photos…' 
                  : draft.isPosting 
                  ? 'Posting...' 
                  : 'Post Load'
                }
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scrollContent: { padding: 16, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark, marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepDotInactive: { backgroundColor: '#cbd5e1' },
  stepNumber: { fontSize: theme.fontSize.md, fontWeight: '700' },
  stepNumberActive: { color: theme.colors.white },
  stepNumberInactive: { color: theme.colors.dark, opacity: 0.7 },
  stepConnector: { width: 24, height: 4, backgroundColor: '#cbd5e1', marginHorizontal: 8, borderRadius: 2 },

  bigTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.dark, textAlign: 'center', marginBottom: 16 },
  fieldBlock: { marginBottom: 16 },
  blockLabel: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }) as number,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },

  attachCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  summaryTitle: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.dark, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryKey: { fontSize: theme.fontSize.md, color: theme.colors.dark, fontWeight: '800' },
  summaryValue: { fontSize: theme.fontSize.md, color: theme.colors.dark, fontWeight: '700' },

  helperText: { color: theme.colors.gray, marginTop: 4, marginBottom: 8, fontSize: theme.fontSize.md },
  errorText: { color: '#ef4444', fontWeight: '700', marginBottom: 8 },
  uploadStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  uploadStatusText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  attachActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  attachBtn: { flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  attachBtnText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '800' },
  attachBtnAlt: { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  attachBtnAltText: { color: theme.colors.dark, fontSize: theme.fontSize.md, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: '23%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  stickyFooter: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 999, 
    elevation: 999 
  },
  footerContent: { 
    padding: 12, 
    backgroundColor: theme.colors.white, 
    borderTopWidth: 1, 
    borderColor: '#eee',
    flexDirection: 'row',
    gap: 12
  },
  secondaryBtn: { flex: 1, backgroundColor: '#cbd5e1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: theme.colors.dark, fontSize: theme.fontSize.lg, fontWeight: '800' },
  postBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  postBtnDisabled: { backgroundColor: '#94a3b8' },
  postBtnText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: '800' },
});
