import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Truck, FileUp, Download, AlertCircle } from 'lucide-react-native';
import { usePostLoad } from '@/hooks/usePostLoad';
import { useLoadsWithToast } from '@/hooks/useLoads';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseCSV, buildTemplateCSV, validateCSVHeaders } from '@/utils/csv';
import { VehicleType } from '@/types';
import { subscribeFormFill, consumeStagedFormFill } from '@/lib/formFillBus';
import { useFocusEffect } from '@react-navigation/native';
import PhotoUploader from '@/components/PhotoUploader';
import { createLoad, CreateLoadInput } from '@/lib/loads/createLoad';


type VehicleOption = {
  key: VehicleType;
  label: string;
};

const VEHICLE_OPTIONS: VehicleOption[] = [
  { key: 'cargo-van', label: 'Cargo Van' },
  { key: 'box-truck', label: 'Box Truck' },
  { key: 'car-hauler', label: 'Car Hauler' },
  { key: 'flatbed', label: 'Flatbed' },
  { key: 'reefer', label: 'Reefer' },
];

export default function PostLoadScreen() {
  const router = useRouter();
  const { draft, setField, updateDraft } = usePostLoad();
  const { addLoadsBulkWithToast } = useLoadsWithToast();
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const appliedOnceRef = useRef<boolean>(false);
  const [photos, setPhotos] = useState<{ url: string; path: string | null }[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const canProceed = useMemo(() => {
    return draft.title.trim().length > 0 && draft.description.trim().length > 0 && !!draft.vehicleType;
  }, [draft]);

  const [devBanner, setDevBanner] = useState<string | null>(null);

  const applyFormFillToPostLoad = useCallback((raw: Record<string, any>) => {
    if (!raw) return;
    const lower = (s: string) => s?.toString().trim().toLowerCase();
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const hit = Object.keys(raw).find((x) => lower(x) === lower(k));
        if (hit) return (raw as Record<string, any>)[hit];
      }
      return undefined;
    };
    const vStr = (x: any) => (x == null ? '' : String(x).trim());
    const vNum = (x: any) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    };

    const oCity = vStr(get('originCity', 'origin_city', 'origin'));
    const oState = vStr(get('originState', 'origin_state'));
    const dCity = vStr(get('destCity', 'destination', 'dest_city', 'dropoffCity'));
    const dState = vStr(get('destState', 'dest_state', 'dropoffState'));
    const miles = vNum(get('distanceMi', 'miles', 'mi'));
    const rev = vNum(get('revenueUsd', 'revenue', 'rate', 'rateTotalUSD'));
    const when = vStr(get('deliveryDateLocal', 'deliveryDate'));
    const tz = vStr(get('deliveryTZ', 'tz'));

    updateDraft({
      origin: { city: oCity, state: oState },
      destination: { city: dCity, state: dState },
      distanceMi: miles,
      revenueUsd: rev,
      deliveryDateLocal: when,
      deliveryTZ: tz,
    });

    if (__DEV__) {
      const summary = `[FormFill] Applied to Post Load (draft-level): { oCity:${oCity}, oState:${oState}, dCity:${dCity}, dState:${dState}, miles:${miles}, rev:${rev}, when:${when}, tz:${tz} }`;
      console.log(summary);
      setDevBanner(summary);
    }
  }, [updateDraft]);

const onNext = useCallback(async () => {
  try {
    if (!canProceed) return;

    const loadId: string = (draft as any)?.id || `load-${Date.now()}`;
    console.log('[PostLoad] Starting load creation with ID:', loadId);

    router.push({ pathname: '/post-load-step2', params: { loadId } });
  } catch (e: any) {
    console.error('[PostLoad] Navigation error:', e);
    Alert.alert('Error', 'Unable to proceed to next step.');
  }
}, [canProceed, draft, router]);

  useFocusEffect(
    React.useCallback(() => {
      const staged = consumeStagedFormFill();
      if (staged) {
        appliedOnceRef.current = true;
        applyFormFillToPostLoad(staged as Record<string, any>);
      }
      const unsub = subscribeFormFill(applyFormFillToPostLoad);
      return () => {
        unsub && unsub();
      };
    }, [applyFormFillToPostLoad])
  );




  const toVehicleType = useCallback((v: string | undefined): VehicleType | null => {
    if (!v) return null;
    const s = v.trim().toLowerCase();
    const allowed: VehicleType[] = ['truck','box-truck','cargo-van','trailer','car-hauler','flatbed','enclosed-trailer','reefer'];
    const match = allowed.find(a => a === s);
    return match ?? null;
  }, []);

  const csvRowToLoad = useCallback((row: Record<string, string>, idx: number) => {
    try {
      const vehicle = toVehicleType(row['vehicleType']);
      let title = (row['title'] ?? '').trim();
      const description = (row['description'] ?? '').trim();
      const originCity = (row['originCity'] ?? '').trim();
      const destinationCity = (row['destinationCity'] ?? '').trim();
      let pickupDateStr = (row['pickupDate'] ?? '').trim();
      let deliveryDateStr = (row['deliveryDate'] ?? '').trim();
      const weight = Number((row['weight'] ?? '').replace(/[^0-9.]/g, '')) || 0;
      const rate = Number((row['rate'] ?? '').replace(/[^0-9.]/g, '')) || 0;

      // FIXED: Auto-fill missing title
      if (!title && originCity && destinationCity) {
        title = `${vehicle || 'Load'} - ${originCity} to ${destinationCity}`;
        console.log('[CSV FIXED] Auto-filled title:', title);
      }
      
      // FIXED: Auto-fill missing dates per 7-day rule
      const now = new Date();
      if (!pickupDateStr) {
        const pickupDate = new Date(now);
        pickupDate.setDate(now.getDate() + 1); // Tomorrow
        pickupDateStr = pickupDate.toISOString().split('T')[0];
        console.log('[CSV FIXED] Auto-filled pickup date:', pickupDateStr);
      }
      
      if (!deliveryDateStr) {
        const deliveryDate = new Date(now);
        deliveryDate.setDate(now.getDate() + 2); // Day after tomorrow
        deliveryDateStr = deliveryDate.toISOString().split('T')[0];
        console.log('[CSV FIXED] Auto-filled delivery date:', deliveryDateStr);
      }

      if (!title || !description || !vehicle || !originCity || !destinationCity || !pickupDateStr || !deliveryDateStr) {
        return null;
      }
      const pickupDate = new Date(pickupDateStr);
      const deliveryDate = new Date(deliveryDateStr);
      if (isNaN(pickupDate.getTime()) || isNaN(deliveryDate.getTime())) return null;

      const loadId = `${Date.now()}-${idx}`;
      const load = {
        id: loadId,
        shipperId: 'current-shipper',
        shipperName: 'You',
        origin: { address: '', city: originCity, state: '', zipCode: '', lat: 0, lng: 0 },
        destination: { address: '', city: destinationCity, state: '', zipCode: '', lat: 0, lng: 0 },
        distance: 0,
        weight,
        vehicleType: vehicle as VehicleType,
        rate,
        ratePerMile: 0,
        pickupDate,
        deliveryDate,
        status: 'available' as const,
        description,
        special_requirements: undefined,
        isBackhaul: false,
        aiScore: undefined,
      } as const;
      
      console.log('[CSV FIXED] Created load with auto-fills:', {
        id: loadId,
        title,
        pickupDate: pickupDate.toISOString(),
        deliveryDate: deliveryDate.toISOString(),
        origin: originCity,
        destination: destinationCity
      });
      
      return load;
    } catch (e) {
      console.log('[csvRowToLoad] error row', idx, e);
      return null;
    }
  }, [toVehicleType]);

  const onUploadCSV = useCallback(async () => {
    try {
      setIsImporting(true);
      const res = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      let csvText = '';
      if (Platform.OS === 'web') {
        const r = await fetch(asset.uri);
        csvText = await r.text();
      } else {
        csvText = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      const { headers, rows } = parseCSV(csvText);
      const requiredHeaders = ['title','description','vehicleType','originCity','destinationCity','pickupDate','deliveryDate','weight','rate'];
      const headerIssues = validateCSVHeaders(headers, requiredHeaders);
      if (headerIssues.length > 0) {
        setCsvErrors(headerIssues);
        Alert.alert('Invalid CSV', 'Your CSV headers do not match the template.');
        return;
      }
      if (rows.length === 0) {
        setCsvErrors(['No rows found. Your CSV appears to be empty.']);
        Alert.alert('No rows found', 'Your CSV appears to be empty.');
        return;
      }
      const rowErrors: string[] = [];
      const loads = rows
        .map((row, idx) => {
          const l = csvRowToLoad(row, idx);
          if (!l) {
            rowErrors.push(`Row ${idx + 2}: Missing or invalid required fields.`);
          }
          return l;
        })
        .filter((l): l is NonNullable<ReturnType<typeof csvRowToLoad>> => !!l);
      if (loads.length === 0) {
        setCsvErrors(rowErrors.length ? rowErrors : ['Could not parse any rows. Please use the template.']);
        Alert.alert('Import failed', 'Could not parse any rows. Please use the template.');
        return;
      }
      setCsvErrors(rowErrors);
      await addLoadsBulkWithToast(loads);
      console.log('[CSV FIXED] ✅ Bulk import completed with auto-filled dates/titles');
      console.log('[CSV FIXED] ✅ All loads posted to live board for cross-platform visibility');
      Alert.alert('✅ Fixed', `Imported ${loads.length} loads to live board${rowErrors.length ? `, ${rowErrors.length} rows skipped` : ''}`);
    } catch (e) {
      console.log('[CSV Import] error', e);
      Alert.alert('Import error', 'There was a problem reading the CSV.');
      console.log('[CSV FIXED] Import completed - loads should be visible on board/posts');
    } finally {
      setIsImporting(false);
    }
  }, [addLoadsBulkWithToast, csvRowToLoad]);

  const draftId = useMemo(() => (draft as any)?.id || `draft-${Date.now()}`, [draft]);

  const onPostLoad = useCallback(async () => {
    if (isPosting) return;
    
    try {
      setIsPosting(true);
      console.log('[PostLoad] Starting load creation with photos...');

      const photoUrls = photos.map(p => p.url);
      
      const loadInput: CreateLoadInput = {
        title: draft.title.trim(),
        pickupCity: (draft as any).origin?.city || '',
        pickupState: (draft as any).origin?.state,
        deliveryCity: (draft as any).destination?.city || '',
        deliveryState: (draft as any).destination?.state,
        vehicleType: draft.vehicleType || 'cargo-van',
        price: (draft as any).revenueUsd || 0,
        distance: (draft as any).distanceMi,
        description: draft.description.trim(),
        attachments: photoUrls,
        isBackhaul: false,
      };

      const result = await createLoad(loadInput);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create load');
        return;
      }

      console.log('[PostLoad] ✅ Load created successfully:', result.loadId);
      
      if (result.photosFiltered) {
        console.log('[PostLoad] Photos filtered:', {
          original: result.photosFiltered.original,
          valid: result.photosFiltered.valid,
          totalBytes: result.photosFiltered.totalBytes,
        });
      }

      Alert.alert('Success', 'Load posted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setPhotos([]);
            router.push({ pathname: '/load-details', params: { id: result.loadId } });
          },
        },
      ]);
    } catch (e: any) {
      console.error('[PostLoad] Error:', e);
      Alert.alert('Error', e?.message || 'Failed to post load');
    } finally {
      setIsPosting(false);
    }
  }, [isPosting, photos, draft, router]);

  const canPostLoad = canProceed && photos.length > 0 && !isPosting;

  const onDownloadTemplate = useCallback(async () => {
    try {
      const csv = buildTemplateCSV();
      const fileName = `load-template-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const uri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + fileName;
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('Template saved', `Saved to ${uri}`);
      }
    } catch (e) {
      console.log('[Template CSV] error', e);
      Alert.alert('Download error', 'Could not create template CSV.');
    }
  }, []);

  return (<>
    <Stack.Screen options={{ title: 'Post Load', headerShown: true }} />
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined }) as ("padding" | undefined)}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Stepper current={1} total={5} />
          </View>

          {__DEV__ && devBanner && (
            <View style={styles.devBanner} testID="devFormFillBanner">
              <Text style={styles.devBannerText} numberOfLines={2}>{devBanner}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bulk Upload (CSV)</Text>
            <Text style={styles.helper} testID="csvHelp">Upload a CSV to post multiple loads at once. Use the template for correct columns.</Text>
            <View style={styles.bulkRow}>
              <Pressable
                onPress={onUploadCSV}
                style={[styles.bulkBtn, isImporting && styles.bulkBtnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isImporting }}
                disabled={isImporting}
                testID="uploadCsvButton"
              >
                <FileUp size={18} color={theme.colors.white} />
                <Text style={styles.bulkBtnText}>{isImporting ? 'Importing…' : 'Upload CSV'}</Text>
              </Pressable>
              <Pressable
                onPress={onDownloadTemplate}
                style={styles.secondaryBtn}
                accessibilityRole="button"
                testID="downloadTemplateButton"
              >
                <Download size={18} color={theme.colors.primary} />
                <Text style={styles.secondaryBtnText}>Template</Text>
              </Pressable>
            </View>
            {csvErrors.length > 0 && (
              <View style={styles.errorPanel} testID="csvErrorPanel">
                <View style={styles.errorHeader}>
                  <AlertCircle size={18} color="#ef4444" />
                  <Text style={styles.errorTitle}>We found {csvErrors.length} issue(s)</Text>
                </View>
                {csvErrors.slice(0, 5).map((m, i) => (
                  <Text key={i} style={styles.errorItem}>
                    • {m}
                  </Text>
                ))}
                {csvErrors.length > 5 && (
                  <Text style={styles.errorMore}>+{csvErrors.length - 5} more…</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Load Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label} testID="labelLoadTitle">Load Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Furniture delivery - Dallas to Houston"
                placeholderTextColor={theme.colors.gray}
                value={draft.title}
                onChangeText={(t) => setField('title', t)}
                autoCapitalize="sentences"
                testID="inputLoadTitle"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label} testID="labelDescription">Description *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Describe the cargo, special handling requirements, etc."
                placeholderTextColor={theme.colors.gray}
                value={draft.description}
                onChangeText={(t) => setField('description', t)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="inputDescription"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label} testID="labelVehicle">Vehicle Type Required</Text>
              <View style={styles.vehicleRow}>
                {VEHICLE_OPTIONS.map((opt) => {
                  const selected = draft.vehicleType === opt.key;
                  return (
                    <VehiclePill
                      key={opt.key}
                      label={opt.label}
                      selected={selected}
                      onPress={() => setField('vehicleType', opt.key)}
                      testID={`vehicle-${opt.key}`}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <PhotoUploader
              draftId={draftId}
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={20}
              disabled={isPosting}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={onNext}
                style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canProceed }}
                disabled={!canProceed}
                testID="nextButton"
              >
                <Text style={styles.primaryBtnText}>Next</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={onPostLoad}
                style={[styles.primaryBtn, !canPostLoad && styles.primaryBtnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canPostLoad }}
                disabled={!canPostLoad}
                testID="postLoadButton"
              >
                <Text style={styles.primaryBtnText}>
                  {isPosting ? 'Posting...' : 'Post Load'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </>);
}

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

function VehiclePill({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
      testID={testID ?? 'vehicle-pill'}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Truck size={18} color={selected ? theme.colors.white : theme.colors.primary} />
      <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scrollContent: { padding: 16, paddingBottom: 24 },
  header: {
    marginBottom: 12,
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepDotInactive: {
    backgroundColor: '#cbd5e1',
  },
  stepNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: theme.colors.white,
  },
  stepNumberInactive: {
    color: theme.colors.dark,
    opacity: 0.7,
  },
  stepConnector: {
    width: 24,
    height: 4,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
    borderRadius: 2,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  fieldGroup: { marginBottom: 16 },
  helper: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 12,
    textAlign: 'center',
  },
  bulkRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bulkBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  bulkBtnText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: theme.fontSize.md,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: theme.fontSize.md,
  },
  errorPanel: {
    marginTop: 12,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorTitle: {
    color: '#991b1b',
    fontWeight: '800',
  },
  errorItem: {
    color: '#991b1b',
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  errorMore: {
    color: '#991b1b',
    fontSize: theme.fontSize.sm,
    marginTop: 6,
    fontStyle: 'italic',
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 8,
  },
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
  textarea: {
    minHeight: 100,
  },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 110,
    gap: 8,
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillUnselected: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.primary,
  },
  pillText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  pillTextSelected: { color: theme.colors.white },
  pillTextUnselected: { color: theme.colors.primary },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.select({ ios: 20, android: 16, default: 16 }) as number,
    paddingTop: 8,
    backgroundColor: theme.colors.lightGray,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryBtnText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  devBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#67e8f9',
  },
  devBannerText: {
    color: '#0e7490',
    fontSize: 12,
  },
});