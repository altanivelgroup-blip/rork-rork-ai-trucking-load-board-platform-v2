import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Trash2 } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseCSV, validateCSVHeaders, buildTemplateCSV, SimpleLoadRow, validateSimpleLoadRow } from '@/utils/csv';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';

const REQUIRED_HEADERS = ['Origin', 'Destination', 'Vehicle Type', 'Weight', 'Price'];

interface ProcessedRow {
  original: SimpleLoadRow;
  errors: string[];
  id: string;
}

export default function CSVBulkUploadScreen() {
  const { user } = useAuth();
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const toast = useToast();

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    toast.show(message, type);
  }, [toast]);

  const generateLoadId = useCallback(() => {
    return 'LOAD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  const processCSVData = useCallback((rows: SimpleLoadRow[]) => {
    const processed: ProcessedRow[] = rows.map(row => {
      const errors = validateSimpleLoadRow(row);
      return {
        original: row,
        errors,
        id: generateLoadId(),
      };
    });
    setProcessedRows(processed);
  }, [generateLoadId]);

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
        const response = await fetch(file.uri);
        csvContent = await response.text();
      } else {
        csvContent = await FileSystem.readAsStringAsync(file.uri);
      }

      const { headers, rows } = parseCSV(csvContent);
      
      const headerIssues = validateCSVHeaders(headers, REQUIRED_HEADERS);
      setHeaderErrors(headerIssues);
      
      if (headerIssues.length > 0) {
        showToast('CSV headers do not match required format', 'error');
        return;
      }

      processCSVData(rows as unknown as SimpleLoadRow[]);
      showToast(`Loaded ${rows.length} rows for preview`);
      
    } catch (error) {
      console.error('File select error:', error);
      showToast('Failed to read CSV file', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [processCSVData, showToast]);

  const removeRow = useCallback((index: number) => {
    setProcessedRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const performImport = useCallback(async () => {
    try {
      setIsImporting(true);
      await ensureFirebaseAuth();
      const { db } = getFirebase();
      
      const validRows = processedRows.filter(row => row.errors.length === 0);
      let imported = 0;
      
      for (const processedRow of validRows) {
        const { original, id } = processedRow;
        
        const loadData = {
          title: `${original['Vehicle Type']} - ${original['Origin']} to ${original['Destination']}`,
          origin: original['Origin'].trim(),
          destination: original['Destination'].trim(),
          vehicleType: original['Vehicle Type'].trim(),
          weight: Number(original['Weight']),
          rate: Number(original['Price']),
          status: 'open',
          createdBy: user!.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          pickupDate: null,
          deliveryDate: null,
          attachments: [],
          clientCreatedAt: Date.now(),
        };

        await setDoc(doc(db, 'loads', id), loadData);
        imported++;
      }
      
      showToast(`Successfully imported ${imported} loads`);
      setProcessedRows([]);
      router.back();
      
    } catch (error) {
      console.error('Import error:', error);
      showToast('Import failed. Please try again.', 'error');
    } finally {
      setIsImporting(false);
    }
  }, [user, processedRows, showToast]);

  const handleImport = useCallback(async () => {
    if (!user) {
      showToast('Authentication required', 'error');
      return;
    }

    const validRows = processedRows.filter(row => row.errors.length === 0);
    
    if (validRows.length === 0) {
      showToast('No valid rows to import', 'error');
      return;
    }

    Alert.alert(
      'Confirm Import',
      `Import ${validRows.length} loads to Firestore?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: performImport }
      ]
    );
  }, [user, processedRows, showToast, performImport]);



  const downloadTemplate = useCallback(() => {
    const template = buildTemplateCSV();
    
    if (Platform.OS === 'web') {
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loads_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      showToast('Template downloaded to device', 'success');
    }
  }, [showToast]);

  const validRows = processedRows.filter(row => row.errors.length === 0);
  const invalidRows = processedRows.filter(row => row.errors.length > 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'CSV Bulk Upload',
          headerLeft: () => <HeaderBack />,
        }}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <FileText size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Bulk Upload Loads</Text>
          <Text style={styles.subtitle}>
            Upload a CSV file with Origin, Destination, Vehicle Type, Weight, and Price columns.
          </Text>
        </View>

        <TouchableOpacity style={styles.templateButton} onPress={downloadTemplate}>
          <Download size={20} color={theme.colors.primary} />
          <Text style={styles.templateText}>Download Sample CSV</Text>
        </TouchableOpacity>

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

        {headerErrors.length > 0 && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color={theme.colors.danger} />
            <Text style={styles.errorTitle}>Header Issues:</Text>
            {headerErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}

        {processedRows.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>
              Preview ({processedRows.length} rows)
            </Text>
            
            {validRows.length > 0 && (
              <View style={styles.validSection}>
                <Text style={styles.sectionTitle}>
                  ✅ Valid Rows ({validRows.length})
                </Text>
                {validRows.map((row, index) => (
                  <View key={row.id} style={styles.rowContainer}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle}>
                        {row.original['Origin']} → {row.original['Destination']}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeRow(processedRows.indexOf(row))}
                      >
                        <Trash2 size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.rowDetails}>
                      {row.original['Vehicle Type']} • {row.original['Weight']} lbs • ${row.original['Price']}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {invalidRows.length > 0 && (
              <View style={styles.invalidSection}>
                <Text style={styles.sectionTitle}>
                  ❌ Invalid Rows ({invalidRows.length})
                </Text>
                {invalidRows.map((row, index) => (
                  <View key={row.id} style={styles.rowContainer}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle}>
                        {row.original['Origin'] || 'Missing'} → {row.original['Destination'] || 'Missing'}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeRow(processedRows.indexOf(row))}
                      >
                        <Trash2 size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.errorList}>
                      {row.errors.map((error, errorIndex) => (
                        <Text key={errorIndex} style={styles.rowErrorText}>
                          • {error}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Import Summary</Text>
              <Text style={styles.summaryText}>
                Total: {processedRows.length} | Valid: {validRows.length} | Invalid: {invalidRows.length}
              </Text>
            </View>
            
            {validRows.length > 0 && (
              <TouchableOpacity
                style={[styles.importButton, isImporting && styles.importButtonDisabled]}
                onPress={handleImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <CheckCircle size={24} color={theme.colors.white} />
                )}
                <Text style={styles.importText}>
                  {isImporting ? 'Importing...' : `Import ${validRows.length} Loads`}
                </Text>
              </TouchableOpacity>
            )}
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
  validSection: {
    marginBottom: theme.spacing.md,
  },
  invalidSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
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
  rowTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
  },
  rowDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  errorList: {
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  rowErrorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
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
});