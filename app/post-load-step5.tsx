import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Send, Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { usePostLoad } from '@/hooks/usePostLoad';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

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
  const { draft, setField, postLoadWizard, uploadPhotos } = usePostLoad();
  const [contact, setContact] = useState<string>(draft.contact || '');

  const isReady = useMemo(() => {
    const hasContact = contact.trim().length > 0;
    const hasMinPhotos = (draft.attachments?.length ?? 0) >= 5;
    const hasRequiredFields = (
      draft.title?.trim() && 
      draft.description?.trim() && 
      draft.pickup?.trim() && 
      draft.delivery?.trim() && 
      draft.vehicleType && 
      draft.rateAmount?.trim()
    );
    const hasValidDates = (
      draft.pickupDate && 
      draft.deliveryDate &&
      draft.pickupDate instanceof Date &&
      draft.deliveryDate instanceof Date &&
      !isNaN(draft.pickupDate.getTime()) &&
      !isNaN(draft.deliveryDate.getTime())
    );
    const notPosting = !draft.isPosting;
    
    const ready = hasContact && hasMinPhotos && hasRequiredFields && hasValidDates && notPosting;
    
    console.log('[PostLoadStep5] isReady check:', {
      hasContact,
      hasMinPhotos,
      hasRequiredFields,
      hasValidDates,
      notPosting,
      ready,
      contactValue: contact,
      photoCount: draft.photoUrls?.length ?? 0,
      attachmentCount: draft.attachments?.length ?? 0,
      pickupDate: draft.pickupDate,
      deliveryDate: draft.deliveryDate,
      pickupDateType: typeof draft.pickupDate,
      deliveryDateType: typeof draft.deliveryDate,
      pickupDateValid: draft.pickupDate instanceof Date && !isNaN(draft.pickupDate.getTime()),
      deliveryDateValid: draft.deliveryDate instanceof Date && !isNaN(draft.deliveryDate.getTime())
    });
    
    return ready;
  }, [contact, draft.isPosting, draft.photoUrls, draft.attachments, draft.title, draft.description, draft.pickup, draft.delivery, draft.vehicleType, draft.rateAmount, draft.pickupDate, draft.deliveryDate]);

  const onPrevious = useCallback(() => {
    try { router.back(); } catch (e) { console.log('[PostLoadStep5] previous error', e); }
  }, [router]);

  const requestMediaPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add attachments.');
      return false;
    }
    return true;
  }, []);

  const pickFromLibrary = useCallback(async () => {
    try {
      const ok = await requestMediaPermission();
      if (!ok) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 6,
      });
      if (result.canceled) return;
      const newItems = (result.assets ?? []).map((a) => ({ uri: a.uri, name: a.fileName ?? 'image.jpg', type: a.mimeType ?? 'image/jpeg' }));
      const next = [...(draft.attachments ?? []), ...newItems];
      setField('attachments', next);
    } catch (e) {
      console.log('[PostLoadStep5] pickFromLibrary error', e);
      Alert.alert('Error', 'Could not pick images.');
    }
  }, [draft.attachments, requestMediaPermission, setField]);

  const takePhoto = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not supported on web', 'Use Upload Photos on web.');
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (result.canceled) return;
      const a = result.assets?.[0];
      if (!a) return;
      const next = [...(draft.attachments ?? []), { uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.mimeType ?? 'image/jpeg' }];
      setField('attachments', next);
    } catch (e) {
      console.log('[PostLoadStep5] takePhoto error', e);
      Alert.alert('Error', 'Could not take photo.');
    }
  }, [draft.attachments, setField]);

  const removeAttachment = useCallback((uri: string) => {
    try {
      const next = (draft.attachments ?? []).filter((i) => i.uri !== uri);
      setField('attachments', next);
    } catch (e) {
      console.log('[PostLoadStep5] removeAttachment error', e);
    }
  }, [draft.attachments, setField]);

  const onSubmit = useCallback(async () => {
    console.log('POST BTN FIRED - onSubmit called');
    
    if (!isReady) {
      console.log('Button not ready, aborting submit');
      Alert.alert('Error', 'Please complete all required fields before posting.');
      return;
    }
    
    if (draft.isPosting) {
      console.log('Already posting, aborting duplicate submit');
      return;
    }
    
    try {
      console.log('Starting post load process...');
      
      // Update contact in draft first
      setField('contact', contact.trim());
      
      // Set posting state immediately to prevent double-clicks
      setField('isPosting', true);
      
      // Small delay to ensure contact is updated in state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Upload photos first if we have attachments but no uploaded URLs
      if ((draft.attachments?.length ?? 0) > 0 && (draft.photoUrls?.length ?? 0) === 0) {
        console.log('Uploading photos before posting...');
        await uploadPhotos();
        
        // Small delay to ensure photo URLs are updated in state
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Final validation before posting
      console.log('[PostLoadStep5] Final validation before posting:', {
        title: draft.title?.trim(),
        description: draft.description?.trim(),
        pickup: draft.pickup?.trim(),
        delivery: draft.delivery?.trim(),
        vehicleType: draft.vehicleType,
        rateAmount: draft.rateAmount?.trim(),
        pickupDate: draft.pickupDate,
        deliveryDate: draft.deliveryDate,
        pickupDateType: typeof draft.pickupDate,
        deliveryDateType: typeof draft.deliveryDate,
        pickupDateValid: draft.pickupDate instanceof Date && !isNaN(draft.pickupDate.getTime()),
        deliveryDateValid: draft.deliveryDate instanceof Date && !isNaN(draft.deliveryDate.getTime()),
        contact: contact.trim(),
        attachments: draft.attachments?.length ?? 0,
        photoUrls: draft.photoUrls?.length ?? 0
      });
      
      // Use the postLoadWizard function which handles all validation and posting
      console.log('Calling postLoadWizard with contact info:', contact.trim());
      await postLoadWizard(contact.trim());
      
      console.log('Load posted successfully, navigating...');
      // Navigate to loads list on success
      router.replace('/(tabs)/(loads)');
      
    } catch (e) {
      console.error('[PostLoadStep5] submit error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to post load. Please try again.';
      Alert.alert('Error', errorMessage);
      
      // Reset posting state on error
      setField('isPosting', false);
    }
  }, [contact, postLoadWizard, router, setField, draft, isReady, uploadPhotos]);

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
            <Text style={styles.summaryTitle}>Attachments (min 5 photos)</Text>
            <Text style={styles.helperText} testID="attachmentsHelper">
              Photos selected: {(draft.attachments?.length ?? 0)} (min 5 required)
            </Text>
            {(draft.attachments?.length ?? 0) < 5 && (
              <Text style={styles.errorText} testID="attachmentsError">Minimum 5 photos required to post.</Text>
            )}
            <View style={styles.attachActions}>
              <Pressable onPress={pickFromLibrary} style={styles.attachBtn} accessibilityRole="button" testID="attachLibraryBtn">
                <ImagePlus color={theme.colors.white} size={18} />
                <Text style={styles.attachBtnText}>Upload Photos</Text>
              </Pressable>
              <Pressable onPress={takePhoto} style={styles.attachBtnAlt} accessibilityRole="button" testID="attachCameraBtn">
                <Camera color={theme.colors.dark} size={18} />
                <Text style={styles.attachBtnAltText}>Take Photo</Text>
              </Pressable>
            </View>
            {!!(draft.attachments?.length ?? 0) && (
              <View style={styles.grid}>
                {(draft.attachments ?? []).map((att, index) => {
                  // Create a truly unique key using index and uri (or fallback)
                  const uniqueKey = att.uri ? `attachment-${index}-${att.uri.slice(-10)}` : `attachment-${index}-${Math.random()}`;
                  return (
                    <View key={uniqueKey} style={styles.thumbWrap} testID={`thumb-${index}`}>
                      <Image source={{ uri: att.uri }} style={styles.thumb} contentFit="cover" />
                      <Pressable onPress={() => removeAttachment(att.uri)} style={styles.removeBtn} accessibilityRole="button" testID={`remove-${index}`}>
                        <Trash2 color={theme.colors.white} size={14} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
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
            <Pressable onPress={onSubmit} style={[styles.postBtn, (!isReady || draft.isPosting) && styles.postBtnDisabled]} disabled={!isReady || draft.isPosting} accessibilityRole="button" accessibilityState={{ disabled: !isReady || draft.isPosting }} testID="postLoadBtn">
              <Send color={theme.colors.white} size={18} />
              <Text style={styles.postBtnText}>{draft.isPosting ? 'Posting...' : 'Post Load'}</Text>
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
