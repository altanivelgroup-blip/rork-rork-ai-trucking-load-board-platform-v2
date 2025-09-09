import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { subscribeFormFill, consumeStagedFormFill, FormFillPayload } from '@/lib/formFillBus';
import { useFocusEffect } from '@react-navigation/native';
import { TRUCK_SUBTYPES, TRAILER_SUBTYPES } from '@/constants/vehicleOptions';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { User, Truck, FileText, Shield, Fuel, Container, Wrench } from 'lucide-react-native';
import { FuelKind, VehicleType } from '@/types';
import TypeSubtypeSelector from '@/components/TypeSubtypeSelector';

// Options moved to shared constants to keep logic in sync
export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, register, userId } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bootstrapping, setBootstrapping] = useState<boolean>(false);
  
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
    
    // Vehicle Category & Subtype
    vehicleCategory: 'truck' as 'truck' | 'trailer',
    vehicleSubtype: 'Hotshot',
    
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

  const mapTrailerSubtypeToType = useCallback((subtype: string) => {
    if (subtype === 'Flatbed Trailer' || subtype === 'Gooseneck Trailer') return 'flatbed';
    if (subtype === 'Enclosed Trailer') return 'enclosed-trailer';
    if (subtype === 'Car Hauler') return 'car-hauler';
    return 'trailer';
  }, []);



  // Handle type change and reset subtype - Fixed logic
  const handleTypeChange = useCallback((newType: 'truck' | 'trailer') => {
    console.log('[DriverProfile] Type change:', newType);
    const newSubtypes = newType === 'truck' ? TRUCK_SUBTYPES : TRAILER_SUBTYPES;
    const newSubtype = newSubtypes[0];
    console.log('[DriverProfile] Setting subtype to:', newSubtype);
    
    setFormData(prev => {
      const updated = {
        ...prev,
        vehicleCategory: newType,
        vehicleSubtype: newSubtype,
        ...(newType === 'trailer' ? { trailerType: mapTrailerSubtypeToType(newSubtype) } : {}),
      };
      console.log('[DriverProfile] Updated form data:', updated);
      return updated;
    });
  }, [mapTrailerSubtypeToType]);

  // Handle subtype change - Fixed logic
  const handleSubtypeChange = useCallback((newSubtype: string) => {
    console.log('[DriverProfile] Subtype change:', newSubtype);
    setFormData(prev => {
      console.log('[DriverProfile] Current category in callback:', prev.vehicleCategory);
      const updated = {
        ...prev,
        vehicleSubtype: newSubtype,
        ...(prev.vehicleCategory === 'trailer' ? { trailerType: mapTrailerSubtypeToType(newSubtype) } : {}),
      };
      console.log('[DriverProfile] Updated subtype data:', updated);
      return updated;
    });
  }, [mapTrailerSubtypeToType]);

  useEffect(() => {
    if (!user && userId && !bootstrapping) {
      (async () => {
        try {
          setBootstrapping(true);
          const anonEmail = `${userId}@anon.local`;
          await register(anonEmail, 'temp-password', { email: anonEmail, name: '' });
          console.log('[DriverProfile] Bootstrapped local driver profile for uid:', userId);
        } catch (e) {
          console.warn('[DriverProfile] Failed to bootstrap driver profile', e);
        } finally {
          setBootstrapping(false);
        }
      })();
    }

    if (user) {
      // Determine vehicle category and subtype from user data
      let vehicleCategory: 'truck' | 'trailer' = 'truck';
      let vehicleSubtype = 'Hotshot';
      
      // Check if user has trailer info or vehicleInfo that indicates truck type
      if (user.trailerType) {
        vehicleCategory = 'trailer';
        vehicleSubtype = user.trailerType === 'flatbed' ? 'Flatbed Trailer'
          : user.trailerType === 'enclosed-trailer' ? 'Enclosed Trailer'
          : user.trailerType === 'car-hauler' ? 'Car Hauler'
          : 'Flatbed Trailer';
      } else if (user.vehicleInfo) {
        vehicleCategory = 'truck';
        vehicleSubtype = TRUCK_SUBTYPES.includes(user.vehicleInfo as any) ? user.vehicleInfo : 'Hotshot';
      }
      
      console.log('[DriverProfile] Setting initial data:', { vehicleCategory, vehicleSubtype });
      
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

        // Vehicle Category & Subtype
        vehicleCategory,
        vehicleSubtype,
        
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
  }, [user, userId, bootstrapping, register]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleFuelType = () => {
    setFormData(prev => ({ 
      ...prev, 
      fuelType: prev.fuelType === 'diesel' ? 'gasoline' as const : 'diesel' as const
    }));
  };



  const applyFormFill = useCallback((data: FormFillPayload) => {
    try {
      const norm: Record<string, any> = {};
      Object.entries(data || {}).forEach(([k, v]) => { norm[String(k).toLowerCase()] = v; });
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const val = norm[k.toLowerCase()];
          if (val !== undefined && val !== null && String(val).trim() !== '') return val;
        }
        return undefined;
      };
      const make = get('make','vehiclemake');
      const model = get('model','vehiclemodel');
      const year = get('year','vehicleyear');
      const fuel = get('fueltype');
      const mpg = get('mpg','mpgrated');

      setFormData(prev => ({
        ...prev,
        vehicleMake: make !== undefined ? String(make) : prev.vehicleMake,
        vehicleModel: model !== undefined ? String(model) : prev.vehicleModel,
        vehicleYear: year !== undefined ? String(Number(year) || '') : prev.vehicleYear,
        mpgRated: mpg !== undefined ? String(Number(mpg) || '') : prev.mpgRated,
        fuelType: fuel !== undefined ? (/diesel/i.test(String(fuel)) ? 'diesel' : 'gasoline') : prev.fuelType,
      }));
      console.log('[DriverProfile] Applied form fill payload');
    } catch (e) {
      console.warn('[DriverProfile] Failed to apply form fill payload', e);
    }
  }, []);

  useEffect(() => {
    const staged = consumeStagedFormFill();
    if (staged) applyFormFill(staged);
    const unsub = subscribeFormFill((d) => applyFormFill(d));
    return () => { unsub && unsub(); };
  }, [applyFormFill]);

  useFocusEffect(
    React.useCallback(() => {
      const staged = consumeStagedFormFill();
      if (staged) applyFormFill(staged);
      return () => {};
    }, [applyFormFill])
  );

  const onSave = useCallback(async () => {
    try {
      setSubmitting(true);
      
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
        vehicleInfo: formData.vehicleCategory === 'truck' ? formData.vehicleSubtype : undefined,
        trailerMake: formData.trailerMake,
        trailerModel: formData.trailerModel,
        trailerYear: formData.trailerYear ? parseInt(formData.trailerYear) : null,
        trailerVin: formData.trailerVin,
        trailerPlate: formData.trailerPlate,
        trailerInsuranceCarrier: formData.trailerInsuranceCarrier,
        trailerPolicyNumber: formData.trailerPolicyNumber,
        trailerGvwrLbs: formData.trailerGvwrLbs ? parseInt(formData.trailerGvwrLbs) : null,
        trailerType: (formData.vehicleCategory === 'trailer' ? mapTrailerSubtypeToType(formData.vehicleSubtype) : formData.trailerType) as VehicleType,
        companyName: formData.companyName,
        mcNumber: formData.mcNumber,
        dotNumber: formData.dotNumber,
        insuranceCarrier: formData.insuranceCarrier,
        policyNumber: formData.policyNumber,
      };
      
      await updateProfile(updateData);
      toast.show('Driver profile saved successfully', 'success');
    } catch {
      toast.show('Save failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [formData, updateProfile, toast, mapTrailerSubtypeToType]);

  const onSubmitForVerification = useCallback(async () => {
    await onSave();
    toast.show('Profile submitted for verification', 'success');
  }, [onSave, toast]);

  const insets = useSafeAreaInsets();

  if (bootstrapping) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}> 
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.gray }}>Preparing your profile...</Text>
      </View>
    );
  }

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

          {/* Type & Subtype Selector */}
          <TypeSubtypeSelector
            type={formData.vehicleCategory}
            subtype={formData.vehicleSubtype}
            onTypeChange={handleTypeChange}
            onSubtypeChange={handleSubtypeChange}
            testIDPrefix="profile"
          />
          
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

        {/* Equipment & Maintenance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wrench size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Equipment & Maintenance</Text>
          </View>
          <View style={styles.row}>
            <TouchableOpacity 
              style={styles.documentsBtn} 
              onPress={() => router.push('/equipment')}
              testID="open-equipment-btn"
            >
              <Truck size={16} color={theme.colors.primary} />
              <Text style={styles.documentsBtnText}>Manage Equipment</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity 
              style={styles.documentsBtn} 
              onPress={() => router.push('/maintenance')}
              testID="open-maintenance-btn"
            >
              <Wrench size={16} color={theme.colors.primary} />
              <Text style={styles.documentsBtnText}>Maintenance</Text>
            </TouchableOpacity>
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
  // Segmented control & subtype chips
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.gray,
  },
  segmentButtonTextActive: {
    color: theme.colors.dark,
    fontWeight: '600',
  },
  subtypeScroll: { maxHeight: 40 },
  subtypeContainer: { flexDirection: 'row', gap: theme.spacing.xs },
  subtypeButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subtypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  subtypeButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.gray, fontWeight: '500' },
  subtypeButtonTextActive: { color: theme.colors.white, fontWeight: '600' },
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
    flex: 1,
    justifyContent: 'center',
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
