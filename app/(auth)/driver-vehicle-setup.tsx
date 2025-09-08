import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import DriverVehicleForm, { DriverVehicleValues } from '@/components/DriverVehicleForm';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

export default function DriverVehicleSetupScreen() {
  const router = useRouter();
  const { updateProfile } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);

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
      toast.show('Vehicle saved', 'success');
      router.replace('/dashboard');
    } catch (e) {
      console.error('[driver-vehicle-setup] save error', e);
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [router, toast, updateProfile]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Driver Vehicle Setup' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <DriverVehicleForm onSubmit={onSubmit} submitting={submitting} mode="setup" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
});
