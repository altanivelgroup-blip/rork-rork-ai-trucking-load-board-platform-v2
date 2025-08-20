import React from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, Alert } from 'react-native';
import { lightTheme as theme } from '@/constants/theme';
import { FileText, ExternalLink } from 'lucide-react-native';

export default function TermsScreen() {
  const openExternal = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', 'Please try again later.');
      }
    } catch (e) {
      console.error('[terms] openExternal error', e);
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  return (
    <View style={styles.container} testID="terms-screen">
      <Stack.Screen options={{ title: 'Terms of Service' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <View style={styles.iconWrap}>
            <FileText color={theme.colors.primary} size={24} />
          </View>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>By using the app, you agree to these terms. Please read carefully.</Text>
        </View>

        <Section title="Use of the Service">
          <Bullet>Do not misuse the app or attempt to disrupt services</Bullet>
          <Bullet>Provide accurate information when creating an account</Bullet>
        </Section>

        <Section title="Payments and Fees">
          <Bullet>Some features may require paid plans</Bullet>
          <Bullet>All fees are non-refundable unless required by law</Bullet>
        </Section>

        <Section title="Liability">
          <Bullet>The app is provided "as is" without warranties</Bullet>
          <Bullet>We are not liable for indirect or consequential damages</Bullet>
        </Section>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openExternal('https://yourcompany.com/terms')}
          testID="terms-external-link"
        >
          <Text style={styles.linkText}>Read the full Terms on our website</Text>
          <ExternalLink color={theme.colors.secondary} size={18} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  headerCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: theme.spacing.sm, fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  subtitle: { marginTop: 4, fontSize: theme.fontSize.sm, color: theme.colors.gray },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: theme.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary, marginTop: 7 },
  bulletText: { flex: 1, color: theme.colors.dark, fontSize: theme.fontSize.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md },
  linkText: { color: theme.colors.secondary, fontWeight: '700' },
});
