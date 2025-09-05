import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseCSV, validateCSVHeaders, CSVRow } from '@/utils/csv';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LOADS_COLLECTION } from '@/lib/loadSchema';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';

interface LoadRow {
  load_id: string;
  shipper_name: string;
  membership_required: string;
  is_featured: string;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  pickup_zip: string;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_state: string;
  dropoff_zip: string;
  pickup_datetime_iso: string;
  delivery_window_note: string;
  vehicle_type: string;
  equipment_required: string;
  weight_lbs: string;
  length_ft: string;
  price_usd: string;
  payment_method: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
  pickup_lat: string;
  pickup_lng: string;
  dropoff_lat: string;
  dropoff_lng: string;
  created_at_iso: string;
  primary_photo_url: string;
  photo_urls_semicolon: string;
  has_photo_consent: string;
  photo_count_expected: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ProcessedRow {
  original: LoadRow;
  errors: ValidationError[];
  warnings: string[];
  skip: boolean;
  asDraft: boolean;
  photos: string[];
  primaryPhoto: string;
}

const REQUIRED_HEADERS = [
  'load_id', 'shipper_name', 'membership_required', 'is_featured',
  'pickup_address', 'pickup_city', 'pickup_state', 'pickup_zip',
  'dropoff_address', 'dropoff_city', 'dropoff_state', 'dropoff_zip',
  'pickup_datetime_iso', 'delivery_window_note', 'vehicle_type',
  'equipment_required', 'weight_lbs', 'length_ft', 'price_usd',
  'payment_method', 'contact_name', 'contact_phone', 'contact_email',
  'notes', 'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng',
  'created_at_iso', 'primary_photo_url', 'photo_urls_semicolon',
  'has_photo_consent', 'photo_count_expected'
];

const REQUIRED_FIELDS = [
  'load_id', 'pickup_address', 'pickup_city', 'pickup_state', 'pickup_zip',
  'dropoff_address', 'dropoff_city', 'dropoff_state', 'dropoff_zip', 'price_usd'
];

export default function CSVImportScreen() {
  const { user } = useAuth();

  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const toast = useToast();

  // Check if user has Pro/VIP access
  const hasAccess = user?.membershipTier === 'business';

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    toast.show(message, type);
  }, [toast]);

  const validateRow = useCallback((row: LoadRow): { errors: ValidationError[]; warnings: string[] } => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!row[field as keyof LoadRow]?.trim()) {
        errors.push({ field, message: 'Required field is empty' });
      }
    });

    // Validate state (uppercase, 2 chars)
    if (row.pickup_state && !/^[A-Z]{2}$/.test(row.pickup_state.toUpperCase())) {
      errors.push({ field: 'pickup_state', message: 'Must be 2-letter state code (e.g., TX)' });
    }
    if (row.dropoff_state && !/^[A-Z]{2}$/.test(row.dropoff_state.toUpperCase())) {
      errors.push({ field: 'dropoff_state', message: 'Must be 2-letter state code (e.g., CA)' });
    }

    // Validate ZIP (5 digits)
    if (row.pickup_zip && !/^\d{5}$/.test(row.pickup_zip)) {
      errors.push({ field: 'pickup_zip', message: 'Must be 5-digit ZIP code' });
    }
    if (row.dropoff_zip && !/^\d{5}$/.test(row.dropoff_zip)) {
      errors.push({ field: 'dropoff_zip', message: 'Must be 5-digit ZIP code' });
    }

    // Validate numbers
    if (row.price_usd && isNaN(Number(row.price_usd))) {
      errors.push({ field: 'price_usd', message: 'Must be a valid number' });
    }
    if (row.weight_lbs && isNaN(Number(row.weight_lbs))) {
      errors.push({ field: 'weight_lbs', message: 'Must be a valid number' });
    }
    if (row.length_ft && isNaN(Number(row.length_ft))) {
      errors.push({ field: 'length_ft', message: 'Must be a valid number' });
    }

    // Build photo list
    const urlList: string[] = [];
    if (row.primary_photo_url?.trim()) {
      urlList.push(row.primary_photo_url.trim());
    }
    if (row.photo_urls_semicolon?.trim()) {
      const additionalUrls = row.photo_urls_semicolon.split(';')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      urlList.push(...additionalUrls);
    }

    if (urlList.length < 2) {
      warnings.push('Needs photos (min 2). Will be imported as draft.');
    }

    return { errors, warnings };
  }, []);

  const processCSVData = useCallback((rows: CSVRow[]) => {
    const processed: ProcessedRow[] = rows.map(row => {
      const loadRow = row as unknown as LoadRow;
      const { errors, warnings } = validateRow(loadRow);
      
      // Build photo list
      const urlList: string[] = [];
      if (loadRow.primary_photo_url?.trim()) {
        urlList.push(loadRow.primary_photo_url.trim());
      }
      if (loadRow.photo_urls_semicolon?.trim()) {
        const additionalUrls = loadRow.photo_urls_semicolon.split(';')
          .map(url => url.trim())
          .filter(url => url.length > 0);
        urlList.push(...additionalUrls);
      }

      return {
        original: loadRow,
        errors,
        warnings,
        skip: false,
        asDraft: urlList.length < 2,
        photos: urlList,
        primaryPhoto: urlList[0] || '',
      };
    });

    setProcessedRows(processed);
  }, [validateRow]);

  const handleFileSelect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      let csvContent: string;

      if (Platform.OS === 'web') {
        // Web: read as text
        const response = await fetch(file.uri);
        csvContent = await response.text();
      } else {
        // Mobile: read file
        csvContent = await FileSystem.readAsStringAsync(file.uri);
      }

      const { headers, rows } = parseCSV(csvContent);
      
      // Validate headers
      const headerIssues = validateCSVHeaders(headers, REQUIRED_HEADERS);
      setHeaderErrors(headerIssues);
      
      if (headerIssues.length > 0) {
        showToast('CSV headers do not match required format', 'error');
        return;
      }


      processCSVData(rows);
      showToast(`Loaded ${rows.length} rows for preview`);
      
    } catch (error) {
      console.error('File select error:', error);
      showToast('Failed to read CSV file', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [processCSVData, showToast]);

  const toggleRowSkip = useCallback((index: number) => {
    setProcessedRows(prev => prev.map((row, i) => 
      i === index ? { ...row, skip: !row.skip } : row
    ));
  }, []);

  const toggleRowDraft = useCallback((index: number) => {
    setProcessedRows(prev => prev.map((row, i) => 
      i === index ? { ...row, asDraft: !row.asDraft } : row
    ));
  }, []);

  const handleImport = useCallback(async () => {
    if (!user) {
      showToast('Authentication required', 'error');
      return;
    }

    try {
      setIsImporting(true);
      await ensureFirebaseAuth();
      const { db } = getFirebase();
      
      const rowsToImport = processedRows.filter(row => !row.skip);
      let imported = 0;
      let drafts = 0;
      let skipped = processedRows.filter(row => row.skip).length;
      
      for (const processedRow of rowsToImport) {
        const { original, photos, primaryPhoto, asDraft } = processedRow;
        
        // Normalize data
        const loadData = {
          load_id: original.load_id.trim(),
          shipper_name: original.shipper_name.trim(),
          membership_required: original.membership_required.trim() || 'Basic',
          is_featured: Boolean(original.is_featured === 'true' || original.is_featured === '1'),
          pickup: {
            address: original.pickup_address.trim(),
            city: original.pickup_city.trim(),
            state: original.pickup_state.toUpperCase(),
            zip: original.pickup_zip.trim(),
            lat: original.pickup_lat ? Number(original.pickup_lat) : null,
            lng: original.pickup_lng ? Number(original.pickup_lng) : null,
          },
          dropoff: {
            address: original.dropoff_address.trim(),
            city: original.dropoff_city.trim(),
            state: original.dropoff_state.toUpperCase(),
            zip: original.dropoff_zip.trim(),
            lat: original.dropoff_lat ? Number(original.dropoff_lat) : null,
            lng: original.dropoff_lng ? Number(original.dropoff_lng) : null,
          },
          pickup_datetime_iso: original.pickup_datetime_iso.trim(),
          delivery_window_note: original.delivery_window_note.trim(),
          vehicle_type: original.vehicle_type.trim() || 'CAR-HAULER',
          equipment_required: original.equipment_required.trim(),
          weight_lbs: original.weight_lbs ? Number(original.weight_lbs) : 0,
          length_ft: original.length_ft ? Number(original.length_ft) : 0,
          price_usd: Number(original.price_usd),
          payment_method: original.payment_method.trim(),
          contact: {
            name: original.contact_name.trim(),
            phone: original.contact_phone.trim(),
            email: original.contact_email.trim(),
          },
          notes: original.notes.trim(),
          photos,
          primaryPhoto,
          has_photo_consent: Boolean(original.has_photo_consent === 'true' || original.has_photo_consent === '1'),
          photo_count_expected: original.photo_count_expected ? Number(original.photo_count_expected) : 0,
          status: asDraft || photos.length < 2 ? 'draft' : 'posted',
          created_by: user.id,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };

        await setDoc(doc(db, LOADS_COLLECTION, original.load_id), loadData, { merge: true });
        
        imported++;
        if (asDraft || photos.length < 2) {
          drafts++;
        }
      }
      
      showToast(`Imported ${imported} loads. Drafts: ${drafts}, Skipped: ${skipped}`);
      
      // Clear data and go back
      setProcessedRows([]);
      router.back();
      
    } catch (error) {
      console.error('Import error:', error);
      showToast('Import failed. Please try again.', 'error');
    } finally {
      setIsImporting(false);
    }
  }, [user, processedRows, showToast]);

  const downloadTemplate = useCallback(() => {
    const template = REQUIRED_HEADERS.join(',') + '\n' +
      'LOAD001,Acme Shipping,Basic,false,123 Main St,Dallas,TX,75201,456 Oak Ave,Houston,TX,77001,2025-01-15T08:00:00Z,Deliver by 5 PM,CAR-HAULER,Enclosed trailer,5000,20,1200,Net 30,John Doe,555-0123,john@acme.com,Handle with care,32.7767,-96.7970,29.7604,-95.3698,2025-01-10T10:00:00Z,https://example.com/photo1.jpg,https://example.com/photo2.jpg;https://example.com/photo3.jpg,true,3';
    
    if (Platform.OS === 'web') {
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loads_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      showToast('Template: Copy headers from this screen', 'error');
    }
  }, [showToast]);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'CSV Import',
            headerLeft: () => <HeaderBack />,
          }}
        />
        <View style={styles.accessDenied}>
          <AlertCircle size={64} color={theme.colors.warning} />
          <Text style={styles.accessTitle}>Business Plan Required</Text>
          <Text style={styles.accessText}>
            CSV Import is available for Business plan members only.
            Upgrade your membership to access bulk load import.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/membership')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Membership</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'CSV Import',
          headerLeft: () => <HeaderBack />,
        }}
      />
      
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <FileText size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Import Loads from CSV</Text>
          <Text style={styles.subtitle}>
            Upload a CSV file with load data. All {REQUIRED_HEADERS.length} columns are required.
          </Text>
        </View>

        {/* Template Download */}
        <TouchableOpacity style={styles.templateButton} onPress={downloadTemplate}>
          <Download size={20} color={theme.colors.primary} />
          <Text style={styles.templateText}>Download CSV Template</Text>
        </TouchableOpacity>

        {/* File Upload */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleFileSelect}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Upload size={24} color={theme.colors.white} />
          )}
          <Text style={styles.uploadText}>
            {isLoading ? 'Loading...' : 'Select CSV File'}
          </Text>
        </TouchableOpacity>

        {/* Header Errors */}
        {headerErrors.length > 0 && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color={theme.colors.danger} />
            <Text style={styles.errorTitle}>Header Issues:</Text>
            {headerErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}

        {/* Preview Table */}
        {processedRows.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview ({processedRows.length} rows)</Text>
            
            {processedRows.map((row, index) => (
              <View key={index} style={styles.rowContainer}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowId}>#{index + 1}: {row.original.load_id}</Text>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, row.skip && styles.actionButtonActive]}
                      onPress={() => toggleRowSkip(index)}
                    >
                      <X size={16} color={row.skip ? theme.colors.white : theme.colors.danger} />
                      <Text style={[styles.actionText, row.skip && styles.actionTextActive]}>Skip</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, row.asDraft && styles.actionButtonActive]}
                      onPress={() => toggleRowDraft(index)}
                    >
                      <FileText size={16} color={row.asDraft ? theme.colors.white : theme.colors.warning} />
                      <Text style={[styles.actionText, row.asDraft && styles.actionTextActive]}>Draft</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Errors */}
                {row.errors.length > 0 && (
                  <View style={styles.rowErrors}>
                    {row.errors.map((error, errorIndex) => (
                      <Text key={errorIndex} style={styles.rowErrorText}>
                        • {error.field}: {error.message}
                      </Text>
                    ))}
                  </View>
                )}
                
                {/* Warnings */}
                {row.warnings.length > 0 && (
                  <View style={styles.rowWarnings}>
                    {row.warnings.map((warning, warningIndex) => (
                      <Text key={warningIndex} style={styles.rowWarningText}>
                        ⚠ {warning}
                      </Text>
                    ))}
                  </View>
                )}
                
                {/* Key Info */}
                <View style={styles.rowInfo}>
                  <Text style={styles.rowInfoText}>
                    {row.original.pickup_city}, {row.original.pickup_state} → {row.original.dropoff_city}, {row.original.dropoff_state}
                  </Text>
                  <Text style={styles.rowInfoText}>
                    ${row.original.price_usd} • {row.photos.length} photos
                  </Text>
                </View>
              </View>
            ))}
            
            {/* Import Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Import Summary</Text>
              <Text style={styles.summaryText}>
                Total: {processedRows.length} | 
                Will Import: {processedRows.filter(r => !r.skip).length} | 
                As Drafts: {processedRows.filter(r => !r.skip && r.asDraft).length} | 
                Skip: {processedRows.filter(r => r.skip).length}
              </Text>
            </View>
            
            {/* Import Button */}
            <TouchableOpacity
              style={[styles.importButton, (isImporting || processedRows.filter(r => !r.skip).length === 0) && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={isImporting || processedRows.filter(r => !r.skip).length === 0}
            >
              {isImporting ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <CheckCircle size={24} color={theme.colors.white} />
              )}
              <Text style={styles.importText}>
                {isImporting ? 'Importing...' : `Import ${processedRows.filter(r => !r.skip).length} Loads`}
              </Text>
            </TouchableOpacity>
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
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  templateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  uploadText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.danger,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    marginLeft: theme.spacing.sm,
  },
  previewContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  previewTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  rowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  rowId: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  rowActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginLeft: 4,
  },
  actionTextActive: {
    color: theme.colors.white,
  },
  rowErrors: {
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  rowErrorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
  },
  rowWarnings: {
    backgroundColor: '#FFF3CD',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  rowWarningText: {
    fontSize: theme.fontSize.xs,
    color: '#856404',
  },
  rowInfo: {
    marginTop: theme.spacing.xs,
  },
  rowInfoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  summaryContainer: {
    backgroundColor: '#F3F4F6',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  summaryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
  },
  importButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  importText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  accessTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  accessText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  upgradeButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  upgradeButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: '600',
  },
});