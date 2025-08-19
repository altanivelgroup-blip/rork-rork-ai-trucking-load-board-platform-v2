import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Phone, User as UserIcon, Building, Shield, Lock } from 'lucide-react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState<string>(user?.name ?? '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [phone, setPhone] = useState<string>(user?.phone ?? '');
  const [company, setCompany] = useState<string>(user?.company ?? '');
  const [password, setPassword] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const canSave = useMemo(() => {
    return (name !== (user?.name ?? '')) || (email !== (user?.email ?? '')) || (phone !== (user?.phone ?? '')) || (company !== (user?.company ?? '')) || password.length > 0;
  }, [name, email, phone, company, password, user]);

  const onSave = useCallback(async () => {
    try {
      if (!user) return;
      setIsSaving(true);
      const updates: Record<string, unknown> = { name, email, phone, company };
      if (password) {
        (updates as { password: string }).password = password;
      }
      await updateProfile(updates);
      Alert.alert('Saved', 'Your profile was updated.');
      router.back();
    } catch (e) {
      console.error('[profile] save error', e);
      Alert.alert('Update failed', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user, name, email, phone, company, password, updateProfile, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Field icon={<UserIcon size={18} color={theme.colors.gray} />} placeholder="Full Name" value={name} onChangeText={setName} />
          <Field icon={<Mail size={18} color={theme.colors.gray} />} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field icon={<Phone size={18} color={theme.colors.gray} />} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field icon={<Building size={18} color={theme.colors.gray} />} placeholder="Company" value={company} onChangeText={setCompany} />
        </View>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Field icon={<Lock size={18} color={theme.colors.gray} />} placeholder="New Password (optional)" value={password} onChangeText={setPassword} secureTextEntry />
          <View style={styles.noteRow}>
            <Shield size={16} color={theme.colors.gray} />
            <Text style={styles.noteText}>Changing email may require recent login.</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.save, !canSave && styles.saveDisabled]} onPress={onSave} disabled={!canSave || isSaving} testID="save-profile">
          {isSaving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ icon, ...props }: { icon: React.ReactNode } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <View style={styles.icon}>{icon}</View>
      <TextInput style={styles.input} placeholderTextColor={theme.colors.gray} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.sm },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md },
  icon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.dark },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: theme.spacing.sm },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  noteText: { color: theme.colors.gray, fontSize: theme.fontSize.xs },
  save: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: theme.spacing.md, alignItems: 'center' },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: theme.colors.white, fontWeight: '700', fontSize: theme.fontSize.md },
});
