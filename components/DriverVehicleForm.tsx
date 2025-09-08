import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { Car, Gauge, Fuel, Hash, Badge, ClipboardList } from 'lucide-react-native';
import { useToast } from '@/components/Toast';

export type FuelKind = 'diesel' | 'gas';

export interface DriverVehicleValues {
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number | null;
  fuelType: FuelKind;
  mpgRated: number | null;
  vin?: string;
  plate?: string;
  tankGallons?: number | null;
  gvwrLbs?: number | null;
}

interface Props {
  initial?: Partial<DriverVehicleValues>;
  onSubmit: (values: DriverVehicleValues) => Promise<void> | void;
  submitting?: boolean;
  mode?: 'setup' | 'edit';
}

export default function DriverVehicleForm({ initial, onSubmit, submitting = false, mode = 'setup' }: Props) {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [vehicleMake, setVehicleMake] = useState<string>(initial?.vehicleMake ?? '');
  const [vehicleModel, setVehicleModel] = useState<string>(initial?.vehicleModel ?? '');
  const [vehicleYear, setVehicleYear] = useState<string>(initial?.vehicleYear != null ? String(initial?.vehicleYear) : '');
  const [fuelType, setFuelType] = useState<FuelKind>((initial?.fuelType as FuelKind) ?? 'diesel');
  const [mpgRated, setMpgRated] = useState<string>(initial?.mpgRated != null ? String(initial?.mpgRated) : '');
  const [vin, setVin] = useState<string>(initial?.vin ?? '');
  const [plate, setPlate] = useState<string>(initial?.plate ?? '');
  const [tankGallons, setTankGallons] = useState<string>(initial?.tankGallons != null ? String(initial?.tankGallons) : '');
  const [gvwrLbs, setGvwrLbs] = useState<string>(initial?.gvwrLbs != null ? String(initial?.gvwrLbs) : '');

  const parsed = useMemo<DriverVehicleValues>(() => ({
    vehicleMake: vehicleMake.trim(),
    vehicleModel: vehicleModel.trim(),
    vehicleYear: vehicleYear ? Number(vehicleYear) : null,
    fuelType,
    mpgRated: mpgRated ? Number(mpgRated) : null,
    vin: vin.trim() || undefined,
    plate: plate.trim() || undefined,
    tankGallons: tankGallons ? Number(tankGallons) : null,
    gvwrLbs: gvwrLbs ? Number(gvwrLbs) : null,
  }), [vehicleMake, vehicleModel, vehicleYear, fuelType, mpgRated, vin, plate, tankGallons, gvwrLbs]);

  const validate = useCallback((): string | null => {
    const y = parsed.vehicleYear ?? 0;
    const mpg = parsed.mpgRated ?? 0;
    if (!parsed.vehicleMake) return 'Vehicle make is required';
    if (!parsed.vehicleModel) return 'Vehicle model is required';
    if (parsed.vehicleYear == null) return 'Vehicle year is required';
    if (Number.isNaN(y) || y < 1990 || y > currentYear + 1) return `Year must be between 1990 and ${currentYear + 1}`;
    if (parsed.fuelType !== 'diesel' && parsed.fuelType !== 'gas') return 'Fuel type must be diesel or gas';
    if (parsed.mpgRated == null) return 'Rated MPG is required';
    if (Number.isNaN(mpg) || mpg < 4 || mpg > 30) return 'MPG must be between 4 and 30';
    if (parsed.tankGallons != null && (Number.isNaN(parsed.tankGallons) || (parsed.tankGallons as number) < 0)) return 'Tank gallons must be ≥ 0 or blank';
    if (parsed.gvwrLbs != null && (Number.isNaN(parsed.gvwrLbs) || (parsed.gvwrLbs as number) < 0)) return 'GVWR lbs must be ≥ 0 or blank';
    return null;
  }, [parsed, currentYear]);

  const handleSubmit = useCallback(async () => {
    const error = validate();
    if (error) {
      toast.show(error, 'error');
      return;
    }
    await onSubmit(parsed);
  }, [validate, parsed, onSubmit, toast]);

  return (
    <View style={styles.card}>
      <LabeledInput icon={<Car size={18} color={theme.colors.gray} />} placeholder="Vehicle Make" value={vehicleMake} onChangeText={setVehicleMake} testID="vehicle-make" />
      <LabeledInput icon={<Car size={18} color={theme.colors.gray} />} placeholder="Vehicle Model" value={vehicleModel} onChangeText={setVehicleModel} testID="vehicle-model" />
      <LabeledInput icon={<Hash size={18} color={theme.colors.gray} />} placeholder={`Vehicle Year (1990 - ${currentYear + 1})`} value={vehicleYear} onChangeText={(t) => setVehicleYear(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" testID="vehicle-year" />
      <View style={styles.row}>
        <TouchableOpacity accessibilityRole="button" testID="fuel-type-toggle" onPress={() => setFuelType((prev) => (prev === 'diesel' ? 'gas' : 'diesel'))} style={styles.toggle}>
          <Fuel size={18} color={theme.colors.white} />
          <Text style={styles.toggleText}>Fuel: {fuelType.toUpperCase()} (tap)</Text>
        </TouchableOpacity>
        <View style={styles.gap} />
        <LabeledInput icon={<Gauge size={18} color={theme.colors.gray} />} placeholder="Rated MPG (4..30)" value={mpgRated} onChangeText={(t) => setMpgRated(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" testID="mpg-rated" />
      </View>
      <LabeledInput icon={<Badge size={18} color={theme.colors.gray} />} placeholder="VIN (optional)" value={vin} onChangeText={setVin} autoCapitalize="characters" testID="vin" />
      <LabeledInput icon={<ClipboardList size={18} color={theme.colors.gray} />} placeholder="Plate (optional)" value={plate} onChangeText={setPlate} autoCapitalize="characters" testID="plate" />
      <View style={styles.row}>
        <LabeledInput icon={<Gauge size={18} color={theme.colors.gray} />} placeholder="Tank Gallons (optional)" value={tankGallons} onChangeText={(t) => setTankGallons(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" testID="tank-gallons" />
        <View style={styles.gap} />
        <LabeledInput icon={<Gauge size={18} color={theme.colors.gray} />} placeholder="GVWR lbs (optional)" value={gvwrLbs} onChangeText={(t) => setGvwrLbs(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" testID="gvwr-lbs" />
      </View>

      <TouchableOpacity style={[styles.submit, submitting && styles.submitDisabled]} disabled={submitting} onPress={handleSubmit} testID={mode === 'setup' ? 'submit-vehicle-setup' : 'submit-vehicle-edit'}>
        <Text style={styles.submitText}>{mode === 'setup' ? 'Save & Continue' : 'Save Profile'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function LabeledInput({ icon, ...props }: { icon: React.ReactNode } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputIcon}>
        {/* eslint-disable-next-line @rork/linters/general-no-raw-text */}
        {icon}
      </View>
      <TextInput {...props} placeholderTextColor={theme.colors.gray} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, gap: theme.spacing.sm },
  row: { flexDirection: 'row' },
  gap: { width: 8 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.dark },
  toggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.md },
  toggleText: { color: theme.colors.white, fontWeight: '700', paddingVertical: theme.spacing.md, marginLeft: 8 },
  submit: { marginTop: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: theme.spacing.md, alignItems: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: '700' },
});
