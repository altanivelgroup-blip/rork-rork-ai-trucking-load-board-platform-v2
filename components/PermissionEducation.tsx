import React, { memo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { Mic, MapPin, Camera } from 'lucide-react-native';
import { moderateScale } from '@/src/ui/scale';

export type PermissionType = 'microphone' | 'location' | 'camera';

interface PermissionEducationProps {
  type: PermissionType;
  visible: boolean;
  onContinue: () => void;
  onCancel: () => void;
  testID?: string;
}

export const PermissionEducation: React.FC<PermissionEducationProps> = memo(({ type, visible, onContinue, onCancel, testID }) => {
  const Icon = type === 'microphone' ? Mic : type === 'location' ? MapPin : Camera;
  const title =
    type === 'microphone'
      ? 'Microphone access'
      : type === 'location'
      ? 'Location access'
      : 'Camera access';
  const desc =
    type === 'microphone'
      ? 'We use the mic to transcribe your voice into text. Audio is sent securely to our speech service only for transcription.'
      : type === 'location'
      ? 'We use your location to show nearby services and calculate route details. Location is only used while you use the app.'
      : 'We use the camera to scan documents or capture photos you choose to upload.';

  if (Platform.OS === 'web') {
    return visible ? (
      <View style={styles.webBackdrop} testID={testID ?? 'permission-edu-backdrop'}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{desc}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.btnGhost]} testID="permission-edu-cancel">
              <Text style={[styles.btnText, styles.btnTextGhost]}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onContinue} style={[styles.btn, styles.btnPrimary]} testID="permission-edu-continue">
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ) : null;
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop} testID={testID ?? 'permission-edu-backdrop'}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{desc}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.btnGhost]} testID="permission-edu-cancel">
              <Text style={[styles.btnText, styles.btnTextGhost]}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onContinue} style={[styles.btn, styles.btnPrimary]} testID="permission-edu-continue">
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

PermissionEducation.displayName = 'PermissionEducation';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  webBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 999999, elevation: 999 },
  card: { width: '100%', maxWidth: '90%', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  iconWrap: { width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: theme.spacing.md, fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  subtitle: { marginTop: 6, fontSize: theme.fontSize.sm, color: theme.colors.gray },
  actions: { marginTop: theme.spacing.lg, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  btnGhost: { backgroundColor: '#F1F5F9' },
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnText: { fontWeight: '700' },
  btnTextGhost: { color: theme.colors.dark },
  btnTextPrimary: { color: theme.colors.white },
});
