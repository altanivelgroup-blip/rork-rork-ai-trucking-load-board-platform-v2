import React from 'react';
import { Stack, Link } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { theme } from '@/constants/theme';
import { Mail, MessageSquare, BookOpen } from 'lucide-react-native';
import MiniFAQ from '@/src/components/MiniFAQ';
import { FAQ_ITEMS } from '@/src/data/faqLoadrush';
import { DOCS_URL } from '@/src/config/links';

export default function HelpSupportScreen() {
  const openUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.log('Cannot open URL:', url);
      }
    } catch (e) {
      console.log('open url error', e);
    }
  };

  const openDocs = async () => {
    try {
      const canOpen = await Linking.canOpenURL(DOCS_URL);
      if (canOpen) {
        await Linking.openURL(DOCS_URL);
      } else {
        console.log('Cannot open docs URL:', DOCS_URL);
      }
    } catch (e) {
      console.log('open docs error', e);
    }
  };

  const shouldShowDocs = DOCS_URL && DOCS_URL.startsWith('http');

  return (
    <View style={styles.container} testID="help-support-screen">
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqWrapper}>
          <MiniFAQ 
            items={FAQ_ITEMS} 
            singleOpen 
            initiallyOpenId="1"
          />
        </View>

        {shouldShowDocs && (
          <View style={styles.docsWrapper}>
            <View style={styles.card}>
              <Item 
                icon={<BookOpen size={18} color={theme.colors.primary} />} 
                title="Documentation" 
                subtitle="Guides and tutorials" 
                onPress={openDocs} 
                testID="help-docs" 
              />
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.card}>
          <Item icon={<Mail size={18} color={theme.colors.primary} />} title="Email Support" subtitle="support@loadrush.com" onPress={() => openUrl('mailto:support@loadrush.com')} testID="help-email" />
          <Link href="/contact" asChild>
            <TouchableOpacity style={styles.row} activeOpacity={0.7} testID="help-contact">
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><MessageSquare size={18} color={theme.colors.primary} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Contact Support</Text>
                  <Text style={styles.rowSubtitle}>Get direct help from our team</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

function Item({ icon, title, subtitle, onPress, testID }: { icon?: React.ReactNode; title: string; subtitle?: string; onPress: () => void; testID?: string; }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} testID={testID}>
      <View style={styles.rowLeft}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  faqWrapper: { paddingHorizontal: 16, marginTop: 12, marginBottom: 24 },
  docsWrapper: { marginTop: 8, marginBottom: 24 },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  row: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  rowText: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  rowSubtitle: { marginTop: 2, color: theme.colors.gray, fontSize: theme.fontSize.sm },
});
