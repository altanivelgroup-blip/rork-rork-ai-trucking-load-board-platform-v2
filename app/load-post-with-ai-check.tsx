import React, { useState, useCallback } from 'react';
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
import { Stack, router } from 'expo-router';
import { Plus, Brain, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useDuplicateChecker } from '@/hooks/useDuplicateChecker';
import LoadDuplicateAlert from '@/components/LoadDuplicateAlert';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';

interface LoadFormData {
  title: string;
  origin: string;
  destination: string;
  pickupDate: string;
  deliveryDate: string;
  rate: string;
  equipmentType: string;
  description: string;
}

export default function LoadPostWithAICheckScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const { checkSingleLoad, isChecking, lastResult } = useDuplicateChecker();
  
  const [formData, setFormData] = useState<LoadFormData>({
    title: '',
    origin: '',
    destination: '',
    pickupDate: '',
    deliveryDate: '',
    rate: '',
    equipmentType: 'truck',
    description: '',
  });
  
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [duplicateCheckComplete, setDuplicateCheckComplete] = useState(false);

  const updateField = useCallback((field: keyof LoadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset duplicate check when form changes
    if (duplicateCheckComplete) {
      setDuplicateCheckComplete(false);
      setShowDuplicateAlert(false);
    }
  }, [duplicateCheckComplete]);

  const validateForm = useCallback((): boolean => {
    const required = ['title', 'origin', 'destination', 'rate'];
    const missing = required.filter(field => !formData[field as keyof LoadFormData].trim());
    
    if (missing.length > 0) {
      toast.show(`Please fill in: ${missing.join(', ')}`, 'error');
      return false;
    }
    
    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate <= 0) {
      toast.show('Please enter a valid rate', 'error');
      return false;
    }
    
    return true;
  }, [formData, toast]);

  const runDuplicateCheck = useCallback(async () => {
    if (!validateForm()) return;

    const loadData = {
      title: formData.title,
      origin: formData.origin,
      destination: formData.destination,
      pickupDate: formData.pickupDate || undefined,
      deliveryDate: formData.deliveryDate || undefined,
      rate: parseFloat(formData.rate),
      equipmentType: formData.equipmentType,
    };

    const duplicates = await checkSingleLoad(loadData);
    
    setDuplicateCheckComplete(true);
    
    if (duplicates.length > 0) {
      setShowDuplicateAlert(true);
    } else {
      toast.show('✅ No duplicates found! Ready to post.', 'success');
    }
  }, [formData, validateForm, checkSingleLoad, toast]);

  const handleDuplicateAction = useCallback((action: 'proceed' | 'cancel' | 'merge' | 'replace') => {
    setShowDuplicateAlert(false);
    
    switch (action) {
      case 'proceed':
        postLoad();
        break;
      case 'cancel':
        // Just close the alert
        break;
      case 'replace':
        // TODO: Implement replace existing load
        toast.show('Replace functionality coming soon', 'error');
        break;
      case 'merge':
        // TODO: Implement merge loads
        toast.show('Merge functionality coming soon', 'error');
        break;
    }
  }, []);

  const postLoad = useCallback(async () => {
    if (!user) {
      toast.show('Please sign in to post loads', 'error');
      return;
    }

    try {
      setIsPosting(true);
      
      // TODO: Implement actual load posting to Firebase
      // This would integrate with your existing load posting logic
      
      // Simulate posting delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.show('Load posted successfully!', 'success');
      router.back();
      
    } catch (error) {
      console.error('Failed to post load:', error);
      toast.show('Failed to post load. Please try again.', 'error');
    } finally {
      setIsPosting(false);
    }
  }, [user, formData, toast]);

  const canCheckDuplicates = formData.title && formData.origin && formData.destination && formData.rate;
  const canPost = duplicateCheckComplete && !showDuplicateAlert;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Post Load with AI Check',
          headerLeft: () => <HeaderBack />,
        }}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Brain size={32} color={theme.colors.primary} />
          <Text style={styles.title}>AI-Powered Load Posting</Text>
          <Text style={styles.subtitle}>
            Post your load with intelligent duplicate detection to ensure clean, efficient load matching.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Load Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              placeholder="e.g., Furniture delivery LA to Phoenix"
              placeholderTextColor={theme.colors.gray}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Origin *</Text>
              <TextInput
                style={styles.input}
                value={formData.origin}
                onChangeText={(value) => updateField('origin', value)}
                placeholder="Los Angeles, CA"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
            
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Destination *</Text>
              <TextInput
                style={styles.input}
                value={formData.destination}
                onChangeText={(value) => updateField('destination', value)}
                placeholder="Phoenix, AZ"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Pickup Date</Text>
              <TextInput
                style={styles.input}
                value={formData.pickupDate}
                onChangeText={(value) => updateField('pickupDate', value)}
                placeholder="2024-01-15"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
            
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Delivery Date</Text>
              <TextInput
                style={styles.input}
                value={formData.deliveryDate}
                onChangeText={(value) => updateField('deliveryDate', value)}
                placeholder="2024-01-16"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Rate (USD) *</Text>
              <TextInput
                style={styles.input}
                value={formData.rate}
                onChangeText={(value) => updateField('rate', value)}
                placeholder="2800"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
            
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Equipment Type</Text>
              <TextInput
                style={styles.input}
                value={formData.equipmentType}
                onChangeText={(value) => updateField('equipmentType', value)}
                placeholder="truck"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              placeholder="Additional details about the load..."
              placeholderTextColor={theme.colors.gray}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Duplicate Alert */}
        {showDuplicateAlert && lastResult && (
          <LoadDuplicateAlert
            newLoad={{
              title: formData.title,
              origin: formData.origin,
              destination: formData.destination,
              pickupDate: formData.pickupDate,
              deliveryDate: formData.deliveryDate,
              rate: parseFloat(formData.rate),
              equipmentType: formData.equipmentType,
            }}
            onAction={handleDuplicateAction}
            style={styles.duplicateAlert}
          />
        )}

        {/* Success Message */}
        {duplicateCheckComplete && !showDuplicateAlert && (
          <View style={styles.successContainer}>
            <CheckCircle size={20} color={theme.colors.success} />
            <Text style={styles.successText}>
              ✅ AI analysis complete - no duplicates found!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {!duplicateCheckComplete ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canCheckDuplicates || isChecking) && styles.primaryButtonDisabled
            ]}
            onPress={runDuplicateCheck}
            disabled={!canCheckDuplicates || isChecking}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Brain size={20} color={theme.colors.white} />
            )}
            <Text style={styles.primaryButtonText}>
              {isChecking ? 'Checking for Duplicates...' : 'AI Duplicate Check'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setDuplicateCheckComplete(false);
                setShowDuplicateAlert(false);
              }}
            >
              <Text style={styles.secondaryButtonText}>Re-check</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.flexButton,
                (!canPost || isPosting) && styles.primaryButtonDisabled
              ]}
              onPress={postLoad}
              disabled={!canPost || isPosting}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Plus size={20} color={theme.colors.white} />
              )}
              <Text style={styles.primaryButtonText}>
                {isPosting ? 'Posting Load...' : 'Post Load'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfWidth: {
    flex: 1,
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
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    backgroundColor: theme.colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  duplicateAlert: {
    marginBottom: theme.spacing.md,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  successText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.success,
    flex: 1,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  flexButton: {
    flex: 1,
  },
});