import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { User, Truck, FileText, Shield, Fuel, Container } from 'lucide-react-native';
import { FuelKind, VehicleType } from '@/types';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    name: '',
    email: '',
    phone: '',
    company: '',
    
    // Vehicle Info
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    fuelType: 'diesel' as 'diesel' | 'gasoline',
    mpgRated: '',
    vin: '',
    plate: '',
    tankGallons: '50',
    gvwrLbs: '',
    
    // Trailer Info
    trailerMake: '',
    trailerModel: '',
    trailerYear: '',
    trailerVin: '',
    trailerPlate: '',
    trailerInsuranceCarrier: '',
    trailerPolicyNumber: '',
    trailerGvwrLbs: '',
    trailerType: 'flatbed',
    
    // Company Info
    companyName: '',
    mcNumber: '',
    dotNumber: '',
    insuranceCarrier: '',
    policyNumber: '',
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      console.log('[driver-profile] updating form data with user:', JSON.stringify(user, null, 2));
      setFormData({
        // Personal Info
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        
        // Vehicle Info
        vehicleMake: user.vehicleMake || '',
        vehicleModel: user.vehicleModel || '',
        vehicleYear: user.vehicleYear?.toString() || '',
        fuelType: (user.fuelType === 'gas' ? 'gasoline' : user.fuelType || 'diesel') as 'diesel' | 'gasoline',
        mpgRated: user.mpgRated?.toString() || '',
        vin: user.vin || '',
        plate: user.plate || '',
        tankGallons: user.tankGallons?.toString() || '50',
        gvwrLbs: user.gvwrLbs?.toString() || '',
        
        // Trailer Info
        trailerMake: user.trailerMake || '',
        trailerModel: user.trailerModel || '',
        trailerYear: user.trailerYear?.toString() || '',
        trailerVin: user.trailerVin || '',
        trailerPlate: user.trailerPlate || '',
        trailerInsuranceCarrier: user.trailerInsuranceCarrier || '',
        trailerPolicyNumber: user.trailerPolicyNumber || '',
        trailerGvwrLbs: user.trailerGvwrLbs?.toString() || '',
        trailerType: user.trailerType || 'flatbed',
        
        // Company Info
        companyName: user.companyName || '',
        mcNumber: user.mcNumber || '',
        dotNumber: user.dotNumber || '',
        insuranceCarrier: user.insuranceCarrier || '',
        policyNumber: user.policyNumber || '',
      });
    }
  }, [user]);

  const updateField = (field: string, value: string) => {
    console.log('[driver-profile] updating field:', field, 'with value:', value);
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
      console.log('[driver-profile] saving profile with data:', JSON.stringify(formData, null, 2));
      
      const updateData = {
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
        trailerMake: formData.trailerMake,
        trailerModel: formData.trailerModel,
        trailerYear: formData.trailerYear ? parseInt(formData.trailerYear) : null,
        trailerVin: formData.trailerVin,
        trailerPlate: formData.trailerPlate,
        trailerInsuranceCarrier: formData.trailerInsuranceCarrier,
        trailerPolicyNumber: formData.trailerPolicyNumber,
        trailerGvwrLbs: formData.trailerGvwrLbs ? parseInt(formData.trailerGvwrLbs) : null,
        trailerType: formData.trailerType as VehicleType,
        companyName: formData.companyName,
        mcNumber: formData.mcNumber,
        dotNumber: formData.dotNumber,
        insuranceCarrier: formData.insuranceCarrier,
        policyNumber: formData.policyNumber,
      };
      
      console.log('[driver-profile] update data:', updateData);
      await updateProfile(updateData);
      console.log('[driver-profile] profile updated successfully');
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

        {/* Trailer Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Container size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Trailer Information</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={formData.trailerYear}
                onChangeText={(text) => updateField('trailerYear', text)}
                placeholder="2024"
                keyboardType="numeric"
                testID="trailer-year-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Make</Text>
              <TextInput
                style={styles.input}
                value={formData.trailerMake}
                onChangeText={(text) => updateField('trailerMake', text)}
                placeholder="Great Dane"
                testID="trailer-make-input"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              value={formData.trailerModel}
              onChangeText={(text) => updateField('trailerModel', text)}
              placeholder="Flatbed 48ft"
              testID="trailer-model-input"
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.input}
                value={formData.trailerType}
                onChangeText={(text) => updateField('trailerType', text)}
                placeholder="flatbed"
                testID="trailer-type-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>GVWR (lbs)</Text>
              <TextInput
                style={styles.input}
                value={formData.trailerGvwrLbs}
                onChangeText={(text) => updateField('trailerGvwrLbs', text)}
                placeholder="34000"
                keyboardType="numeric"
                testID="trailer-gvwr-input"
              />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>VIN</Text>
              <TextInput
                style={styles.input}
                value={formData.trailerVin}
                onChangeText={(text) => updateField('trailerVin', text)}
                placeholder="Trailer VIN Number"
                autoCapitalize="characters"
                testID="trailer-vin-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>License Plate</Text>
              <TextInput
                style={styles.input}
                value={formData.trailerPlate}
                onChangeText={(text) => updateField('trailerPlate', text)}
                placeholder="TRL-1234"
                autoCapitalize="characters"
                testID="trailer-plate-input"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Carrier</Text>
            <TextInput
              style={styles.input}
              value={formData.trailerInsuranceCarrier}
              onChangeText={(text) => updateField('trailerInsuranceCarrier', text)}
              placeholder="Progressive Commercial"
              testID="trailer-insurance-input"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Policy Number</Text>
            <TextInput
              style={styles.input}
              value={formData.trailerPolicyNumber}
              onChangeText={(text) => updateField('trailerPolicyNumber', text)}
              placeholder="TRL-POL-123456789"
              testID="trailer-policy-input"
            />
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

        {/* Debug Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <Text style={styles.debugText}>User Email: {user?.email || 'No user'}</Text>
          <Text style={styles.debugText}>Form Name: {formData.name}</Text>
          <Text style={styles.debugText}>Form Phone: {formData.phone}</Text>
          <Text style={styles.debugText}>Form Vehicle Make: {formData.vehicleMake}</Text>
          
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => {
              console.log('[debug] Current form data:', JSON.stringify(formData, null, 2));
              console.log('[debug] Current user:', JSON.stringify(user, null, 2));
            }}
          >
            <Text style={styles.debugButtonText}>Log Current State</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => {
              console.log('[debug] Filling comprehensive sample data for robertlv996@gmail.com...');
              const sampleData = {
                // Personal Info
                name: 'Robert Lopez',
                email: 'robertlv996@gmail.com',
                phone: '(702) 555-0123',
                company: 'Lopez Trucking LLC',
                
                // Vehicle Info
                vehicleMake: 'Freightliner',
                vehicleModel: 'Cascadia',
                vehicleYear: '2022',
                fuelType: 'diesel' as const,
                mpgRated: '7.2',
                vin: '1FUJGHDV8NLAA1234',
                plate: 'NV-TRK-789',
                tankGallons: '150',
                gvwrLbs: '80000',
                
                // Trailer Info
                trailerMake: 'Great Dane',
                trailerModel: 'Super Seal 53ft Dry Van',
                trailerYear: '2021',
                trailerVin: '1GRAA0628MF123456',
                trailerPlate: 'NV-TRL-456',
                trailerInsuranceCarrier: 'Progressive Commercial Auto',
                trailerPolicyNumber: 'TRL-POL-987654321',
                trailerGvwrLbs: '34000',
                trailerType: 'dry_van',
                
                // Company Info
                companyName: 'Lopez Trucking LLC',
                mcNumber: 'MC-987654',
                dotNumber: 'DOT-3456789',
                insuranceCarrier: 'Progressive Commercial Auto',
                policyNumber: 'POL-123456789',
              };
              setFormData(sampleData);
              console.log('[debug] Sample data filled for Robert Lopez profile:', JSON.stringify(sampleData, null, 2));
              
              // Auto-save after filling
              setTimeout(() => {
                console.log('[debug] Auto-saving filled data...');
                onSave();
              }, 500);
            }}
          >
            <Text style={styles.debugButtonText}>Fill & Save Robert's Profile</Text>
          </TouchableOpacity>
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
  debugText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  debugButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    alignItems: 'center',
  },
  debugButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
