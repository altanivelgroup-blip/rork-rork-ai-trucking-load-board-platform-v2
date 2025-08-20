import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { BadgeCheck, FileText, Image as ImageIcon, ShieldCheck, Upload, VenetianMask } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/components/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useOnlineStatus from '@/hooks/useOnlineStatus';

interface DocField {
  key: keyof FormState;
  label: string;
  placeholder: string;
  required: boolean;
}

interface FormState {
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  insuranceCarrier: string;
  insurancePolicy: string;
  vehicleInfo: string;
  trailerInfo: string;
  attachments: Attachment[];
  agreed: boolean;
}

interface Attachment {
  id: string;
  name: string;
  uri: string;
  type: string;
}

interface StoredAttachmentMeta {
  id: string;
  name: string;
  uri: string;
  type: string;
  sizeBytes?: number;
  createdAt: string;
  source: 'document' | 'image';
}

const ATTACHMENTS_KEY = 'doc_attachments_v1';
const ATTACHMENTS_META_KEY = 'doc_attachments_meta_v1';

interface AttachmentItemProps {
  attachment: Attachment;
  disabled: boolean;
  onRemove: (id: string) => void;
}

const AttachmentItem = memo<AttachmentItemProps>(({ attachment, disabled, onRemove }) => {
  const onPressRemove = useCallback(() => onRemove(attachment.id), [onRemove, attachment.id]);
  return (
    <View style={styles.fileItem}>
      <FileText size={18} color={theme.colors.primary} />
      <Text style={styles.fileName} numberOfLines={1}>{attachment.name}</Text>
      <TouchableOpacity onPress={onPressRemove} style={styles.removeBtn} disabled={disabled} testID={`remove-${attachment.id}`}>
        <VenetianMask size={16} color={theme.colors.danger} />
      </TouchableOpacity>
    </View>
  );
});

export default function DocumentsScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { online } = useOnlineStatus();
  const { show } = useToast();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<FormState>({
    companyName: user?.company ?? '',
    mcNumber: user?.mcNumber ?? '',
    dotNumber: user?.dotNumber ?? '',
    insuranceCarrier: user?.insuranceCarrier ?? '',
    insurancePolicy: user?.insurancePolicy ?? '',
    vehicleInfo: user?.vehicleInfo ?? '',
    trailerInfo: user?.trailerInfo ?? '',
    attachments: [],
    agreed: false,
  });

  const fields = useMemo<DocField[]>(() => [
    { key: 'companyName', label: 'Company Name', placeholder: 'ACME Logistics LLC', required: true },
    { key: 'mcNumber', label: 'MC #', placeholder: 'MC012345', required: true },
    { key: 'dotNumber', label: 'DOT #', placeholder: 'DOT0123456', required: true },
    { key: 'insuranceCarrier', label: 'Insurance Carrier', placeholder: 'Progressive Commercial', required: true },
    { key: 'insurancePolicy', label: 'Policy Number', placeholder: 'POL-123456789', required: true },
    { key: 'vehicleInfo', label: 'Vehicle Information', placeholder: 'Year Make Model VIN', required: true },
    { key: 'trailerInfo', label: 'Trailer Information', placeholder: 'Year Make Model VIN', required: false },
  ], []);

  const persistAttachments = useCallback(async (attachments: Attachment[], metas: StoredAttachmentMeta[]) => {
    try {
      await AsyncStorage.multiSet([
        [ATTACHMENTS_KEY, JSON.stringify(attachments)],
        [ATTACHMENTS_META_KEY, JSON.stringify(metas)],
      ]);
    } catch (e) {
      console.log('[Documents] persistAttachments error', e);
    }
  }, []);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (result.canceled) return;
      const now = new Date().toISOString();
      const files = result.assets?.map((a) => ({ id: `${Date.now()}-${a.name}` , name: a.name ?? 'file', uri: a.uri, type: a.mimeType ?? 'application/octet-stream' })) ?? [];
      const metas: StoredAttachmentMeta[] = result.assets?.map((a) => ({
        id: `${Date.now()}-${a.name}`,
        name: a.name ?? 'file',
        uri: a.uri,
        type: a.mimeType ?? 'application/octet-stream',
        sizeBytes: typeof (a as any)?.size === 'number' ? (a as any).size as number : undefined,
        createdAt: now,
        source: 'document',
      })) ?? [];
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
      try {
        const existingMetaRaw = await AsyncStorage.getItem(ATTACHMENTS_META_KEY);
        const existingMeta: StoredAttachmentMeta[] = existingMetaRaw ? JSON.parse(existingMetaRaw) as StoredAttachmentMeta[] : [];
        await persistAttachments([...files], [...existingMeta, ...metas]);
      } catch (e) {
        console.log('[Documents] persist after pickDocument error', e);
      }
    } catch (e) {
      console.error('Document pick error', e);
      show('Unable to pick documents. Try again.', 'error', 2600);
      Alert.alert('Error', 'Unable to pick documents.');
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please allow photo library access.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (asset) {
        const id = `${Date.now()}-${asset.fileName ?? 'image'}`;
        const file: Attachment = { id, name: asset.fileName ?? 'image.jpg', uri: asset.uri, type: asset.mimeType ?? 'image/jpeg' };
        setForm((p) => ({ ...p, attachments: [...p.attachments, file] }));
        const meta: StoredAttachmentMeta = {
          id,
          name: file.name,
          uri: file.uri,
          type: file.type,
          sizeBytes: typeof (asset as any)?.fileSize === 'number' ? (asset as any).fileSize as number : undefined,
          createdAt: new Date().toISOString(),
          source: 'image',
        };
        try {
          const existingMetaRaw = await AsyncStorage.getItem(ATTACHMENTS_META_KEY);
          const existingMeta: StoredAttachmentMeta[] = existingMetaRaw ? JSON.parse(existingMetaRaw) as StoredAttachmentMeta[] : [];
          await persistAttachments([file], [...existingMeta, meta]);
        } catch (e) {
          console.log('[Documents] persist after pickImage error', e);
        }
      }
    } catch (e) {
      console.error('Image pick error', e);
      show('Unable to pick image. Try again.', 'error', 2600);
      Alert.alert('Error', 'Unable to pick image.');
    }
  }, []);

  const isComplete = useMemo(() => {
    const requiredFilled = fields.every((f) => !f.required || String(form[f.key] ?? '').trim().length > 1);
    const hasDocs = form.attachments.length > 0;
    return requiredFilled && hasDocs && form.agreed;
  }, [fields, form]);

  const save = useCallback(async () => {
    try {
      if (!online) {
        show('Offline: will submit when online', 'warning', 2600);
      }
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      updateProfile({
        company: form.companyName,
        mcNumber: form.mcNumber,
        dotNumber: form.dotNumber,
        insuranceCarrier: form.insuranceCarrier,
        insurancePolicy: form.insurancePolicy,
        vehicleInfo: form.vehicleInfo,
        trailerInfo: form.trailerInfo,
        verificationStatus: 'pending',
      });
      show('Documents submitted', 'success', 1800);
      Alert.alert('Submitted', 'Your documents were submitted for verification.');
      router.back();
    } catch (e) {
      console.error('Save error', e);
      show('Submit failed. Tap to retry.', 'error', 2800);
      Alert.alert('Error', 'Could not save documents.');
    } finally {
      setIsSaving(false);
    }
  }, [form, updateProfile, router, online, show]);

  const removeAttachment = useCallback(async (id: string) => {
    setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }));
    try {
      const [attRaw, metaRaw] = await AsyncStorage.multiGet([ATTACHMENTS_KEY, ATTACHMENTS_META_KEY]);
      const atts: Attachment[] = attRaw[1] ? JSON.parse(attRaw[1] as string) as Attachment[] : [];
      const metas: StoredAttachmentMeta[] = metaRaw[1] ? JSON.parse(metaRaw[1] as string) as StoredAttachmentMeta[] : [];
      const nextAtts = atts.filter((a) => a.id !== id);
      const nextMetas = metas.filter((m) => m.id !== id);
      await AsyncStorage.multiSet([[ATTACHMENTS_KEY, JSON.stringify(nextAtts)], [ATTACHMENTS_META_KEY, JSON.stringify(nextMetas)]]);
    } catch (e) {
      console.log('[Documents] removeAttachment persist error', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [attRaw, metaRaw] = await AsyncStorage.multiGet([ATTACHMENTS_KEY, ATTACHMENTS_META_KEY]);
        const savedAtts: Attachment[] = attRaw[1] ? JSON.parse(attRaw[1] as string) as Attachment[] : [];
        if (mounted && savedAtts.length > 0) {
          setForm((p) => ({ ...p, attachments: savedAtts }));
        }
      } catch (e) {
        console.log('[Documents] load persisted attachments error', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.safe} testID="documents-safe">
      <Stack.Screen options={{ title: 'Documents & Verification' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isSaving ? (
          <View style={styles.skeleton} testID="doc-skeleton">
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.skeletonText}>Submitting…</Text>
          </View>
        ) : null}
        <View style={styles.headerCard} testID="doc-header">
          <ShieldCheck color={theme.colors.primary} size={24} />
          <Text style={styles.headerTitle}>Provide your company and insurance details</Text>
          <Text style={styles.headerSub}>Upload proof (CDL, insurance COI, registration). We’ll verify so you can register and accept loads.</Text>
        </View>

        {fields.map((f) => (
          <View key={f.key} style={styles.inputWrap}>
            <Text style={styles.label}>{f.label}{f.required ? ' *' : ''}</Text>
            <TextInput
              testID={`input-${String(f.key)}`}
              value={String(form[f.key] ?? '')}
              onChangeText={(t) => setForm((p) => ({ ...p, [f.key]: t }))}
              placeholder={f.placeholder}
              placeholderTextColor={theme.colors.gray}
              style={styles.input}
              autoCapitalize={f.key === 'companyName' ? 'words' : 'characters'}
            editable={!isSaving}
            />
          </View>
        ))}

        <View style={styles.attachRow}>
          <TouchableOpacity onPress={pickDocument} style={[styles.attachBtn, isSaving && styles.disabled]} activeOpacity={0.8} disabled={isSaving} testID="btn-pick-doc">
            <Upload color={theme.colors.white} size={18} />
            <Text style={styles.attachText}>Add Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={[styles.attachBtn, styles.attachOutline, isSaving && styles.disabled]} activeOpacity={0.8} disabled={isSaving} testID="btn-pick-img">
            <ImageIcon color={theme.colors.primary} size={18} />
            <Text style={styles.attachTextAlt}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {form.attachments.length > 0 && (
          <View style={styles.attachList}>
            {form.attachments.map((a) => (
              <AttachmentItem key={a.id} attachment={a} disabled={isSaving} onRemove={removeAttachment} />
            ))}
          </View>
        )}

        <View style={styles.agreeRow}>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.agreed }}
            onPress={() => setForm((p) => ({ ...p, agreed: !p.agreed }))}
            style={[styles.checkbox, form.agreed && styles.checkboxOn]}
            testID="agree-checkbox"
          />
          <Text style={styles.agreeText}>I certify documents are accurate and authorize verification.</Text>
        </View>

        <TouchableOpacity
          style={[styles.submit, { opacity: isComplete && !isSaving ? 1 : 0.6 }]}
          disabled={!isComplete || isSaving}
          onPress={save}
          testID="submit-docs"
        >
          <BadgeCheck color={theme.colors.white} size={18} />
          <Text style={styles.submitText}>{isSaving ? 'Submitting…' : 'Submit for Verification'}</Text>
        </TouchableOpacity>

        <Text style={styles.helper}>
          Tip: Clear photos of COI front page, CDL front/back, and current registration help speed verification.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  skeleton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  skeletonText: {
    color: theme.colors.dark,
    fontWeight: '700',
  },
  headerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: 6,
  },
  headerSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 6,
  },
  inputWrap: {
    marginTop: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: 6,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  attachRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  attachText: {
    color: theme.colors.white,
    marginLeft: 8,
    fontWeight: '700',
  },
  attachOutline: {
    marginLeft: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  attachTextAlt: {
    color: theme.colors.primary,
    marginLeft: 8,
    fontWeight: '700',
  },
  attachList: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  removeBtn: {
    padding: 6,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  checkboxOn: {
    backgroundColor: theme.colors.primary,
  },
  agreeText: {
    marginLeft: 10,
    color: theme.colors.dark,
    flex: 1,
  },
  submit: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  submitText: {
    color: theme.colors.white,
    fontWeight: '700',
    marginLeft: 8,
  },
  helper: {
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
  },
});
