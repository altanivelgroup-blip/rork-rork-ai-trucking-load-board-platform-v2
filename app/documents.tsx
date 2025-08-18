import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { BadgeCheck, FileText, Image as ImageIcon, ShieldCheck, Upload, VenetianMask } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

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

export default function DocumentsScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

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

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (result.canceled) return;
      const files = result.assets?.map((a) => ({ id: `${Date.now()}-${a.name}` , name: a.name ?? 'file', uri: a.uri, type: a.mimeType ?? 'application/octet-stream' })) ?? [];
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
    } catch (e) {
      console.error('Document pick error', e);
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
        const file: Attachment = { id: `${Date.now()}-${asset.fileName ?? 'image'}`, name: asset.fileName ?? 'image.jpg', uri: asset.uri, type: asset.mimeType ?? 'image/jpeg' };
        setForm((p) => ({ ...p, attachments: [...p.attachments, file] }));
      }
    } catch (e) {
      console.error('Image pick error', e);
      Alert.alert('Error', 'Unable to pick image.');
    }
  }, []);

  const isComplete = useMemo(() => {
    const requiredFilled = fields.every((f) => !f.required || String(form[f.key] ?? '').trim().length > 1);
    const hasDocs = form.attachments.length > 0;
    return requiredFilled && hasDocs && form.agreed;
  }, [fields, form]);

  const save = useCallback(() => {
    try {
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
      Alert.alert('Submitted', 'Your documents were submitted for verification.');
      router.back();
    } catch (e) {
      console.error('Save error', e);
      Alert.alert('Error', 'Could not save documents.');
    }
  }, [form, updateProfile, router]);

  const removeAttachment = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }));
  }, []);

  return (
    <View style={styles.safe} testID="documents-safe">
      <Stack.Screen options={{ title: 'Documents & Verification' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            />
          </View>
        ))}

        <View style={styles.attachRow}>
          <TouchableOpacity onPress={pickDocument} style={styles.attachBtn} activeOpacity={0.8} testID="btn-pick-doc">
            <Upload color={theme.colors.white} size={18} />
            <Text style={styles.attachText}>Add Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={[styles.attachBtn, styles.attachOutline]} activeOpacity={0.8} testID="btn-pick-img">
            <ImageIcon color={theme.colors.primary} size={18} />
            <Text style={styles.attachTextAlt}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {form.attachments.length > 0 && (
          <View style={styles.attachList}>
            {form.attachments.map((a) => (
              <View key={a.id} style={styles.fileItem}>
                <FileText size={18} color={theme.colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>{a.name}</Text>
                <TouchableOpacity onPress={() => removeAttachment(a.id)} style={styles.removeBtn} testID={`remove-${a.id}`}>
                  <VenetianMask size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
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
          style={[styles.submit, { opacity: isComplete ? 1 : 0.6 }]}
          disabled={!isComplete}
          onPress={save}
          testID="submit-docs"
        >
          <BadgeCheck color={theme.colors.white} size={18} />
          <Text style={styles.submitText}>Submit for Verification</Text>
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
