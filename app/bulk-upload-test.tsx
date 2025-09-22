import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { normalizeCsvRow } from '@/utils/csvNormalizer';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

export default function BulkUploadTestScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const testNormalizer = async () => {
    try {
      addTestResult('🧪 Testing CSV normalizer...');
      
      if (!user?.id) {
        addTestResult('❌ No authenticated user');
        return;
      }

      // Test simple template data
      const simpleRow = {
        Origin: 'Dallas, TX 75201',
        Destination: 'Houston, TX 77001', 
        VehicleType: 'Flatbed',
        Weight: '45000',
        Price: '$2,400'
      };

      const normalizedSimple = normalizeCsvRow(simpleRow, user.id);
      addTestResult(`✅ Simple row normalized: ${normalizedSimple.title}`);
      addTestResult(`   Origin: ${normalizedSimple.origin.city}, ${normalizedSimple.origin.state}`);
      addTestResult(`   Rate: $${normalizedSimple.rate}`);

      // Test standard template data
      const standardRow = {
        title: 'Steel Transport',
        equipmentType: 'Flatbed',
        originCity: 'Chicago',
        originState: 'IL',
        originZip: '60601',
        destCity: 'Detroit', 
        destState: 'MI',
        destZip: '48201',
        pickupDate: '2025-09-25',
        deliveryDate: '2025-09-26',
        rate: '3200',
        contactName: 'John Smith',
        contactEmail: 'john@company.com',
        contactPhone: '555-0123'
      };

      const normalizedStandard = normalizeCsvRow(standardRow, user.id);
      addTestResult(`✅ Standard row normalized: ${normalizedStandard.title}`);
      addTestResult(`   Contact: ${normalizedStandard.contactName} (${normalizedStandard.contactEmail})`);
      addTestResult(`   Dates: ${normalizedStandard.pickupDate?.toDate().toDateString()} → ${normalizedStandard.deliveryDate?.toDate().toDateString()}`);

      addTestResult('✅ Normalizer test completed successfully');
      toast.show('Normalizer test passed', 'success');

    } catch (error: any) {
      addTestResult(`❌ Normalizer test failed: ${error.message}`);
      toast.show('Normalizer test failed', 'error');
    }
  };

  const testFirestoreWrite = async () => {
    try {
      addTestResult('🔥 Testing Firestore write...');
      
      if (!user?.id) {
        addTestResult('❌ No authenticated user');
        return;
      }

      const testRow = {
        title: 'Test Load',
        equipmentType: 'Dry Van',
        originCity: 'Test City',
        originState: 'TX',
        destCity: 'Test Destination',
        destState: 'CA',
        rate: '1500',
        pickupDate: '2025-09-25',
        deliveryDate: '2025-09-26'
      };

      const normalizedDoc = normalizeCsvRow(testRow, user.id);
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'loads'), {
        ...normalizedDoc,
        status: 'OPEN', // Override for compatibility
        bulkImportId: `test-${Date.now()}`,
        isArchived: false,
        clientCreatedAt: Date.now(),
        expiresAtMs: Date.now() + 7 * 24 * 60 * 60 * 1000,
        deliveryDateLocal: `${testRow.deliveryDate}T00:00`,
        shipperName: (user as any)?.name || (user as any)?.email || 'Test Shipper',
        vehicleCount: null,
        originCity: normalizedDoc.origin.city,
        destCity: normalizedDoc.destination.city,
        rateTotalUSD: normalizedDoc.rate,
      });

      addTestResult(`✅ Test load created with ID: ${docRef.id}`);
      addTestResult(`   Status: OPEN, Rate: $${normalizedDoc.rate}`);
      addTestResult(`   CreatedBy: ${normalizedDoc.createdBy}`);
      addTestResult(`   ShipperId: ${normalizedDoc.shipperId}`);
      
      toast.show('Firestore write test passed', 'success');

    } catch (error: any) {
      addTestResult(`❌ Firestore write failed: ${error.message}`);
      toast.show('Firestore write test failed', 'error');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Bulk Upload Test',
          headerStyle: { backgroundColor: theme.colors.white },
        }}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <FileText size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Bulk Upload Test Suite</Text>
          <Text style={styles.subtitle}>
            Test the CSV normalizer and Firestore integration
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.testButton} onPress={testNormalizer}>
            <CheckCircle size={20} color={theme.colors.white} />
            <Text style={styles.buttonText}>Test CSV Normalizer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.testButton, styles.firestoreButton]} onPress={testFirestoreWrite}>
            <CheckCircle size={20} color={theme.colors.white} />
            <Text style={styles.buttonText}>Test Firestore Write</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearResults}>
            <AlertCircle size={20} color={theme.colors.white} />
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Test Results:</Text>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
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
  buttonContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  firestoreButton: {
    backgroundColor: theme.colors.success,
  },
  clearButton: {
    backgroundColor: theme.colors.gray,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  resultsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});