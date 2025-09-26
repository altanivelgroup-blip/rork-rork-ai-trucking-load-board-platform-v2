import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { subscribeFormFill, consumeStagedFormFill, FormFillPayload } from '@/lib/formFillBus';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { useProfileCache } from '@/hooks/useProfileCache';
import { User, Truck, FileText, Shield, Fuel, Container, Wrench } from 'lucide-react-native';
import { FuelKind, VehicleType, Driver } from '@/types';
import { saveDriverProfile, getDriverProfile } from '@/lib/firebase';




// Options moved to shared constants to keep logic in sync
export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, register, userId } = useAuth();
  const { updateCachedProfile, validateExperience } = useProfileCache();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bootstrapping, setBootstrapping] = useState<boolean>(false);
  const [validatingExperience, setValidatingExperience] = useState<boolean>(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    name: '',
    email: '',
    phone: '',
    company: '',
    
    // Basic Driver Profile Fields
    truckType: 'truck' as VehicleType,
    tankSize: '',
    fuelTypePreference: 'diesel' as 'diesel' | 'gasoline',
    yearsExperience: '',
    safetyCertifications: '',
    
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








 // Load the profile directly from Firestore so edits stick after logout/login
useEffect(() => {
  let alive = true;
  (async () => {
    if (!userId) return;
    try {
      const result = await getDriverProfile(userId); // reads drivers/{uid}
      if (!alive || !result || !result.success || !result.data) return;

      const driver = result.data;
      setFormData({
        // Personal Info
        name: driver.fullName ?? driver.name ?? '',
        email: driver.email ?? '',
        phone: driver.phone ?? '',
        company: driver.company ?? '',

        // Basic Driver Profile Fields
        truckType: driver.truckType ?? 'truck',
        tankSize: driver.tankSize != null ? String(driver.tankSize) : '',
        fuelTypePreference: driver.fuelTypePreference ?? 'diesel',
        yearsExperience: driver.yearsExperience != null ? String(driver.yearsExperience) : '',
        safetyCertifications: driver.safetyCertifications ?? '',

        // Vehicle Info
        vehicleMake: driver.vehicleMake ?? '',
        vehicleModel: driver.vehicleModel ?? '',
        vehicleYear: driver.vehicleYear != null ? String(driver.vehicleYear) : '',
        fuelType: (driver.fuelType === 'gas' ? 'gasoline' : driver.fuelType) ?? 'diesel',
        mpgRated: driver.mpgRated != null ? String(driver.mpgRated) : '',
        vin: driver.vin ?? '',
        plate: driver.plate ?? '',
        tankGallons: driver.tankGallons != null ? String(driver.tankGallons) : '50',
        gvwrLbs: driver.gvwrLbs != null ? String(driver.gvwrLbs) : '',

        // Trailer Info
        trailerMake: driver.trailerMake ?? '',
        trailerModel: driver.trailerModel ?? '',
        trailerYear: driver.trailerYear != null ? String(driver.trailerYear) : '',
        trailerVin: driver.trailerVin ?? '',
        trailerPlate: driver.trailerPlate ?? '',
        trailerInsuranceCarrier: driver.trailerInsuranceCarrier ?? '',
        trailerPolicyNumber: driver.trailerPolicyNumber ?? '',
        trailerGvwrLbs: driver.trailerGvwrLbs != null ? String(driver.trailerGvwrLbs) : '',
        trailerType: driver.trailerType ?? 'flatbed',

        // Company & Insurance
        companyName: driver.companyName ?? '',
        mcNumber: driver.mcNumber ?? '',
        dotNumber: driver.dotNumber ?? '',
        insuranceCarrier: driver.insuranceCarrier ?? '',
        policyNumber: driver.policyNumber ?? '',
      });
    } catch (e) {
      console.warn('[DriverProfile] getDriverProfile failed', e);
    }
  })();
  return () => { alive = false; };
}, [userId]);

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
const patchAuthCache = useCallback(async (patch: any) => {
  try {
    const raw = await AsyncStorage.getItem('auth:user:profile');
    const current = raw ? JSON.parse(raw) : {};
    const next = {
      ...current,
      ...patch,
      fuelProfile: {
        ...(current?.fuelProfile || {}),
        ...(patch?.fuelProfile || {}),
      },
    };
    await AsyncStorage.setItem('auth:user:profile', JSON.stringify(next));
    console.log('[DriverProfile] Patched auth cache MPG =', next?.fuelProfile?.averageMpg);
  } catch (e) {
    console.warn('[DriverProfile] patchAuthCache failed', e);
  }
}, []);

  const toggleFuelType = useCallback(() => {
    setFormData(prev => ({ 
      ...prev, 
      fuelType: prev.fuelType === 'diesel' ? 'gasoline' as const : 'diesel' as const
    }));
  }, []);





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
    if (submitting) {
      console.log('[DriverProfile] Save already in progress, skipping');
      return;
    }
    
    console.log('[DriverProfile] Starting profile save process...');
    console.log('[DriverProfile] Form data:', JSON.stringify(formData, null, 2));
    
    try {
      setSubmitting(true);
      console.log('[DriverProfile] Set submitting to true');
      
      // Enhanced validation with detailed logging
      console.log('[DriverProfile] Starting validation...');
      
      // Basic required field validation
      if (!formData.name || formData.name.trim() === '') {
        console.error('[DriverProfile] Validation failed: Name is required');
        toast.show('Name is required', 'error');
        return;
      }
      
      // Validation for tank size
      if (formData.tankSize && parseInt(formData.tankSize) <= 0) {
        console.error('[DriverProfile] Validation failed: Tank size must be greater than 0');
        toast.show('Tank size must be greater than 0', 'error');
        return;
      }
      
      console.log('[DriverProfile] Basic validation passed');
      
      // API validation for years of experience
      if (formData.yearsExperience) {
        console.log('[DriverProfile] Validating years of experience:', formData.yearsExperience);
        setValidatingExperience(true);
        
        try {
          const validation = await validateExperience(parseInt(formData.yearsExperience));
          console.log('[DriverProfile] Experience validation result:', validation);
          
          if (!validation.valid) {
            console.error('[DriverProfile] Experience validation failed:', validation.message);
            toast.show(validation.message, 'error');
            return;
          } else if (validation.message) {
            console.log('[DriverProfile] Experience validation success:', validation.message);
            toast.show(validation.message, 'success');
          }
        } catch (validationError) {
          console.error('[DriverProfile] Experience validation error:', validationError);
          toast.show('Experience validation failed. Please try again.', 'error');
          return;
        } finally {
          setValidatingExperience(false);
        }
      }
      
      console.log('[DriverProfile] All validations passed, preparing update data...');
      
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        
        // Basic Driver Profile Fields
        truckType: formData.truckType,
        tankSize: formData.tankSize ? parseInt(formData.tankSize) : null,
        fuelTypePreference: formData.fuelTypePreference,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
        safetyCertifications: formData.safetyCertifications.trim(),

        vehicleMake: formData.vehicleMake.trim(),
        vehicleModel: formData.vehicleModel.trim(),
        vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
        fuelType: formData.fuelType === 'gasoline' ? 'gas' as FuelKind : 'diesel' as FuelKind,
        mpgRated: formData.mpgRated ? parseFloat(formData.mpgRated) : null,
        vin: formData.vin.trim(),
        plate: formData.plate.trim(),
        tankGallons: formData.tankGallons ? parseInt(formData.tankGallons) : null,
        gvwrLbs: formData.gvwrLbs ? parseInt(formData.gvwrLbs) : null,
        vehicleInfo: undefined,
        trailerMake: formData.trailerMake.trim(),
        trailerModel: formData.trailerModel.trim(),
        trailerYear: formData.trailerYear ? parseInt(formData.trailerYear) : null,
        trailerVin: formData.trailerVin.trim(),
        trailerPlate: formData.trailerPlate.trim(),
        trailerInsuranceCarrier: formData.trailerInsuranceCarrier.trim(),
        trailerPolicyNumber: formData.trailerPolicyNumber.trim(),
        trailerGvwrLbs: formData.trailerGvwrLbs ? parseInt(formData.trailerGvwrLbs) : null,
        trailerType: formData.trailerType as VehicleType,

        companyName: formData.companyName.trim(),
        mcNumber: formData.mcNumber.trim(),
        dotNumber: formData.dotNumber.trim(),
        insuranceCarrier: formData.insuranceCarrier.trim(),
        policyNumber: formData.policyNumber.trim(),
      };
      
      console.log('[DriverProfile] Update data prepared:', JSON.stringify(updateData, null, 2));
      
      if (!userId) {
        console.error('[DriverProfile] No user ID available for Firebase save');
        toast.show('User ID not available. Please sign in again.', 'error');
        return;
      }
      
      // Prepare data for Firebase
      const firebaseData = {
        userId: userId,
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        
        // Basic Driver Profile Fields
        truckType: formData.truckType,
        tankSize: formData.tankSize ? parseInt(formData.tankSize) : undefined,
        fuelTypePreference: formData.fuelTypePreference,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : undefined,
        safetyCertifications: formData.safetyCertifications.trim(),
        
        // Vehicle Information
        vehicleMake: formData.vehicleMake.trim(),
        vehicleModel: formData.vehicleModel.trim(),
        vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
        fuelType: formData.fuelType,
        mpgRated: formData.mpgRated ? parseFloat(formData.mpgRated) : undefined,
        vin: formData.vin.trim(),
        plate: formData.plate.trim(),
        tankGallons: formData.tankGallons ? parseInt(formData.tankGallons) : undefined,
        gvwrLbs: formData.gvwrLbs ? parseInt(formData.gvwrLbs) : undefined,
        
        // Trailer Information
        trailerMake: formData.trailerMake.trim(),
        trailerModel: formData.trailerModel.trim(),
        trailerYear: formData.trailerYear ? parseInt(formData.trailerYear) : undefined,
        trailerVin: formData.trailerVin.trim(),
        trailerPlate: formData.trailerPlate.trim(),
        trailerInsuranceCarrier: formData.trailerInsuranceCarrier.trim(),
        trailerPolicyNumber: formData.trailerPolicyNumber.trim(),
        trailerGvwrLbs: formData.trailerGvwrLbs ? parseInt(formData.trailerGvwrLbs) : undefined,
        trailerType: formData.trailerType,
        
        // Company & Insurance
        companyName: formData.companyName.trim(),
        mcNumber: formData.mcNumber.trim(),
        dotNumber: formData.dotNumber.trim(),
        insuranceCarrier: formData.insuranceCarrier.trim(),
        policyNumber: formData.policyNumber.trim(),
        
        // Additional fields
        role: 'driver',
        isActive: true,
        balance: (user as any)?.wallet?.balance || 0,
      };
      
      console.log('[DriverProfile] Prepared Firebase data:', JSON.stringify(firebaseData, null, 2));

// Strip empties so we never wipe fields with "" or null, but keep required fields
const compact = Object.fromEntries(
  Object.entries(firebaseData).filter(
    ([key, v]) => {
      // Always keep required fields even if empty
      if (key === 'userId' || key === 'fullName' || key === 'email') {
        return true;
      }
      // Filter out empty optional fields
      return v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');
    }
  )
);

// Ensure required fields are present with fallbacks
const finalData: Parameters<typeof saveDriverProfile>[0] = {
  ...compact,
  userId: userId,
  fullName: formData.name.trim() || 'Driver',
  email: formData.email.trim() || user?.email || '',
};

try {
  console.log('[DriverProfile] Saving to Firebase...');
  const firebaseResult = await saveDriverProfile(finalData);

        console.log('[DriverProfile] Firebase save result:', firebaseResult);

        
        // Also update cached profile for offline support
        console.log('[DriverProfile] Updating cached profile...');
        
        await updateCachedProfile(updateData);
        
        const newMpg = formData.mpgRated ? parseFloat(formData.mpgRated) : undefined;
        if (newMpg) {
          await patchAuthCache({
            mpgRated: newMpg,
            fuelProfile: { averageMpg: newMpg },
          });
        }

        console.log('[DriverProfile] ✅ Profile saved successfully to both Firebase and local cache');
        toast.show('✅ Profile saved successfully! All driver information updated and synced to cloud.', 'success');
        
      } catch (firebaseError: any) {
        console.warn('[DriverProfile] Firebase save failed, falling back to local cache only:', firebaseError);
        
        // Fallback to local cache only
        try {
          await updateCachedProfile(updateData);
          console.log('[DriverProfile] ✅ Profile saved to local cache (Firebase unavailable)');
          toast.show('✅ Profile saved locally! Will sync to cloud when connection is restored.', 'success');
        } catch (cacheError: any) {
          console.error('[DriverProfile] Both Firebase and cache save failed:', cacheError);
          throw new Error('Failed to save profile data');
        }
      }
      
    } catch (error: any) {
      console.error('[DriverProfile] ❌ Profile save error:', error);
      console.error('[DriverProfile] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      
      // Provide more specific error messages
      let errorMessage = 'Save failed. Please try again.';
      if (error?.message?.includes('network')) {
        errorMessage = 'Network error. Your changes are saved locally and will sync when online.';
      } else if (error?.message?.includes('permission')) {
        errorMessage = 'Permission error. Please check your account settings.';
      } else if (error?.message?.includes('validation')) {
        errorMessage = 'Validation error. Please check your input and try again.';
      }
      
      toast.show(errorMessage, 'error');
    } finally {
      console.log('[DriverProfile] Cleaning up save process...');
      setSubmitting(false);
      setValidatingExperience(false);
      console.log('[DriverProfile] Save process completed');
    }
  }, [formData, updateCachedProfile, validateExperience, toast, submitting, user, userId, patchAuthCache]);

  const onSubmitForVerification = useCallback(async () => {
    await onSave();
    toast.show('Profile submitted for verification', 'success');
  }, [onSave, toast]);

   // 👇 Add this here
   const onSyncMpgToAnalytics = useCallback(async () => {
   const mpg = formData?.mpgRated ? parseFloat(formData.mpgRated) : NaN;
  if (!userId) {
    toast.show('Not signed in. Please sign in again.', 'error');
    return;
  }
  await updateCachedProfile({
  mpgRated: mpg,
  fuelProfile: {
    ...((user as any)?.fuelProfile || {}),
    averageMpg: mpg,
  },
});
await patchAuthCache({
  mpgRated: mpg,
  fuelProfile: { averageMpg: mpg },
});

  if (!mpg || Number.isNaN(mpg)) {
    toast.show('Enter a valid MPG first.', 'error');
    return;
  }

  try {
    // 1) Read current driver doc so we can merge
    const existing = await getDriverProfile(userId).catch(() => null);
    const base = (existing && existing.success && existing.data) ? existing.data : {};

    // 2) Only the fields we want to change
    const changes = {
      mpgRated: mpg,
      fuelProfile: {
        ...(base?.fuelProfile || {}),
        averageMpg: mpg,
      },
    };

    // 3) Save MERGED object (spread base first, then overrides)
    await saveDriverProfile({
      ...base,                            // everything already in Firestore
      ...changes,                         // your MPG updates
      userId,                             // keep id
      fullName: base.fullName || (formData.name?.trim() || 'Driver'),
      email: base.email || (formData.email?.trim() || user?.email || ''),
    } as any);

    // 4) Update local cache so UI reflects immediately
    await updateCachedProfile(changes);

    toast.show(`✅ Synced MPG to ${mpg.toFixed(1)} for Analytics.`, 'success');
  } catch (e) {
    console.warn('[DriverProfile] MPG sync failed', e);
    toast.show('Sync failed. Please try again.', 'error');
  }
}, [formData?.mpgRated, formData?.email, formData?.name, user, userId, updateCachedProfile, toast, patchAuthCache]);
// 👆 End of new function

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
        {/* Mini Profile Header (read-only) */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <User size={18} color={theme.colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{(formData?.name?.trim()) || user?.name || (user?.email ? user.email.split("@")[0] : "Driver")}</Text>
            <Text style={styles.profileEmail}>{(formData?.email?.trim()) || user?.email || ""}</Text>
          </View>
        </View>

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

        {/* Basic Driver Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={20} color={theme.colors.secondary} />
            <Text style={styles.sectionTitle}>Driver Profile</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Truck Type</Text>
            <View style={styles.segmentedControl}>
              {['cargo-van', 'truck', 'box-truck', 'flatbed', 'reefer'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentButton,
                    formData.truckType === type && styles.segmentButtonActive
                  ]}
                  onPress={() => updateField('truckType', type)}
                  testID={`truck-type-${type}`}
                >
                  <Text style={[
                    styles.segmentButtonText,
                    formData.truckType === type && styles.segmentButtonTextActive
                  ]}>
                    {type.replace('-', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tank Size (gallons)</Text>
              <TextInput
                style={styles.input}
                value={formData.tankSize}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  if (numericValue === '' || (parseInt(numericValue) > 0 && parseInt(numericValue) <= 1000)) {
                    updateField('tankSize', numericValue);
                  }
                }}
                placeholder="100"
                keyboardType="numeric"
                testID="tank-size-input"
              />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Fuel Type</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    formData.fuelTypePreference === 'diesel' && styles.segmentButtonActive
                  ]}
                  onPress={() => updateField('fuelTypePreference', 'diesel')}
                  testID="fuel-type-diesel"
                >
                  <Text style={[
                    styles.segmentButtonText,
                    formData.fuelTypePreference === 'diesel' && styles.segmentButtonTextActive
                  ]}>DIESEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    formData.fuelTypePreference === 'gasoline' && styles.segmentButtonActive
                  ]}
                  onPress={() => updateField('fuelTypePreference', 'gasoline')}
                  testID="fuel-type-gasoline"
                >
                  <Text style={[
                    styles.segmentButtonText,
                    formData.fuelTypePreference === 'gasoline' && styles.segmentButtonTextActive
                  ]}>GAS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              value={formData.yearsExperience}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, '');
                if (numericValue === '' || (parseInt(numericValue) >= 0 && parseInt(numericValue) <= 50)) {
                  updateField('yearsExperience', numericValue);
                }
              }}
              placeholder="5"
              keyboardType="numeric"
              testID="years-experience-input"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Safety Certifications</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={formData.safetyCertifications}
              onChangeText={(text) => updateField('safetyCertifications', text)}
              placeholder="CDL Class A, HAZMAT, TWIC, etc."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              testID="safety-certs-input"
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
              Status: {(user as Driver)?.verificationStatus ? String((user as Driver).verificationStatus).toUpperCase() : 'UNVERIFIED'}
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
              {validatingExperience ? 'Validating...' : submitting ? 'Saving...' : 'Save Profile'}
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
          
          {/* 👇 NEW: Sync MPG button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={onSyncMpgToAnalytics}
            disabled={submitting}
            testID="sync-mpg-btn"
          >
            <Text style={styles.submitButtonText}>Sync MPG to Analytics</Text>
          </TouchableOpacity>
        </View>
        
        {/* Debug Info - Always show for driver profile persistence verification */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>🔧 Driver Profile Status:</Text>
          <Text style={styles.debugText}>User ID: {userId || 'None'}</Text>
          <Text style={styles.debugText}>User Role: {user?.role || 'None'}</Text>
          <Text style={styles.debugText}>Submitting: {submitting ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Validating: {validatingExperience ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Form Name: {formData.name || 'Empty'}</Text>
          <Text style={styles.debugText}>Form Email: {formData.email || 'Empty'}</Text>
          <Text style={styles.debugText}>Form MPG: {formData.mpgRated || 'Empty'}</Text>
          <Text style={styles.debugText}>Profile Loaded: {user ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Has Fuel Profile: {user && (user as any).fuelProfile ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Current MPG: {user && (user as any).fuelProfile?.averageMpg || (user as any).mpgRated || 'Not set'}</Text>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  profileName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  profileEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
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
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.white,
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
  debugInfo: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  debugText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontFamily: 'monospace',
  },
  profileInfo: {
    flex: 1,
  },
});
