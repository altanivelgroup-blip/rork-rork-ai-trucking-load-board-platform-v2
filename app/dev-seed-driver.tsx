import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { Truck, User, FileText, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTACHMENTS_KEY = 'doc_attachments_v1';
const ATTACHMENTS_META_KEY = 'doc_attachments_meta_v1';

interface Attachment {
  id: string;
  name: string;
  uri: string;
  type: string;
}

interface StoredAttachmentMeta {
  id: string;
  name: string;
  uri: string;
  type: string;
  sizeBytes?: number;
  createdAt: string;
  source: 'document' | 'image';
}

export default function DevSeedDriverScreen() {
  const router = useRouter();
  const { register, updateProfile } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState<boolean>(false);

  const createTestDriver = async () => {
    try {
      setCreating(true);
      
      // Step 1: Register the account
      await register('robertlv996@gmail.com', '123456', {
        name: 'Robert Light Haul Driver',
        phone: '(555) 123-4567',
      });
      
      // Step 2: Update with complete vehicle profile
      await updateProfile({
        vehicleMake: 'RAM',
        vehicleModel: '3500 DUALLY',
        vehicleYear: 2024,
        fuelType: 'diesel',
        mpgRated: 12,
        vin: '3C7WRTCL8RG123456',
        plate: 'TX456DEF',
        tankGallons: 50,
        gvwrLbs: 14000,
        // Trailer Information
        trailerMake: 'Great Dane',
        trailerModel: 'Flatbed 48ft',
        trailerYear: 2023,
        trailerVin: '1GRAA0628P0123456',
        trailerPlate: 'TX789TRL',
        trailerInsuranceCarrier: 'State Farm Commercial',
        trailerPolicyNumber: 'TRL-POL-456789',
        trailerGvwrLbs: 34000,
        trailerType: 'flatbed',
        // Company Info
        company: 'Light Haul Express LLC',
        companyName: 'Light Haul Express LLC',
        mcNumber: 'MC789012',
        dotNumber: 'DOT1234567',
        insuranceCarrier: 'State Farm Commercial',
        policyNumber: 'POL-LIGHT-456789',
        vehicleInfo: '2024 RAM 3500 DUALLY 3C7WRTCL8RG123456',
        trailerInfo: '2023 Great Dane Flatbed 48ft 1GRAA0628P0123456',
        verificationStatus: 'unverified',
        cdlNumber: 'CDL987654321',
        rating: 4.8,
        completedLoads: 23,
        isAvailable: true,
      });
      
      // Step 3: Create mock documents
      const mockAttachments: Attachment[] = [
        {
          id: 'cdl-front-123',
          name: 'CDL_Front.jpg',
          uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop',
          type: 'image/jpeg'
        },
        {
          id: 'cdl-back-456',
          name: 'CDL_Back.jpg', 
          uri: 'https://images.unsplash.com/photo-1554224154-26032fced8bd?w=400&h=250&fit=crop',
          type: 'image/jpeg'
        },
        {
          id: 'insurance-789',
          name: 'Insurance_COI.pdf',
          uri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          type: 'application/pdf'
        },
        {
          id: 'registration-012',
          name: 'Vehicle_Registration.jpg',
          uri: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=250&fit=crop',
          type: 'image/jpeg'
        }
      ];
      
      const mockMetas: StoredAttachmentMeta[] = mockAttachments.map(att => ({
        ...att,
        sizeBytes: 245760,
        createdAt: new Date().toISOString(),
        source: att.type.includes('image') ? 'image' : 'document'
      }));
      
      // Step 4: Save documents to AsyncStorage
      await AsyncStorage.multiSet([
        [ATTACHMENTS_KEY, JSON.stringify(mockAttachments)],
        [ATTACHMENTS_META_KEY, JSON.stringify(mockMetas)]
      ]);
      
      toast.show('Test driver account created successfully!', 'success');
      
      if (Platform.OS === 'web') {
        const confirmed = confirm('Success! Test driver account created:\n\nEmail: robertlv996@gmail.com\nPassword: 123456\n\nComplete profile with vehicle info and documents ready.\n\nGo to Dashboard?');
        if (confirmed) {
          router.replace('/(tabs)/dashboard');
        }
      } else {
        Alert.alert(
          'Success!', 
          'Test driver account created:\n\nEmail: robertlv996@gmail.com\nPassword: 123456\n\nComplete profile with vehicle info and documents ready.',
          [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }]
        );
      }
      
    } catch (error) {
      console.error('[dev-seed] Error creating test driver:', error);
      toast.show('Failed to create test driver', 'error');
      
      if (Platform.OS === 'web') {
        alert('Error: Failed to create test driver account');
      } else {
        Alert.alert('Error', 'Failed to create test driver account');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ title: 'Dev: Create Test Driver' }} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <User size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Create Complete Test Driver</Text>
          <Text style={styles.subtitle}>
            This will create a fully configured driver account for testing
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Account Details:</Text>
          <Text style={styles.infoText}>• Email: robertlv996@gmail.com</Text>
          <Text style={styles.infoText}>• Password: 123456</Text>
          <Text style={styles.infoText}>• Name: Robert Light Haul Driver</Text>
          <Text style={styles.infoText}>• Phone: (555) 123-4567</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Truck size={20} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>Vehicle Profile:</Text>
          </View>
          <Text style={styles.infoText}>• 2024 RAM 3500 DUALLY</Text>
          <Text style={styles.infoText}>• Diesel, 12 MPG, 50 gal tank</Text>
          <Text style={styles.infoText}>• VIN: 3C7WRTCL8RG123456</Text>
          <Text style={styles.infoText}>• Plate: TX456DEF</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Trailer Profile:</Text>
          <Text style={styles.infoText}>• 2023 Great Dane Flatbed 48ft</Text>
          <Text style={styles.infoText}>• GVWR: 34,000 lbs</Text>
          <Text style={styles.infoText}>• VIN: 1GRAA0628P0123456</Text>
          <Text style={styles.infoText}>• Plate: TX789TRL</Text>
          <Text style={styles.infoText}>• State Farm Commercial Insurance</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <FileText size={20} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>Company & Documents:</Text>
          </View>
          <Text style={styles.infoText}>• Light Haul Express LLC</Text>
          <Text style={styles.infoText}>• MC789012 / DOT1234567</Text>
          <Text style={styles.infoText}>• State Farm Commercial Insurance</Text>
          <Text style={styles.infoText}>• CDL, COI, Registration attached</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <CheckCircle size={20} color={theme.colors.success} />
            <Text style={styles.infoTitle}>Driver Stats:</Text>
          </View>
          <Text style={styles.infoText}>• 4.8★ rating, 23 completed loads</Text>
          <Text style={styles.infoText}>• Verified status</Text>
          <Text style={styles.infoText}>• Available for loads</Text>
        </View>

        <TouchableOpacity 
          style={[styles.createButton, creating && styles.createButtonDisabled]} 
          onPress={createTestDriver}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <User size={20} color={theme.colors.white} />
          )}
          <Text style={styles.createButtonText}>
            {creating ? 'Creating Account...' : 'Create Test Driver Account'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.warning}>
          ⚠ This is for development testing only. Use existing permission email or sign up with non-permission email.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginLeft: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginLeft: theme.spacing.sm,
  },
  warning: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontStyle: 'italic',
  },
});