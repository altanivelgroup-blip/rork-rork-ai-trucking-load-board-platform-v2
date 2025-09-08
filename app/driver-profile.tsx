import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { User, Truck, FileText, Shield, Fuel } from 'lucide-react-native';
import { FuelKind } from '@/types';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    
    // Vehicle Info
    vehicleMake: user?.vehicleMake || '',
    vehicleModel: user?.vehicleModel || '',
    vehicleYear: user?.vehicleYear?.toString() || '',
    fuelType: (user?.fuelType || 'diesel') as 'diesel' | 'gasoline',
    mpgRated: user?.mpgRated?.toString() || '',
    vin: user?.vin || '',
    plate: user?.plate || '',
    tankGallons: user?.tankGallons?.toString() || '50',
    gvwrLbs: user?.gvwrLbs?.toString() || '',
    
    // Company Info
    companyName: user?.companyName || '',
    mcNumber: user?.mcNumber || '',
    dotNumber: user?.dotNumber || '',
    insuranceCarrier: user?.insuranceCarrier || '',
    policyNumber: user?.policyNumber || '',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleFuelType = () => {
    setFormData(prev => ({ 
      ...prev, 
      fuelType: prev.fuelType === 'diesel' ? 'gasoline' as const : 'diesel' as const
    }));
  };

  const onSave = useCallback(async () => {
    try {
      setSubmitting(true);
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        company: formData.company,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
        fuelType: formData.fuelType === 'gasoline' ? 'gas' as FuelKind : 'diesel' as FuelKind,
        mpgRated: formData.mpgRated ? parseFloat(formData.mpgRated) : null,
        vin: formData.vin,
        plate: formData.plate,
        tankGallons: formData.tankGallons ? parseInt(formData.tankGallons) : null,
        gvwrLbs: formData.gvwrLbs ? parseInt(formData.gvwrLbs) : null,
        companyName: formData.companyName,
        mcNumber: formData.mcNumber,
        dotNumber: formData.dotNumber,
        insuranceCarrier: formData.insuranceCarrier,
        policyNumber: formData.policyNumber,
      });
      toast.show('Driver profile saved successfully', 'success');
    } catch (e) {
      console.error('[driver-profile] save error', e);
      toast.show('Save failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [formData, updateProfile, toast]);

  const onSubmitForVerification = useCallback(async () => {
    await onSave();
    toast.show('Profile submitted for verification', 'success');
  }, [onSave, toast]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ 
        title: 'Edit Profile',
        headerRight: () => (
          <TouchableOpacity onPress={onSave} disabled={submitting}>
            <Text style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}>Save</Text>
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Enter your full name"
              testID="name-input"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formData.email}
              editable={false}
              placeholder="Email address"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
              testID="phone-input"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company</Text>
            <TextInput
              style={styles.input}
              value={formData.company}
              onChangeText={(text) => updateField('company', text)}
              placeholder="Your company name"
              testID="company-input"
            />
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Year *</Text>
              <TextInput
                style={styles.input}
                value={formData.vehicleYear}
                onChangeText={(text) => updateField('vehicleYear', text)}
                placeholder="2024"
                keyboardType="numeric"
                testID="year-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Make *</Text>
              <TextInput
                style={styles.input}
                value={formData.vehicleMake}
                onChangeText={(text) => updateField('vehicleMake', text)}
                placeholder="RAM"
                testID="make-input"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Model *</Text>
            <TextInput
              style={styles.input}
              value={formData.vehicleModel}
              onChangeText={(text) => updateField('vehicleModel', text)}
              placeholder="3500"
              testID="model-input"
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Fuel Type</Text>
              <TouchableOpacity style={styles.fuelToggle} onPress={toggleFuelType}>
                <Fuel size={16} color={theme.colors.white} />
                <Text style={styles.fuelToggleText}>
                  {formData.fuelType.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tank Gallons</Text>
              <TextInput
                style={styles.input}
                value={formData.tankGallons}
                onChangeText={(text) => updateField('tankGallons', text)}
                placeholder="50"
                keyboardType="numeric"
                testID="tank-input"
              />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>MPG</Text>
              <TextInput
                style={styles.input}
                value={formData.mpgRated}
                onChangeText={(text) => updateField('mpgRated', text)}
                placeholder="12.5"
                keyboardType="decimal-pad"
                testID="mpg-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>GVWR (lbs)</Text>
              <TextInput
                style={styles.input}
                value={formData.gvwrLbs}
                onChangeText={(text) => updateField('gvwrLbs', text)}
                placeholder="14000"
                keyboardType="numeric"
                testID="gvwr-input"
              />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>VIN</Text>
              <TextInput
                style={styles.input}
                value={formData.vin}
                onChangeText={(text) => updateField('vin', text)}
                placeholder="Vehicle Identification Number"
                autoCapitalize="characters"
                testID="vin-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>License Plate</Text>
              <TextInput
                style={styles.input}
                value={formData.plate}
                onChangeText={(text) => updateField('plate', text)}
                placeholder="ABC-1234"
                autoCapitalize="characters"
                testID="plate-input"
              />
            </View>
          </View>
        </View>

        {/* Company & Insurance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Company & Insurance</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.companyName}
              onChangeText={(text) => updateField('companyName', text)}
              placeholder="ACME Logistics LLC"
              testID="company-name-input"
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>MC Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.mcNumber}
                onChangeText={(text) => updateField('mcNumber', text)}
                placeholder="MC012345"
                testID="mc-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>DOT Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.dotNumber}
                onChangeText={(text) => updateField('dotNumber', text)}
                placeholder="DOT0123456"
                testID="dot-input"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Carrier *</Text>
            <TextInput
              style={styles.input}
              value={formData.insuranceCarrier}
              onChangeText={(text) => updateField('insuranceCarrier', text)}
              placeholder="Progressive Commercial"
              testID="insurance-input"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Policy Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.policyNumber}
              onChangeText={(text) => updateField('policyNumber', text)}
              placeholder="POL-123456789"
              testID="policy-input"
            />
          </View>
        </View>

        {/* Documents & Verification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Documents & Verification</Text>
          </View>
          
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              Status: {user?.verificationStatus ? String(user.verificationStatus).toUpperCase() : 'UNVERIFIED'}
            </Text>
            <Text style={styles.statusDesc}>
              Upload CDL, COI, and registration to get verified and start accepting loads.
            </Text>
            
            <TouchableOpacity 
              style={styles.documentsBtn} 
              onPress={() => router.push('/documents')}
              testID="manage-documents-btn"
            >
              <FileText size={16} color={theme.colors.primary} />
              <Text style={styles.documentsBtnText}>Manage Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={onSave}
            disabled={submitting}
            testID="save-profile-btn"
          >
            <Text style={styles.saveButtonText}>
              {submitting ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={onSubmitForVerification}
            disabled={submitting}
            testID="submit-verification-btn"
          >
            <Text style={styles.submitButtonText}>
              Submit for Verification
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.lightGray 
  },
  scroll: { 
    padding: theme.spacing.md, 
    paddingBottom: theme.spacing.xl 
  },
  saveBtn: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtnDisabled: {
    color: theme.colors.gray,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginLeft: theme.spacing.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    backgroundColor: theme.colors.white,
    color: theme.colors.dark,
  },
  inputDisabled: {
    backgroundColor: theme.colors.lightGray,
    color: theme.colors.gray,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  spacer: {
    width: 12,
  },
  fuelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    justifyContent: 'center',
  },
  fuelToggleText: {
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  statusCard: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  statusTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  statusDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
  },
  documentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  documentsBtnText: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});
