import { Stack } from 'expo-router';
import React, { useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const fontWeightBold = '700' as const;
const fontWeightSemi = '600' as const;

export default function TestingGuide() {
  const onPrint = useCallback(() => {
    console.log('[TestingGuide] Print requested');
    if (Platform.OS === 'web') {
      try {
        // @ts-expect-error window is only on web
        window.print();
      } catch (err) {
        console.error('[TestingGuide] Print error', err);
      }
    }
  }, []);

  return (
    <View style={styles.container} testID="testing-guide-screen">
      <Stack.Screen options={{ title: 'Cross-Platform Test Checklist' }} />
      <View style={styles.header}>
        <Text style={styles.title} testID="testing-guide-title">Driver Profile & Load Flow – Sanity Checklist</Text>
        {Platform.OS === 'web' ? (
          <TouchableOpacity accessibilityRole="button" onPress={onPrint} style={styles.printBtn} testID="print-btn">
            <Text style={styles.printBtnText}>Print / Save as PDF</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Section title="Preparation">
          <Item>Ensure you can sign in with a test account.</Item>
          <Item>Have at least one mock load available.</Item>
          <Item>Note your device’s local timezone.</Item>
        </Section>

        <Section title="iOS">
          <Item>Install Expo Go and open the project via QR.</Item>
          <Item>Go to Driver Vehicle Setup at first run or Profile → Driver Profile.</Item>
          <Item>Enter: vehicleMake, vehicleModel, vehicleYear [1990..next year], fuelType [diesel|gas], mpgRated [4..30]. Optional: vin, plate, tankGallons, gvwrLbs. Leave blanks to store null.</Item>
          <Item>Save; expect toast and persistence to drivers/{`{uid}`}. Re-open screen and verify values.</Item>
          <Item>Open Loads → Load Details. Verify chips show RPM, MPG, Fuel est based on mpgRated and default fuel pricing.</Item>
          <Item>Create/Post a load. Set delivery date/time and timezone. If date-only, confirm server treats as 17:00 local. Verify expiresAtMs = deliveryLocal → UTC + 36h.</Item>
          <Item>Confirm you cannot archive from client; updates leaving isArchived/archivedAt unchanged succeed.</Item>
        </Section>

        <Section title="Android">
          <Item>Open in Expo Go.</Item>
          <Item>Repeat Driver Profile entry and save; verify persistence.</Item>
          <Item>Verify load chips and fuel math. Change fuelType to switch default price source and re-check.</Item>
          <Item>Post a load with a known timezone; verify expiresAtMs logic matches iOS.</Item>
          <Item>Attempt client update of a load without touching archive fields; succeeds. Any attempt to change isArchived/archivedAt should be rejected by rules.</Item>
        </Section>

        <Section title="Web">
          <Item>Open the app in browser. If FORCE_DELIVERY_TZ is set, confirm TZ selector is hidden and forced value is stored.</Item>
          <Item>Complete Driver Profile and refresh; values persist.</Item>
          <Item>Open a load and confirm RPM/MPG/Fuel chips render correctly. Web layout should not overflow.</Item>
          <Item>Create a load with date-only delivery; confirm server applies 17:00 local and +36h window in UTC.</Item>
          <Item>Verify rules guard: archiving from client is not permitted.</Item>
        </Section>

        <Section title="Pass/Fail Notes">
          <Item>Record any timezone mismatches between displayed local time and server UTC conversions.</Item>
          <Item>Record any validation gaps outside specified ranges.</Item>
          <Item>Record UI issues unique to a platform.</Item>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tip: On web, use the button above to print or save as PDF. On mobile, open this route on desktop to print.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} testID={`section-${title}`}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <View style={styles.bullet} />
      <Text style={styles.itemText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B10' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: '#0B0B10' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: fontWeightBold },
  printBtn: { alignSelf: 'flex-start', backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 12 },
  printBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: fontWeightSemi },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { backgroundColor: '#12131A', borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#1F2330' },
  sectionTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: fontWeightBold, marginBottom: 10 },
  list: { gap: 10 } as unknown as any,
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7', marginTop: 8 },
  itemText: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, flex: 1 },
  footer: { marginTop: 20 },
  footerText: { color: '#94A3B8', fontSize: 12 },
});
