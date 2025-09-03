import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { usePostLoad } from '@/hooks/usePostLoad';

type RateKind = 'flat' | 'per_mile';

 function Stepper({ current, total }: { current: number; total: number }) {
  const items = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  return (
    <View style={styles.stepper}>
      {items.map((n, idx) => {
        const active = n === current;
        return (
          <View key={n} style={styles.stepItem}>
            <View style={[styles.stepDot, active ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepNumber, active ? styles.stepNumberActive : styles.stepNumberInactive]}>{n}</Text>
            </View>
            {idx < items.length - 1 && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );
}

function SegButton({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, selected ? styles.segBtnActive : styles.segBtnInactive]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Text style={[styles.segBtnText, selected ? styles.segBtnTextActive : styles.segBtnTextInactive]}>{label}</Text>
    </Pressable>
  );
}

export default function PostLoadStep4() {
  const router = useRouter();
  const { draft, setField } = usePostLoad();
  const [amount, setAmount] = useState<string>(draft.rateAmount || '1350');
  const [rateKind, setRateKind] = useState<RateKind>(draft.rateKind || 'flat');
  const [miles, setMiles] = useState<string>(draft.miles || '');
  const [requirements, setRequirements] = useState<string>(draft.requirements || 'Car hauler');

  const canProceed = useMemo(() => {
    const hasAmount = amount.trim().length > 0;
    const hasMiles = rateKind === 'flat' || miles.trim().length > 0;
    return hasAmount && hasMiles;
  }, [amount, rateKind, miles]);

  const onPrevious = useCallback(() => {
    try { router.back(); } catch (e) { console.log('[PostLoadStep4] previous error', e); }
  }, [router]);

  const onNext = useCallback(() => {
    try {
      console.log('[PostLoadStep4] next', { amount, rateKind, miles, requirements });
      if (!canProceed) return;
      
      // Save to draft
      setField('rateAmount', amount);
      setField('rateKind', rateKind);
      setField('miles', miles);
      setField('requirements', requirements);
      
      // Navigate to final review step
      router.push('/post-load-step5');
    } catch (e) {
      console.log('[PostLoadStep4] next error', e);
    }
  }, [amount, rateKind, miles, requirements, canProceed, router, setField]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="postLoadHeaderTitle">Post Load</Text>
            <Stepper current={4} total={5} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rate & Payment</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Rate Amount *</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.prefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.inputWithPrefix]}
                  keyboardType={Platform.select({ ios: 'decimal-pad', android: 'number-pad', default: 'decimal-pad' }) as 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad' | undefined}
                  placeholder="1350"
                  placeholderTextColor={theme.colors.gray}
                  value={amount}
                  onChangeText={setAmount}
                  testID="rateAmount"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Rate Type</Text>
              <View style={styles.segRow}>
                <SegButton label="Flat Rate" selected={rateKind==='flat'} onPress={() => setRateKind('flat')} testID="rate-flat" />
                <SegButton label="Per Mile" selected={rateKind==='per_mile'} onPress={() => setRateKind('per_mile')} testID="rate-per-mile" />
              </View>
            </View>

            {rateKind === 'per_mile' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Miles *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType={Platform.select({ ios: 'decimal-pad', android: 'number-pad', default: 'decimal-pad' }) as 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad' | undefined}
                  placeholder="250"
                  placeholderTextColor={theme.colors.gray}
                  value={miles}
                  onChangeText={setMiles}
                  testID="miles"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Special Requirements</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Add any notes (e.g., Car hauler)"
                placeholderTextColor={theme.colors.gray}
                value={requirements}
                onChangeText={setRequirements}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="specialRequirements"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footerRow}>
          <Pressable onPress={onPrevious} style={styles.secondaryBtn} accessibilityRole="button" testID="prevButton">
            <Text style={styles.secondaryBtnText}>Previous</Text>
          </Pressable>
          <Pressable onPress={onNext} style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]} disabled={!canProceed} accessibilityRole="button" accessibilityState={{ disabled: !canProceed }} testID="nextButton">
            <Text style={styles.primaryBtnText}>Next</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scrollContent: { padding: 16, paddingBottom: 24 },
  header: { alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark, marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepDotInactive: { backgroundColor: '#cbd5e1' },
  stepNumber: { fontSize: theme.fontSize.md, fontWeight: '700' },
  stepNumberActive: { color: theme.colors.white },
  stepNumberInactive: { color: theme.colors.dark, opacity: 0.7 },
  stepConnector: { width: 24, height: 4, backgroundColor: '#cbd5e1', marginHorizontal: 8, borderRadius: 2 },
  card: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  sectionTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.dark, textAlign: 'center', marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark, marginBottom: 8 },
  input: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }) as number, fontSize: theme.fontSize.md, color: theme.colors.dark },
  textarea: { minHeight: 100 },
  inputWrap: { position: 'relative' },
  prefix: { position: 'absolute', left: 12, top: 0, bottom: 0, textAlignVertical: 'center', textAlign: 'center', color: theme.colors.dark, fontWeight: '700' },
  inputWithPrefix: { paddingLeft: 30 },
  segRow: { flexDirection: 'row', gap: 12 },
  segBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  segBtnInactive: { backgroundColor: theme.colors.white, borderColor: theme.colors.border },
  segBtnText: { fontSize: theme.fontSize.md, fontWeight: '800' },
  segBtnTextActive: { color: theme.colors.white },
  segBtnTextInactive: { color: theme.colors.dark },
  footerRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: Platform.select({ ios: 20, android: 16, default: 16 }) as number, paddingTop: 8, backgroundColor: theme.colors.lightGray },
  primaryBtn: { flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { backgroundColor: '#94a3b8' },
  primaryBtnText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: '800' },
  secondaryBtn: { flex: 1, backgroundColor: '#cbd5e1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: theme.colors.dark, fontSize: theme.fontSize.lg, fontWeight: '800' },
});