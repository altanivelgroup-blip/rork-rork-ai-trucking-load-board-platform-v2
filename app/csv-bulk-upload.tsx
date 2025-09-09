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
import { Upload, FileText, AlertCircle, CheckCircle, Download, Trash2, ChevronDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseCSV, validateCSVHeaders, buildSimpleTemplateCSV, buildCompleteTemplateCSV, buildCanonicalTemplateCSV, SimpleLoadRow, validateSimpleLoadRow } from '@/utils/csv';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LOADS_COLLECTION } from '@/lib/loadSchema';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';

type TemplateType = 'simple' | 'standard' | 'complete';

const TEMPLATE_CONFIGS = {
  simple: {
    name: 'Simple Template (5 columns)',
    description: 'Origin, Destination, Vehicle Type, Weight, Price',
    requiredHeaders: ['Origin', 'Destination', 'Vehicle Type', 'Weight', 'Price'],
    color: theme.colors.primary,
  },
  standard: {
    name: 'Standard Template (29 columns)',
    description: 'Includes dates, addresses, contacts, requirements',
    requiredHeaders: ['title','description','originCity','destinationCity','pickupDate','deliveryDate','vehicleType','weight','rate'],
    color: theme.colors.success,
  },
  complete: {
    name: 'Complete Template (50+ columns)',
    description: 'All possible load details, contacts, documentation',
    requiredHeaders: ['title','description','originCity','destinationCity','pickupDate','deliveryDate','vehicleType','weight','rate'],
    color: theme.colors.warning,
  },
};

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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('simple');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
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
      
      const requiredHeaders = TEMPLATE_CONFIGS[selectedTemplate].requiredHeaders;
      const headerIssues = validateCSVHeaders(headers, requiredHeaders);
      setHeaderErrors(headerIssues);
      
      if (headerIssues.length > 0) {
        showToast(`CSV headers do not match ${TEMPLATE_CONFIGS[selectedTemplate].name} format`, 'error');
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
  }, [processCSVData, showToast, selectedTemplate]);

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
          status: 'OPEN',
          createdBy: user!.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          pickupDate: null,
          deliveryDate: null,
          attachments: [],
          clientCreatedAt: Date.now(),
        };

        await setDoc(doc(db, LOADS_COLLECTION, id), loadData);
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



  const downloadTemplate = useCallback((templateType: 'simple' | 'complete' | 'canonical') => {
    let template: string;
    let filename: string;
    
    switch (templateType) {
      case 'simple':
        template = buildSimpleTemplateCSV();
        filename = 'loads_simple_template.csv';
        break;
      case 'complete':
        template = buildCompleteTemplateCSV();
        filename = 'loads_complete_template.csv';
        break;
      case 'canonical':
        template = buildCanonicalTemplateCSV();
        filename = 'loads_canonical_template.csv';
        break;
      default:
        template = buildSimpleTemplateCSV();
        filename = 'loads_simple_template.csv';
    }
    
    if (Platform.OS === 'web') {
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template downloaded`, 'success');
    } else {
      showToast(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template downloaded to device`, 'success');
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
            Upload a CSV file with load information. Choose from simple (5 columns) to complete (50+ columns) templates below.
          </Text>
        </View>

        <View style={styles.templatesContainer}>
          <Text style={styles.templatesTitle}>Download CSV Templates:</Text>
          
          <TouchableOpacity 
            style={styles.templateButton} 
            onPress={() => downloadTemplate('simple')}
          >
            <Download size={20} color={theme.colors.primary} />
            <View style={styles.templateTextContainer}>
              <Text style={styles.templateText}>Simple Template (5 columns)</Text>
              <Text style={styles.templateSubtext}>Origin, Destination, Vehicle Type, Weight, Price</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.templateButton} 
            onPress={() => downloadTemplate('canonical')}
          >
            <Download size={20} color={theme.colors.success} />
            <View style={styles.templateTextContainer}>
              <Text style={styles.templateText}>Standard Template (29 columns)</Text>
              <Text style={styles.templateSubtext}>Includes dates, addresses, contacts, requirements</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.templateButton} 
            onPress={() => downloadTemplate('complete')}
          >
            <Download size={20} color={theme.colors.warning} />
            <View style={styles.templateTextContainer}>
              <Text style={styles.templateText}>Complete Template (50+ columns)</Text>
              <Text style={styles.templateSubtext}>All possible load details, contacts, documentation</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.templateSelectorContainer}>
          <Text style={styles.templateSelectorTitle}>Which template are you uploading?</Text>
          <TouchableOpacity
            style={styles.templateSelector}
            onPress={() => setShowTemplateDropdown(!showTemplateDropdown)}
          >
            <View style={styles.templateSelectorContent}>
              <View style={styles.templateSelectorLeft}>
                <View style={[styles.templateIndicator, { backgroundColor: TEMPLATE_CONFIGS[selectedTemplate].color }]} />
                <View>
                  <Text style={styles.templateSelectorText}>{TEMPLATE_CONFIGS[selectedTemplate].name}</Text>
                  <Text style={styles.templateSelectorSubtext}>{TEMPLATE_CONFIGS[selectedTemplate].description}</Text>
                </View>
              </View>
              <ChevronDown 
                size={20} 
                color={theme.colors.gray} 
                style={[styles.chevron, showTemplateDropdown && styles.chevronRotated]} 
              />
            </View>
          </TouchableOpacity>
          
          {showTemplateDropdown && (
            <View style={styles.templateDropdown}>
              {(Object.keys(TEMPLATE_CONFIGS) as TemplateType[]).map((templateType) => {
                const config = TEMPLATE_CONFIGS[templateType];
                const isSelected = selectedTemplate === templateType;
                
                return (
                  <TouchableOpacity
                    key={templateType}
                    style={[styles.templateOption, isSelected && styles.templateOptionSelected]}
                    onPress={() => {
                      setSelectedTemplate(templateType);
                      setShowTemplateDropdown(false);
                      setProcessedRows([]);
                      setHeaderErrors([]);
                    }}
                  >
                    <View style={[styles.templateIndicator, { backgroundColor: config.color }]} />
                    <View style={styles.templateOptionContent}>
                      <Text style={[styles.templateOptionText, isSelected && styles.templateOptionTextSelected]}>
                        {config.name}
                      </Text>
                      <Text style={[styles.templateOptionSubtext, isSelected && styles.templateOptionSubtextSelected]}>
                        {config.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle size={16} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

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
  templatesContainer: {
    marginBottom: theme.spacing.lg,
  },
  templatesTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  templateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontWeight: '600',
    marginBottom: 2,
  },
  templateSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    lineHeight: 16,
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
  templateSelectorContainer: {
    marginBottom: theme.spacing.lg,
  },
  templateSelectorTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  templateSelector: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  templateSelectorText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  templateSelectorSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  templateDropdown: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  templateOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  templateOptionContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  templateOptionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  templateOptionTextSelected: {
    color: theme.colors.primary,
  },
  templateOptionSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  templateOptionSubtextSelected: {
    color: theme.colors.primary,
  },
});