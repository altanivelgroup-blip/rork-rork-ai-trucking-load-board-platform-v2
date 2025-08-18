import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, Switch, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { Shield, Lock } from 'lucide-react-native';

export default function PrivacySecurityScreen() {
  const [twoFA, setTwoFA] = useState<boolean>(false);
  const [biometrics, setBiometrics] = useState<boolean>(Platform.OS !== 'web');
  const [password, setPassword] = useState<string>('');

  const updatePassword = () => {
    if ((password ?? '').length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    Alert.alert('Password updated', 'Your password was updated.');
    setPassword('');
  };

  return (
    <View style={styles.container} testID="privacy-security-screen">
      <Stack.Screen options={{ title: 'Privacy & Security' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Row icon={<Shield size={18} color={theme.colors.primary} />} title="Two-Factor Authentication" subtitle="Add an extra layer of security" value={twoFA} onChange={setTwoFA} testID="ps-2fa" />
          <Row icon={<Lock size={18} color={theme.colors.primary} />} title="Biometric Unlock" subtitle="Use Face/Touch ID or fingerprint" value={biometrics} onChange={setBiometrics} testID="ps-bio" />
        </View>

        <Text style={styles.sectionTitle}>Password</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="New password"
              placeholderTextColor={theme.colors.gray}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              testID="ps-password-input"
            />
            <Text onPress={updatePassword} style={styles.primaryLink} testID="ps-update-password">Update</Text>
          </View>
          <Text style={styles.helpText}>Use 8+ characters with a mix of letters and numbers.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, title, subtitle, value, onChange, testID }: { icon?: React.ReactNode; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; testID?: string; }) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowLeft}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  row: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  rowText: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  rowSubtitle: { marginTop: 2, color: theme.colors.gray, fontSize: theme.fontSize.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
  input: { flex: 1, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 10, color: theme.colors.dark },
  primaryLink: { color: theme.colors.secondary, fontWeight: '700', marginLeft: theme.spacing.md },
  helpText: { color: theme.colors.gray, fontSize: theme.fontSize.sm, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
});
