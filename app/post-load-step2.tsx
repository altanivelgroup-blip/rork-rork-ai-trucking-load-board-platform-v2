import React, { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Box } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { usePostLoad } from '@/hooks/usePostLoad';

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

function InputWithIcon({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  required,
  keyboardType,
  testID,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: React.ReactNode;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad' | undefined;
  testID?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label} testID={`${testID}-label`}>
        {label} {required ? '*' : ''}
      </Text>
      <View style={styles.inputWrap}>
        <Text style={styles.inputIconText}>{icon}</Text>
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          testID={testID}
        />
      </View>
    </View>
  );
}

export default function PostLoadStep2() {
  const router = useRouter();
  const { draft, setField } = usePostLoad();

  const canProceed = useMemo(() => draft.pickup.trim().length > 0 && draft.delivery.trim().length > 0, [draft.pickup, draft.delivery]);

  const onPrevious = useCallback(() => { router.back(); }, [router]);

  const onNext = useCallback(() => {
    try {
      console.log('[PostLoadStep2] next', { draft });
      router.push('/post-load-step3');
    } catch (e) {
      console.log('[PostLoadStep2] next error', e);
    }
  }, [draft]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="postLoadHeaderTitle">Post Load</Text>
            <Stepper current={2} total={5} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup & Delivery</Text>

            <InputWithIcon
              label="Pickup Location"
              placeholder="Las Vegas 89014"
              value={draft.pickup}
              onChangeText={(t) => setField('pickup', t)}
              icon={<MapPin color={theme.colors.gray} size={18} />}
              required
              testID="pickupLocation"
            />

            <InputWithIcon
              label="Delivery Location"
              placeholder="San Antonio 85001"
              value={draft.delivery}
              onChangeText={(t) => setField('delivery', t)}
              icon={<MapPin color={theme.colors.gray} size={18} />}
              required
              testID="deliveryLocation"
            />

            <InputWithIcon
              label="Weight"
              placeholder="7000"
              value={draft.weight}
              onChangeText={(t) => setField('weight', t)}
              icon={<Box color={theme.colors.gray} size={18} />}
              keyboardType="number-pad"
              testID="weight"
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label} testID={'dimensions-label'}>Dimensions (L x W x H)</Text>
              <TextInput
                style={styles.input}
                placeholder="6 x 36ft"
                placeholderTextColor={theme.colors.gray}
                value={draft.dimensions}
                onChangeText={(t) => setField('dimensions', t)}
                testID={'dimensions'}
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
  inputWrap: { position: 'relative' },
  inputIconText: { position: 'absolute', left: 12, top: 0, bottom: 0, textAlignVertical: 'center', textAlign: 'center', includeFontPadding: false },
  inputWithIcon: { paddingLeft: 40 },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 14, android: 10, default: 12 }) as number,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.select({ ios: 20, android: 16, default: 16 }) as number,
    paddingTop: 8,
    backgroundColor: theme.colors.lightGray,
  },
  primaryBtn: { flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { backgroundColor: '#94a3b8' },
  primaryBtnText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: '800' },
  secondaryBtn: { flex: 1, backgroundColor: '#cbd5e1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: theme.colors.dark, fontSize: theme.fontSize.lg, fontWeight: '800' },
});
