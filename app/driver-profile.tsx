import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import DriverVehicleForm, { DriverVehicleValues } from '@/components/DriverVehicleForm';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);

  const initial = useMemo(() => ({
    vehicleMake: user?.vehicleMake,
    vehicleModel: user?.vehicleModel,
    vehicleYear: user?.vehicleYear,
    fuelType: (user?.fuelType as any) ?? 'diesel',
    mpgRated: user?.mpgRated,
    vin: user?.vin,
    plate: user?.plate,
    tankGallons: user?.tankGallons ?? undefined,
    gvwrLbs: user?.gvwrLbs ?? undefined,
  }), [user]);

  const onSubmit = useCallback(async (values: DriverVehicleValues) => {
    try {
      setSubmitting(true);
      await updateProfile({
        vehicleMake: values.vehicleMake,
        vehicleModel: values.vehicleModel,
        vehicleYear: values.vehicleYear ?? null,
        fuelType: values.fuelType,
        mpgRated: values.mpgRated ?? null,
        vin: values.vin,
        plate: values.plate,
        tankGallons: values.tankGallons ?? null,
        gvwrLbs: values.gvwrLbs ?? null,
      });
      toast.show('Driver profile saved', 'success');
      router.back();
    } catch (e) {
      console.error('[driver-profile] save error', e);
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [router, toast, updateProfile]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Driver Profile' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <DriverVehicleForm initial={initial} onSubmit={onSubmit} submitting={submitting} mode="edit" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
});
