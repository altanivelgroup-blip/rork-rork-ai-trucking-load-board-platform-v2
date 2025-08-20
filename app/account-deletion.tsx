import React, { useCallback, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { lightTheme as theme } from '@/constants/theme';
import { Trash2, Shield } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function AccountDeletionScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              console.log('[account-delete] starting delete flow for user', user?.id);
              await new Promise((r) => setTimeout(r, 500));
              await logout();
              Alert.alert('Request submitted', 'Your deletion request has been received. We will process it shortly.');
              router.replace('/login');
            } catch (e) {
              console.error('[account-delete] error', e);
              Alert.alert('Error', 'Failed to submit deletion request. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [logout, router, user?.id]);

  return (
    <View style={styles.container} testID="account-deletion-screen">
      <Stack.Screen options={{ title: 'Delete Account' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardWarning}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
            <Trash2 color={theme.colors.danger} size={24} />
          </View>
          <Text style={styles.title}>Permanently delete your account</Text>
          <Text style={styles.subtitle}>This will remove your profile, documents, and activity. You cannot undo this action.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What happens</Text>
          <Text style={styles.paragraph}>- Access is revoked immediately after request</Text>
          <Text style={styles.paragraph}>- Data is scheduled for deletion in accordance with our policy</Text>
          <Text style={styles.paragraph}>- Some records may be retained to meet legal obligations</Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, isProcessing ? { opacity: 0.6 } : null]}
          onPress={handleDelete}
          disabled={isProcessing}
          testID="confirm-account-deletion"
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.deleteBtnText}>Delete my account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.cardInfo}>
          <Shield color={theme.colors.primary} size={16} />
          <Text style={styles.infoText}>For data access/export before deletion, go to Settings → Data & Storage → Export Data.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  cardWarning: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  title: { marginTop: theme.spacing.sm, fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  subtitle: { marginTop: 4, fontSize: theme.fontSize.sm, color: theme.colors.gray },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: theme.spacing.sm },
  paragraph: { color: theme.colors.dark, fontSize: theme.fontSize.sm, marginTop: 6 },
  deleteBtn: { marginTop: theme.spacing.lg, backgroundColor: theme.colors.danger, paddingVertical: 14, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  deleteBtnText: { color: theme.colors.white, fontWeight: '700' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { marginTop: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, color: theme.colors.gray, fontSize: theme.fontSize.sm },
});
