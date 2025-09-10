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

import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseFileContent, validateCSVHeaders, buildSimpleTemplateCSV, buildCompleteTemplateCSV, buildCanonicalTemplateCSV, validateLoadRow, CSVRow } from '@/utils/csv';
import * as XLSX from 'xlsx';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LOADS_COLLECTION } from '@/lib/loadSchema';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';


type TemplateType = 'simple' | 'standard' | 'complete';

const TEMPLATE_CONFIGS = {
  simple: {
    name: 'Simple Template (5 columns)',
    description: 'Origin, Destination, VehicleType, Weight, Price',
    requiredHeaders: ['Origin','Destination','VehicleType','Weight','Price'],
    color: theme.colors.primary,
  },
  standard: {
    name: 'Standard Template (16 columns)',
    description: 'Includes dates, addresses, contacts, requirements',
    requiredHeaders: ['title','description','equipmentType','vehicleCount','originCity','originState','originZip','destinationCity','destinationState','destinationZip','pickupDate','deliveryDate','rate','contactName','contactEmail','contactPhone'],
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
  original: CSVRow;
  errors: string[];
  id: string;
}

// Validate headers function
function validateHeaders(headers: string[], expected: string[]): { ok: boolean; errors: string[] } {
  console.log('Headers:', headers);
  
  const errors: string[] = [];
  
  // Check exact length match
  if (headers.length !== expected.length) {
    errors.push(`Expected ${expected.length} columns, got ${headers.length}`);
  }
  
  // Check exact order and names
  for (let i = 0; i < Math.max(headers.length, expected.length); i++) {
    const actual = headers[i]?.trim() || '';
    const expectedHeader = expected[i] || '';
    
    if (actual !== expectedHeader) {
      if (i < expected.length && i < headers.length) {
        errors.push(`Column ${i + 1}: expected "${expectedHeader}", got "${actual}"`);
      } else if (i >= expected.length) {
        errors.push(`Extra column ${i + 1}: "${actual}"`);
      } else {
        errors.push(`Missing column ${i + 1}: "${expectedHeader}"`);
      }
    }
  }
  
  return {
    ok: errors.length === 0,
    errors
  };
}

export default function CSVBulkUploadScreen() {
  const { user } = useAuth();
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [headerValidation, setHeaderValidation] = useState<{ ok: boolean; errors: string[] } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('simple');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const toast = useToast();

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    toast.show(message, type);
  }, [toast]);

  const generateLoadId = useCallback(() => {
    return 'LOAD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  const processCSVData = useCallback((rows: CSVRow[]) => {
    const processed: ProcessedRow[] = rows.map(row => {
      const errors = validateLoadRow(row, selectedTemplate);
      return {
        original: row,
        errors,
        id: generateLoadId(),
      };
    });
    setProcessedRows(processed);
  }, [generateLoadId, selectedTemplate]);

  const handleFileSelect = useCallback(async () => {
    try {
      setIsLoading(true);
      setHeaderValidation(null);
      setProcessedRows([]);
      setFileHeaders([]);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Only read headers initially
      let headers: string[];
      
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // For Excel files, we need to read the first row
        let arrayBuffer: ArrayBuffer;
        
        if (typeof window !== 'undefined' && file.uri.startsWith('blob:')) {
          const response = await fetch(file.uri);
          arrayBuffer = await response.arrayBuffer();
        } else {
          const { FileSystem } = require('expo-file-system');
          const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
          const binaryString = atob(base64);
          arrayBuffer = new ArrayBuffer(binaryString.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }
        }
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length === 0) {
          throw new Error('Excel file appears to be empty');
        }
        
        headers = jsonData[0].map(h => (h || '').toString().trim());
      } else {
        // For CSV files, read only the first line
        let csvContent: string;
        
        if (typeof window !== 'undefined' && file.uri.startsWith('blob:')) {
          const response = await fetch(file.uri);
          csvContent = await response.text();
        } else {
          const { FileSystem } = require('expo-file-system');
          csvContent = await FileSystem.readAsStringAsync(file.uri);
        }
        
        const firstLine = csvContent.split('\n')[0];
        headers = firstLine.split(',').map(h => h.replace(/"/g, '').trim());
      }
      
      setFileHeaders(headers);
      
      // Validate headers against selected template
      const expectedHeaders = TEMPLATE_CONFIGS[selectedTemplate].requiredHeaders;
      const validation = validateHeaders(headers, expectedHeaders);
      setHeaderValidation(validation);
      
      if (validation.ok) {
        showToast(`✅ Headers valid for ${TEMPLATE_CONFIGS[selectedTemplate].name}`, 'success');
      } else {
        showToast(`❌ Invalid headers. Expected ${TEMPLATE_CONFIGS[selectedTemplate].name} format.`, 'error');
      }
      
    } catch (error: any) {
      console.error('File select error:', error);
      console.warn(error);
      const errorMessage = error.message || 'CSV read error';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, selectedTemplate]);

  const removeRow = useCallback((index: number) => {
    setProcessedRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const performImport = useCallback(async () => {
    try {
      setIsImporting(true);
      console.log('[BULK UPLOAD] Starting import process...');
      
      const authSuccess = await ensureFirebaseAuth();
      if (!authSuccess) {
        throw new Error('Authentication failed. Please try again.');
      }
      
      const { db } = getFirebase();
      console.log('[BULK UPLOAD] Firebase initialized successfully');
      
      const validRows = processedRows.filter(row => row.errors.length === 0);
      let imported = 0;
      
      console.log(`[BULK UPLOAD] Processing ${validRows.length} valid rows...`);
      
      for (const processedRow of validRows) {
        const { original, id } = processedRow;
        console.log(`[BULK UPLOAD] Processing row ${imported + 1}/${validRows.length}:`, id);
        
        let loadData: any;
        
        if (selectedTemplate === 'simple') {
          loadData = {
            title: `${original['VehicleType']} - ${original['Origin']} to ${original['Destination']}`,
            origin: original['Origin']?.trim() || '',
            destination: original['Destination']?.trim() || '',
            vehicleType: original['VehicleType']?.trim() || '',
            weight: Number(original['Weight']?.replace(/[^0-9.]/g, '') || 0),
            rate: Number(original['Price']?.replace(/[^0-9.]/g, '') || 0),
            status: 'OPEN',
            createdBy: user!.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            pickupDate: null,
            deliveryDate: null,
            attachments: [],
            clientCreatedAt: Date.now(),
          };
        } else {
          // Standard and Complete templates
          const pickupDate = original['pickupDate'] ? new Date(original['pickupDate']) : null;
          const deliveryDate = original['deliveryDate'] ? new Date(original['deliveryDate']) : null;
          
          loadData = {
            title: original['title']?.trim() || `${original['vehicleType']} - ${original['originCity']} to ${original['destinationCity']}`,
            description: original['description']?.trim() || 'Imported via CSV',
            origin: original['originCity']?.trim() || '',
            destination: original['destinationCity']?.trim() || '',
            vehicleType: original['vehicleType']?.trim() || '',
            weight: Number(original['weight']?.replace(/[^0-9.]/g, '') || 0),
            rate: Number(original['rate']?.replace(/[^0-9.]/g, '') || 0),
            status: 'OPEN',
            createdBy: user!.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            pickupDate: pickupDate,
            deliveryDate: deliveryDate,
            attachments: [],
            clientCreatedAt: Date.now(),
            // Additional fields for standard/complete templates
            originPlace: original['originState'] ? {
              city: original['originCity']?.trim() || '',
              state: original['originState']?.trim() || '',
              lat: 0,
              lng: 0
            } : undefined,
            destinationPlace: original['destinationState'] ? {
              city: original['destinationCity']?.trim() || '',
              state: original['destinationState']?.trim() || '',
              lat: 0,
              lng: 0
            } : undefined,
            weightLbs: Number(original['weight']?.replace(/[^0-9.]/g, '') || 0),
            revenueUsd: Number(original['rate']?.replace(/[^0-9.]/g, '') || 0),
            distanceMi: original['distance'] ? Number(original['distance'].replace(/[^0-9.]/g, '') || 0) : undefined,
          };
          
          // Add complete template specific fields
          if (selectedTemplate === 'complete') {
            loadData = {
              ...loadData,
              loadType: original['loadType']?.trim(),
              reference: original['reference']?.trim(),
              originAddress: original['originAddress']?.trim(),
              originZip: original['originZip']?.trim(),
              destinationAddress: original['destinationAddress']?.trim(),
              destinationZip: original['destinationZip']?.trim(),
              specialRequirements: original['specialRequirements']?.trim(),
              notes: original['notes']?.trim(),
              dimensions: original['dimensions']?.trim(),
              hazmat: original['hazmat']?.trim() === 'Yes',
              temperature: original['temperature']?.trim(),
              priority: original['priority']?.trim(),
              expedited: original['expedited']?.trim() === 'Yes',
            };
          }
        }

        await setDoc(doc(db, LOADS_COLLECTION, id), loadData);
        imported++;
        console.log(`[BULK UPLOAD] Successfully imported row ${imported}/${validRows.length}`);
      }
      
      console.log(`[BULK UPLOAD] Import completed successfully. Imported ${imported} loads.`);
      showToast(`Successfully imported ${imported} loads`);
      setProcessedRows([]);
      router.back();
      
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.message || 'Import failed. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsImporting(false);
    }
  }, [user, processedRows, showToast, selectedTemplate]);

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
            Upload a CSV, Excel (.xlsx), or Google Sheets file with load information. Choose from simple (5 columns) to complete (50+ columns) templates below.
          </Text>
        </View>

        <View style={styles.templatesContainer}>
          <Text style={styles.templatesTitle}>Download Templates (CSV format):</Text>
          <Text style={styles.templatesSubtitle}>
            💡 Tip: Open in Excel or Google Sheets, fill with your data, then save/export as CSV to upload
          </Text>
          
          <TouchableOpacity 
            style={styles.templateButton} 
            onPress={() => downloadTemplate('simple')}
          >
            <Download size={20} color={theme.colors.primary} />
            <View style={styles.templateTextContainer}>
              <Text style={styles.templateText}>Simple Template (5 columns)</Text>
              <Text style={styles.templateSubtext}>Origin, Destination, VehicleType, Weight, Price</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.templateButton} 
            onPress={() => downloadTemplate('canonical')}
          >
            <Download size={20} color={theme.colors.success} />
            <View style={styles.templateTextContainer}>
              <Text style={styles.templateText}>Standard Template (16 columns)</Text>
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
          <Text style={styles.templateSelectorSubtitle}>
            Select the template type that matches your file&apos;s column structure
          </Text>
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
                      setHeaderValidation(null);
                      setFileHeaders([]);
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
            {isLoading ? 'Loading...' : 'Select CSV/Excel File'}
          </Text>
        </TouchableOpacity>

        {headerValidation && (
          <View style={[styles.bannerContainer, headerValidation.ok ? styles.successBanner : styles.errorBanner]}>
            {headerValidation.ok ? (
              <>
                <CheckCircle size={20} color={theme.colors.success} />
                <Text style={[styles.bannerTitle, styles.successText]}>
                  ✅ Headers valid for {TEMPLATE_CONFIGS[selectedTemplate].name}
                </Text>
              </>
            ) : (
              <>
                <AlertCircle size={20} color={theme.colors.danger} />
                <View style={styles.bannerContent}>
                  <Text style={[styles.bannerTitle, styles.errorText]}>
                    ❌ Invalid headers. Expected {TEMPLATE_CONFIGS[selectedTemplate].name} format.
                  </Text>
                  {headerValidation.errors.map((error, index) => (
                    <Text key={index} style={styles.bannerErrorText}>• {error}</Text>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {headerValidation?.ok && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.previewButton]}
              disabled={true}
            >
              <Text style={styles.actionButtonText}>Preview & Validate</Text>
              <Text style={styles.actionButtonSubtext}>(Coming Soon)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.importButton]}
              disabled={true}
            >
              <Text style={styles.actionButtonText}>Import</Text>
              <Text style={styles.actionButtonSubtext}>(Coming Soon)</Text>
            </TouchableOpacity>
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
                        {selectedTemplate === 'simple' 
                          ? `${row.original['Origin']} → ${row.original['Destination']}`
                          : `${row.original['originCity'] || row.original['Origin']} → ${row.original['destinationCity'] || row.original['Destination']}`
                        }
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeRow(processedRows.indexOf(row))}
                      >
                        <Trash2 size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.rowDetails}>
                      {selectedTemplate === 'simple'
                        ? `${row.original['VehicleType']} • ${row.original['Weight']} lbs • ${row.original['Price']}`
                        : `${row.original['vehicleType'] || row.original['VehicleType']} • ${row.original['weight'] || row.original['Weight']} lbs • ${row.original['rate'] || row.original['Price']}`
                      }
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
                        {selectedTemplate === 'simple'
                          ? `${row.original['Origin'] || 'Missing'} → ${row.original['Destination'] || 'Missing'}`
                          : `${row.original['originCity'] || row.original['Origin'] || 'Missing'} → ${row.original['destinationCity'] || row.original['Destination'] || 'Missing'}`
                        }
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
                style={[styles.finalImportButton, isImporting && styles.importButtonDisabled]}
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
    marginBottom: theme.spacing.xs,
  },
  templatesSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
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
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    borderColor: theme.colors.success,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  bannerContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  bannerTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  successText: {
    color: theme.colors.success,
  },
  errorText: {
    color: theme.colors.danger,
  },
  bannerErrorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginTop: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    opacity: 0.5,
  },
  previewButton: {
    backgroundColor: theme.colors.primary,
  },
  importButton: {
    backgroundColor: theme.colors.success,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  actionButtonSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.white,
    opacity: 0.8,
    marginTop: 2,
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
  finalImportButton: {
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
    marginBottom: theme.spacing.xs,
  },
  templateSelectorSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
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