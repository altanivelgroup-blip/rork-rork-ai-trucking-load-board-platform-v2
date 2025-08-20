import React from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { lightTheme as theme } from '@/constants/theme';
import { MapPin, Mic, Camera, FileText } from 'lucide-react-native';

export default function DataUsageScreen() {
  return (
    <View style={styles.container} testID="data-usage-screen">
      <Stack.Screen options={{ title: 'How We Use Your Data' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header />
        <Section icon={<MapPin size={18} color={theme.colors.primary} />} title="Location">
          <Bullet title="When we access it" description="Only if you enable Location Services in Settings or while using features that need your position (e.g., nearby services, pickup/delivery verification). We do not track in the background." />
          <Bullet title="Why we use it" description="To show relevant loads, verify pickup/drop-off, and improve route suggestions." />
          <Bullet title="Your control" description="You can disable Location Services anytime in Settings or your device settings. Some features may be limited." />
        </Section>

        <Section icon={<Mic size={18} color={theme.colors.primary} />} title="Microphone">
          <Bullet title="When we access it" description="Only when you start voice capture features (e.g., voice notes or dictation). No recording occurs without your action." />
          <Bullet title="Why we use it" description="To let you add notes or fill forms hands‑free." />
          <Bullet title="Your control" description="You can deny microphone permission. Voice features will be disabled." />
        </Section>

        <Section icon={<Camera size={18} color={theme.colors.primary} />} title="Camera">
          <Bullet title="When we access it" description="Only when you take photos of documents or equipment within the app." />
          <Bullet title="Why we use it" description="To attach proof of delivery, bills of lading, or damage photos to loads." />
          <Bullet title="Your control" description="You can deny camera permission and upload files from your library instead." />
        </Section>

        <Section icon={<FileText size={18} color={theme.colors.primary} />} title="Files & Photos">
          <Bullet title="When we access it" description="When you select documents or images to upload." />
          <Bullet title="Why we use it" description="To store shipment docs and receipts with your loads." />
          <Bullet title="Your control" description="You can choose specific files to share. You can delete uploaded files from the Documents screen." />
        </Section>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Retention & Sharing</Text>
          <Text style={styles.paragraph}>We keep data only as long as needed to provide the service or as required by law. We do not sell your data. Limited sharing with service providers is covered in the Privacy Policy.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Questions</Text>
          <Text style={styles.paragraph}>Contact privacy@rork.com for data requests (access, export, deletion) or any privacy questions.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Header() {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.title}>Clear, Plain‑Language Data Use</Text>
      <Text style={styles.subtitle}>This page explains when and why the app may request sensitive permissions and how you remain in control.</Text>
    </View>
  );
}

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowHeader}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Bullet({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.bulletWrap}>
      <View style={styles.bulletDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bulletTitle}>{title}</Text>
        <Text style={styles.paragraph}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  headerCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },
  subtitle: { marginTop: 6, color: theme.colors.gray, fontSize: theme.fontSize.sm },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  bulletWrap: { flexDirection: 'row', gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary, marginTop: 8 },
  bulletTitle: { fontWeight: '700', color: theme.colors.dark },
  paragraph: { color: theme.colors.dark, fontSize: theme.fontSize.sm, marginTop: 2 },
});
