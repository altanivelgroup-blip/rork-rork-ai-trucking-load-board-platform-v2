import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react-native';
import { PhotoUploader, useCanPublish } from '@/components/PhotoUploader';
import { theme } from '@/constants/theme';
import { useToast } from '@/components/Toast';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { LOADS_COLLECTION } from '@/lib/loadSchema';

interface LoadData {
  id: string;
  title: string;
  origin: string;
  destination: string;
  vehicleType: string;
  rate: number;
  photos: string[];
  primaryPhoto: string;
  status: string;
  pickupDate?: any;
  deliveryDate?: any;
  description?: string;
}

export default function LoadEditScreen() {
  const { load_id } = useLocalSearchParams<{ load_id: string }>();
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadData, setLoadData] = useState<LoadData | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>('');
  const [uploadsInProgress, setUploadsInProgress] = useState<number>(0);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');
  
  const canPublish = useCanPublish('load', photos, 2) && uploadsInProgress === 0;
  
  // Load existing load data function
  const loadLoadData = useCallback(async () => {
    try {
      console.log('[LoadEdit] Loading load data for:', load_id);
      const { db } = getFirebase();
      const docRef = doc(db, LOADS_COLLECTION, load_id!);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as LoadData;
        setLoadData({ ...data, id: load_id! });
        
        // Populate form fields
        setTitle(data.title || '');
        setOrigin(data.origin || '');
        setDestination(data.destination || '');
        setVehicleType(data.vehicleType || '');
        setRate(data.rate?.toString() || '');
        setDescription(data.description || '');
        
        // Set photo state
        setPhotos(data.photos || []);
        setPrimaryPhoto(data.primaryPhoto || '');
        
        console.log('[LoadEdit] Loaded load data:', {
          title: data.title,
          photos: data.photos?.length || 0,
          primaryPhoto: data.primaryPhoto
        });
      } else {
        toast.show('Load not found', 'error');
        router.back();
      }
    } catch (error) {
      console.error('[LoadEdit] Error loading load:', error);
      toast.show('Failed to load load data', 'error');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [load_id, toast, router]);
  
  // Load existing load data
  useEffect(() => {
    if (!load_id) {
      toast.show('Load ID is required', 'error');
      router.back();
      return;
    }
    
    loadLoadData();
  }, [load_id, loadLoadData]);
  
  // Handle photo changes from PhotoUploader
  const handlePhotosChange = (newPhotos: string[], newPrimaryPhoto: string, newUploadsInProgress: number) => {
    console.log('[LoadEdit] Photos updated:', { 
      count: newPhotos.length, 
      primary: newPrimaryPhoto, 
      uploadsInProgress: newUploadsInProgress 
    });
    setPhotos(newPhotos);
    setPrimaryPhoto(newPrimaryPhoto);
    setUploadsInProgress(newUploadsInProgress);
  };
  
  // Save load data
  const handleSave = async () => {
    if (uploadsInProgress > 0) {
      toast.show('Please wait, uploading photos...', 'warning');
      return;
    }
    
    if (!canPublish) {
      Alert.alert(
        'Cannot Save',
        'You need at least 2 photos before you can save this load.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!title.trim() || !origin.trim() || !destination.trim()) {
      toast.show('Please fill in all required fields', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      await ensureFirebaseAuth();
      const { db } = getFirebase();
      const docRef = doc(db, LOADS_COLLECTION, load_id!);
      
      const updateData = {
        title: title.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        vehicleType: vehicleType.trim(),
        rate: parseFloat(rate) || 0,
        description: description.trim(),
        photos,
        primaryPhoto,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(docRef, updateData);
      
      console.log('[LoadEdit] Load updated successfully');
      toast.show('Load saved successfully', 'success');
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
      
    } catch (error) {
      console.error('[LoadEdit] Error saving load:', error);
      toast.show('Failed to save load', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading load...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!loadData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <AlertCircle color={theme.colors.danger} size={48} />
          <Text style={styles.errorText}>Load not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft color={theme.colors.dark} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Load</Text>
        <TouchableOpacity 
          style={[styles.headerButton, styles.saveButton, !canPublish && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving || !canPublish}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Save color={canPublish ? theme.colors.white : theme.colors.gray} size={20} />
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter load title"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Origin *</Text>
            <TextInput
              style={styles.input}
              value={origin}
              onChangeText={setOrigin}
              placeholder="Pickup location"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination *</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Delivery location"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Vehicle Type</Text>
              <TextInput
                style={styles.input}
                value={vehicleType}
                onChangeText={setVehicleType}
                placeholder="e.g., Box Truck"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
            
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Rate ($)</Text>
              <TextInput
                style={styles.input}
                value={rate}
                onChangeText={setRate}
                placeholder="0.00"
                placeholderTextColor={theme.colors.gray}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Additional details about the load..."
              placeholderTextColor={theme.colors.gray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
        
        {/* Photo Upload Section */}
        <View style={styles.section}>
          <PhotoUploader
            entityType="load"
            entityId={load_id!}
            minPhotos={2}
            maxPhotos={20}
            onChange={handlePhotosChange}
          />
        </View>
        
        {/* Save Button (Mobile) */}
        <View style={styles.mobileActions}>
          <TouchableOpacity
            style={[styles.saveButtonMobile, !canPublish && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving || !canPublish}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Save color={canPublish ? theme.colors.white : theme.colors.gray} size={20} />
                <Text style={[styles.saveButtonText, !canPublish && styles.disabledText]}>
                  Save Load
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          {uploadsInProgress > 0 && (
            <View style={styles.warningContainer}>
              <ActivityIndicator color={theme.colors.primary} size={16} />
              <Text style={styles.warningText}>
                Uploading {uploadsInProgress} photo{uploadsInProgress > 1 ? 's' : ''}... Please wait.
              </Text>
            </View>
          )}
          
          {!canPublish && uploadsInProgress === 0 && (
            <View style={styles.warningContainer}>
              <AlertCircle color={theme.colors.warning} size={16} />
              <Text style={styles.warningText}>
                Add at least 2 photos to save this load
              </Text>
            </View>
          )}
        </View>
        
        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.danger,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  headerButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: theme.colors.lightGray,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  flex1: {
    flex: 1,
  },
  mobileActions: {
    padding: theme.spacing.md,
  },
  saveButtonMobile: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  disabledText: {
    color: theme.colors.gray,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  warningText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});