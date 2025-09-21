import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import TypeSubtypeSelector from '@/components/TypeSubtypeSelector';
import { TRUCK_SUBTYPES, TRAILER_SUBTYPES, AnySubtype } from '@/constants/vehicleOptions';

import { PhotoUploader } from '@/components/PhotoUploader';
import { useToast } from '@/components/Toast';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { VEHICLES_COLLECTION } from '@/lib/loadSchema';
import { Save, AlertCircle, LogIn } from 'lucide-react-native';
import uuid from 'react-native-uuid';

interface VehicleData {
  id: string;
  name: string;
  year: string;
  make: string;
  model: string;
  type: 'truck' | 'trailer';
  subtype: string;
  vin?: string;
  licensePlate?: string;
  mpg?: string;
  photos: string[];
  primaryPhoto: string;
  status: 'draft' | 'published';
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface VehicleEditState {
  vehicle: VehicleData;
  photos: string[];
  primaryPhoto: string;
  uploadsInProgress: number;
  loading: boolean;
  saving: boolean;
}


export default function VehicleEditScreen() {
  const router = useRouter();
  const { vehicle_id } = useLocalSearchParams<{ vehicle_id: string }>();
  const toast = useToast();
  
  const [state, setState] = useState<VehicleEditState>({
    vehicle: {
      id: vehicle_id || (uuid.v4() as string),
      name: '',
      year: '',
      make: '',
      model: '',
      type: 'truck',
      subtype: 'Hotshot',
      vin: '',
      licensePlate: '',
      photos: [],
      primaryPhoto: '',
      status: 'draft',
      mpg: '',
    },
    photos: [],
    primaryPhoto: '',
    uploadsInProgress: 0,
    loading: !!vehicle_id,
    saving: false,
  });
  
  const [authError, setAuthError] = useState<string | null>(null);

  // Load existing vehicle data
  const loadVehicle = useCallback(async () => {
    if (!vehicle_id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      console.log('[VehicleEdit] Loading vehicle:', vehicle_id);
      
      // CRITICAL FIX: Enhanced authentication check with fallback
      const { auth } = getFirebase();
      
      if (!auth?.currentUser?.uid) {
        console.warn('[VehicleEdit] No authenticated user - attempting to ensure auth...');
        
        // Try to ensure authentication
        const authSuccess = await ensureFirebaseAuth();
        if (!authSuccess || !auth?.currentUser?.uid) {
          console.error('[VehicleEdit] Authentication failed - showing sign in option');
          setAuthError('Please sign in to access vehicle data.');
          setState(prev => ({ ...prev, loading: false }));
          return;
        }
      }
      
      console.log('[VehicleEdit] ✅ Authentication verified - User ID:', auth.currentUser.uid);
      
      const { db } = getFirebase();
      const docRef = doc(db, VEHICLES_COLLECTION, vehicle_id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as VehicleData;
        console.log('[VehicleEdit] Vehicle loaded successfully:', {
          id: vehicle_id,
          name: data.name,
          status: data.status,
          photos: data.photos?.length || 0
        });
        setState(prev => ({
          ...prev,
          vehicle: {
            ...data,
            id: vehicle_id,
          },
          photos: data.photos || [],
          primaryPhoto: data.primaryPhoto || '',
          loading: false,
        }));
      } else {
        console.warn('[VehicleEdit] Vehicle document not found:', vehicle_id);
        setState(prev => ({ ...prev, loading: false }));
        toast.show('Vehicle not found', 'error');
      }
    } catch (error: any) {
      console.error('[VehicleEdit] Error loading vehicle:', error);
      
      // CRITICAL FIX: Enhanced error handling with user-friendly messages
      let errorMessage = 'Failed to load vehicle data';
      
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please sign in and try again.';
        setAuthError(errorMessage);
      } else if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
        errorMessage = 'Authentication expired. Please sign in again.';
        setAuthError(errorMessage);
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      console.error('[VehicleEdit] User-friendly error:', errorMessage);
      toast.show(errorMessage, 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [vehicle_id, toast]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  const isAddMode = useMemo(() => !vehicle_id, [vehicle_id]);

  const handleTypeChange = useCallback((t: 'truck' | 'trailer') => {
    setState(prev => {
      const defaultSubtype: AnySubtype = t === 'truck' ? TRUCK_SUBTYPES[0] : TRAILER_SUBTYPES[0];
      return {
        ...prev,
        vehicle: {
          ...prev.vehicle,
          type: t,
          subtype: String(defaultSubtype),
        },
      };
    });
  }, []);

  const handleSubtypeChange = useCallback((s: AnySubtype) => {
    setState(prev => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        subtype: String(s),
      },
    }));
  }, []);

  // Handle photo uploader changes
  const handlePhotoChange = useCallback((photos: string[], primaryPhoto: string, uploadsInProgress: number) => {
    console.log('[VehicleEdit] Photo change:', { photos: photos.length, primaryPhoto: !!primaryPhoto, uploadsInProgress });
    setState(prev => ({
      ...prev,
      photos,
      primaryPhoto,
      uploadsInProgress,
      vehicle: {
        ...prev.vehicle,
        photos,
        primaryPhoto,
      },
    }));
  }, []);

  // Update vehicle field
  const updateField = useCallback((field: keyof VehicleData, value: string) => {
    setState(prev => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        [field]: value,
      },
    }));
  }, []);

  // Validate vehicle data
  const validateVehicle = useCallback(() => {
    const { vehicle, photos, uploadsInProgress } = state;
    
    if (!vehicle.name.trim()) {
      return 'Vehicle name is required';
    }
    
    if (!vehicle.year.trim()) {
      return 'Year is required';
    }
    
    if (!vehicle.make.trim()) {
      return 'Make is required';
    }
    
    if (!vehicle.model.trim()) {
      return 'Model is required';
    }
    
    if (uploadsInProgress > 0) {
      return 'Please wait for photos to finish uploading';
    }
    
    if (photos.length < 5) {
      return 'At least 5 photos are required to publish';
    }
    
    return null;
  }, [state]);

  // Save vehicle
  const handleSave = useCallback(async (publish = false) => {
    try {
      // CRITICAL FIX: Enhanced authentication check with fallback
      const { auth } = getFirebase();
      
      if (!auth?.currentUser?.uid) {
        console.warn('[VehicleEdit] No authenticated user - attempting to ensure auth...');
        
        // Try to ensure authentication
        const authSuccess = await ensureFirebaseAuth();
        if (!authSuccess || !auth?.currentUser?.uid) {
          setAuthError('Please sign in to save vehicle.');
          toast.show('Please sign in to save vehicle.', 'error');
          return;
        }
      }
      
      console.log('[VehicleEdit] ✅ Authentication verified for save - User ID:', auth.currentUser.uid);
      
      const validationError = validateVehicle();
      if (validationError) {
        toast.show(validationError, 'error');
        return;
      }
      
      setState(prev => ({ ...prev, saving: true }));
      
      const { db } = getFirebase();
      const currentUser = auth.currentUser; // We already verified auth above
      
      // CRITICAL FIX: Force fresh token to prevent permission errors
      try {
        console.log('[VehicleEdit] 🔑 Refreshing authentication token...');
        const freshToken = await currentUser.getIdToken(true);
        console.log('[VehicleEdit] ✅ Fresh token obtained:', !!freshToken);
      } catch (tokenError) {
        console.warn('[VehicleEdit] ⚠️ Token refresh failed, continuing anyway:', tokenError);
      }
      
      const vehicleData: VehicleData = {
        ...state.vehicle,
        status: publish ? 'published' : 'draft',
        photos: state.photos,
        primaryPhoto: state.primaryPhoto,
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid, // Add user ownership
        ...(vehicle_id ? {} : { createdAt: serverTimestamp() }),
      };
      
      console.log('[VehicleEdit] Saving vehicle:', vehicleData.id, {
        status: vehicleData.status,
        photos: vehicleData.photos.length,
        primaryPhoto: !!vehicleData.primaryPhoto,
        createdBy: vehicleData.createdBy,
      });
      
      const docRef = doc(db, VEHICLES_COLLECTION, vehicleData.id);
      await setDoc(docRef, vehicleData, { merge: true });
      
      console.log('[VehicleEdit] Vehicle saved successfully');
      toast.show(
        publish ? 'Vehicle published successfully!' : 'Vehicle saved as draft',
        'success'
      );
      
      // Navigate back
      router.back();
      
    } catch (error: any) {
      console.error('[VehicleEdit] Save error:', error);
      
      // CRITICAL FIX: Enhanced error handling with user-friendly messages
      let errorMessage = 'Failed to save vehicle';
      
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please sign in and try again.';
        setAuthError(errorMessage);
      } else if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
        errorMessage = 'Authentication expired. Please sign in again.';
        setAuthError(errorMessage);
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = `Save failed: ${error.message}`;
      }
      
      console.error('[VehicleEdit] User-friendly save error:', errorMessage);
      toast.show(errorMessage, 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [state, validateVehicle, toast, router, vehicle_id]);

  // Handle publish
  const handlePublish = useCallback(() => {
    const validationError = validateVehicle();
    if (validationError) {
      toast.show(validationError, 'error');
      return;
    }
    
    Alert.alert(
      'Publish Vehicle',
      'Are you sure you want to publish this vehicle? It will be visible to all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => handleSave(true),
        },
      ]
    );
  }, [validateVehicle, toast, handleSave]);

  const canPublish = state.photos.length >= 5 && state.uploadsInProgress === 0 && !state.saving;
  const canSave = !state.saving;
  


  if (state.loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Loading Vehicle...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading vehicle data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen 
        options={{ 
          title: vehicle_id ? 'Edit Vehicle' : 'Add Vehicle',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.headerButton, !canSave && styles.headerButtonDisabled]}
                onPress={() => handleSave(false)}
                disabled={!canSave}
              >
                <Text style={[styles.headerButtonText, !canSave && styles.headerButtonTextDisabled]}>
                  Save Draft
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.headerButton, styles.publishButton, !canPublish && styles.headerButtonDisabled]}
                onPress={handlePublish}
                disabled={!canPublish}
              >
                {state.saving ? (
                  <ActivityIndicator size="small" color={theme.colors.white} testID="vehicle-saving-indicator" />
                ) : (
                  <>
                    <Save size={16} color={theme.colors.white} />
                    <Text style={[styles.headerButtonText, styles.publishButtonText]}>
                      Publish
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Vehicle Name *</Text>
            <TextInput
              style={styles.input}
              value={state.vehicle.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="e.g., Main Hotshot, City Runner"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Year *</Text>
              <TextInput
                style={styles.input}
                value={state.vehicle.year}
                onChangeText={(value) => updateField('year', value)}
                placeholder="2020"
                placeholderTextColor={theme.colors.gray}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            
            <View style={[styles.field, { flex: 2, marginLeft: theme.spacing.sm }]}>
              <Text style={styles.label}>Make *</Text>
              <TextInput
                style={styles.input}
                value={state.vehicle.make}
                onChangeText={(value) => updateField('make', value)}
                placeholder="Ford, Chevrolet, etc."
                placeholderTextColor={theme.colors.gray}
              />
            </View>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.label}>Model *</Text>
            <TextInput
              style={styles.input}
              value={state.vehicle.model}
              onChangeText={(value) => updateField('model', value)}
              placeholder="F-350, Silverado, etc."
              placeholderTextColor={theme.colors.gray}
            />
          </View>

          {isAddMode && (
            <View style={styles.typeSelectorContainer}>
              <TypeSubtypeSelector
                type={state.vehicle.type}
                subtype={state.vehicle.subtype}
                onTypeChange={handleTypeChange}
                onSubtypeChange={handleSubtypeChange}
                testIDPrefix="add-vehicle"
              />
            </View>
          )}
        </View>
        
        {/* Optional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>VIN</Text>
            <TextInput
              style={styles.input}
              value={state.vehicle.vin}
              onChangeText={(value) => updateField('vin', value)}
              placeholder="Vehicle Identification Number"
              placeholderTextColor={theme.colors.gray}
              autoCapitalize="characters"
              testID="vehicle-vin-input"
            />
          </View>
          
          <View style={styles.field}>
            <Text style={styles.label}>License Plate</Text>
            <TextInput
              style={styles.input}
              value={state.vehicle.licensePlate}
              onChangeText={(value) => updateField('licensePlate', value)}
              placeholder="ABC-1234"
              placeholderTextColor={theme.colors.gray}
              autoCapitalize="characters"
              testID="vehicle-license-plate-input"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fuel Efficiency (MPG)</Text>
            <TextInput
              style={styles.input}
              value={state.vehicle.mpg ?? ''}
              onChangeText={(value) => updateField('mpg', value.replace(/[^0-9.]/g, ''))}
              placeholder="e.g., 10.5"
              placeholderTextColor={theme.colors.gray}
              keyboardType="decimal-pad"
              maxLength={5}
              testID="vehicle-mpg-input"
            />
          </View>
        </View>
        
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSubtitle}>
            Add at least 5 high-quality photos of your vehicle. The first photo will be used as the cover image.
          </Text>
          
          <PhotoUploader
            entityType="vehicle"
            entityId={state.vehicle.id}
            minPhotos={5}
            maxPhotos={20}
            onChange={handlePhotoChange}
          />
        </View>
        
        {/* Authentication Error */}
        {authError && (
          <View style={styles.authErrorContainer}>
            <AlertCircle color={theme.colors.danger} size={20} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.authErrorText}>{authError}</Text>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  console.log('[VehicleEdit] Navigating to sign in');
                  router.push('/signin');
                }}
                testID="vehicle-edit-signin"
              >
                <LogIn size={16} color={theme.colors.white} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Status Information */}
        {!canPublish && !authError && (
          <View style={styles.statusContainer}>
            <AlertCircle color={theme.colors.warning} size={20} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Requirements for Publishing</Text>
              <Text style={styles.statusText}>
                • Complete all required fields{"\n"}
                • Upload at least 5 photos{"\n"}
                • Wait for all photos to finish uploading
              </Text>
            </View>
          </View>
        )}
        

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.gray,
    gap: theme.spacing.xs,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  headerButtonTextDisabled: {
    color: theme.colors.gray,
  },
  publishButton: {
    backgroundColor: theme.colors.primary,
  },
  publishButtonText: {
    color: theme.colors.white,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  field: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    backgroundColor: theme.colors.white,
  },
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
    fontWeight: '500' as const,
    color: theme.colors.gray,
  },
  segmentButtonTextActive: {
    color: theme.colors.dark,
    fontWeight: '600' as const,
  },
  subtypeScroll: {
    maxHeight: 40,
  },
  subtypeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
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
  subtypeButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500' as const,
  },
  subtypeButtonTextActive: {
    color: theme.colors.white,
    fontWeight: '600' as const,
  },
  statusContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    lineHeight: 18,
  },
  typeSelectorContainer: {
    marginTop: theme.spacing.sm,
  },
  authErrorContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.danger + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  authErrorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    fontWeight: '500' as const,
    flex: 1,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  signInButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
});