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
import { Upload, FileText, AlertCircle, CheckCircle, Download, Trash2, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseFileContent, validateCSVHeaders, buildSimpleTemplateCSV, buildCompleteTemplateCSV, buildCanonicalTemplateCSV, validateLoadRow, CSVRow, parseCSV } from '@/utils/csv';
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

interface NormalizedPreviewRow {
  title: string | null;
  equipmentType: string | null;
  origin: string | null;
  destination: string | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  rate: number | null;
  status: 'valid' | 'invalid';
  errors: string[];
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
  const [normalizedRows, setNormalizedRows] = useState<NormalizedPreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [headerValidation, setHeaderValidation] = useState<{ ok: boolean; errors: string[] } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('simple');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const toast = useToast();
  
  const PAGE_SIZE = 20;
  const MAX_ROWS = 5000;

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    toast.show(message, type);
  }, [toast]);

  const generateLoadId = useCallback(() => {
    return 'LOAD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  const normalizeNumber = useCallback((value: string | null | undefined): number | null => {
    if (!value?.trim()) return null;
    const cleaned = value.replace(/[$,]/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : Math.max(0, num);
  }, []);

  const normalizeDate = useCallback((value: string | null | undefined): string | null => {
    if (!value?.trim()) return null;
    try {
      const date = new Date(value.trim());
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch {
      return null;
    }
  }, []);

  const validateRowData = useCallback((row: CSVRow, template: TemplateType): { status: 'valid' | 'invalid'; errors: string[] } => {
    const errors: string[] = [];
    
    if (template === 'simple') {
      // Simple template validation
      if (!row['Origin']?.trim()) errors.push('Origin is required');
      if (!row['Destination']?.trim()) errors.push('Destination is required');
      if (!row['VehicleType']?.trim()) errors.push('VehicleType is required');
      if (!row['Price']?.trim()) errors.push('Price is required');
      
      const rate = normalizeNumber(row['Price']);
      if (row['Price']?.trim() && (rate === null || rate < 0)) {
        errors.push('Price must be a valid number ≥ 0');
      }
    } else {
      // Standard template validation
      if (!row['equipmentType']?.trim()) errors.push('equipmentType is required');
      if (!row['originCity']?.trim()) errors.push('originCity is required');
      if (!row['originState']?.trim()) errors.push('originState is required');
      if (!row['destinationCity']?.trim()) errors.push('destinationCity is required');
      if (!row['destinationState']?.trim()) errors.push('destinationState is required');
      if (!row['pickupDate']?.trim()) errors.push('pickupDate is required');
      if (!row['deliveryDate']?.trim()) errors.push('deliveryDate is required');
      if (!row['rate']?.trim()) errors.push('rate is required');
      
      const rate = normalizeNumber(row['rate']);
      if (row['rate']?.trim() && (rate === null || rate < 0)) {
        errors.push('rate must be a valid number ≥ 0');
      }
      
      const pickupDate = normalizeDate(row['pickupDate']);
      const deliveryDate = normalizeDate(row['deliveryDate']);
      
      if (row['pickupDate']?.trim() && !pickupDate) {
        errors.push('pickupDate must be a valid date (YYYY-MM-DD or YYYY-MM-DDTHH:mm)');
      }
      
      if (row['deliveryDate']?.trim() && !deliveryDate) {
        errors.push('deliveryDate must be a valid date (YYYY-MM-DD or YYYY-MM-DDTHH:mm)');
      }
      
      if (pickupDate && deliveryDate && pickupDate > deliveryDate) {
        errors.push('pickupDate cannot be after deliveryDate');
      }
    }
    
    return {
      status: errors.length === 0 ? 'valid' : 'invalid',
      errors
    };
  }, [normalizeNumber, normalizeDate]);

  const normalizeRowForPreview = useCallback((row: CSVRow, template: TemplateType): NormalizedPreviewRow => {
    const validation = validateRowData(row, template);
    
    if (template === 'simple') {
      return {
        title: null,
        equipmentType: row['VehicleType']?.trim() || null,
        origin: row['Origin']?.trim() || null,
        destination: row['Destination']?.trim() || null,
        pickupDate: null,
        deliveryDate: null,
        rate: normalizeNumber(row['Price']),
        status: validation.status,
        errors: validation.errors
      };
    } else {
      // Standard template
      const originParts = [
        row['originCity']?.trim(),
        row['originState']?.trim()?.toUpperCase(),
        row['originZip']?.trim()
      ].filter(Boolean);
      
      const destinationParts = [
        row['destinationCity']?.trim(),
        row['destinationState']?.trim()?.toUpperCase(),
        row['destinationZip']?.trim()
      ].filter(Boolean);
      
      return {
        title: row['title']?.trim() || null,
        equipmentType: row['equipmentType']?.trim() || null,
        origin: originParts.length > 0 ? originParts.join(', ').replace(/,\s*,/g, ',').replace(/,\s*$/, '') : null,
        destination: destinationParts.length > 0 ? destinationParts.join(', ').replace(/,\s*,/g, ',').replace(/,\s*$/, '') : null,
        pickupDate: normalizeDate(row['pickupDate']),
        deliveryDate: normalizeDate(row['deliveryDate']),
        rate: normalizeNumber(row['rate']),
        status: validation.status,
        errors: validation.errors
      };
    }
  }, [validateRowData, normalizeNumber, normalizeDate]);

  const processCSVData = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      console.log('[CSV PROCESSING] Starting row parsing and validation...');
      
      // Parse the full file content
      const { headers, rows } = await parseFileContent(selectedFile.uri, selectedFile.name);
      
      console.log(`[CSV PROCESSING] Parsed ${rows.length} rows`);
      
      // Check row limit
      if (rows.length > MAX_ROWS) {
        throw new Error(`File too large. Please split into smaller batches (≤${MAX_ROWS.toLocaleString()} rows).`);
      }
      
      // Normalize and validate all rows
      const normalized = rows.map(row => normalizeRowForPreview(row, selectedTemplate));
      
      setNormalizedRows(normalized);
      setCurrentPage(0);
      
      const validCount = normalized.filter(r => r.status === 'valid').length;
      const invalidCount = normalized.filter(r => r.status === 'invalid').length;
      
      console.log(`[CSV PROCESSING] Processed ${normalized.length} rows: ${validCount} valid, ${invalidCount} invalid`);
      
    } catch (error: any) {
      console.error('[CSV PROCESSING] Error:', error);
      throw error;
    }
  }, [selectedFile, selectedTemplate, normalizeRowForPreview]);

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
      setSelectedFile({ uri: file.uri, name: file.name });
      
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
  
  // Pagination logic for normalized rows
  const totalPages = Math.ceil(normalizedRows.length / PAGE_SIZE);
  const startIndex = currentPage * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, normalizedRows.length);
  const currentPageRows = normalizedRows.slice(startIndex, endIndex);
  
  const validCount = normalizedRows.filter(r => r.status === 'valid').length;
  const invalidCount = normalizedRows.filter(r => r.status === 'invalid').length;
  
  const toggleErrorExpansion = useCallback((index: number) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

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
                      setNormalizedRows([]);
                      setHeaderValidation(null);
                      setFileHeaders([]);
                      setSelectedFile(null);
                      setCurrentPage(0);
                      setExpandedErrors(new Set());
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
                  <Text style={[styles.bannerTitle, styles.bannerErrorTextStyle]}>
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
              onPress={async () => {
                try {
                  setIsLoading(true);
                  await processCSVData();
                  showToast('Rows parsed and validated successfully', 'success');
                } catch (error: any) {
                  console.warn(error);
                  showToast(error.message || 'Failed to process CSV data', 'error');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Eye size={16} color={theme.colors.white} />
              )}
              <Text style={styles.actionButtonText}>
                {isLoading ? 'Processing...' : 'Preview & Validate'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.importButton, normalizedRows.length > 0 && validCount > 0 ? { opacity: 1 } : {}]}
              disabled={normalizedRows.length === 0 || validCount === 0}
            >
              <Text style={styles.actionButtonText}>Import</Text>
              <Text style={styles.actionButtonSubtext}>
                {normalizedRows.length === 0 ? '(Disabled until preview)' : validCount === 0 ? '(No valid rows)' : `(${validCount} valid rows)`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {normalizedRows.length > 0 && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                Preview ({normalizedRows.length} rows)
              </Text>
              <View style={styles.countsContainer}>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>Valid {validCount}</Text>
                </View>
                <Text style={styles.countSeparator}>•</Text>
                <View style={[styles.countPill, styles.invalidCountPill]}>
                  <Text style={[styles.countText, styles.invalidCountText]}>Invalid {invalidCount}</Text>
                </View>
                <Text style={styles.countSeparator}>•</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>Total {normalizedRows.length}</Text>
                </View>
              </View>
            </View>
            
            {normalizedRows.length > MAX_ROWS && (
              <View style={styles.warningBanner}>
                <AlertCircle size={16} color={theme.colors.warning} />
                <Text style={styles.warningText}>
                  File too large. Please split into smaller batches (≤{MAX_ROWS.toLocaleString()} rows).
                </Text>
              </View>
            )}
            
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.titleColumn]}>Title</Text>
                <Text style={[styles.tableHeaderText, styles.equipmentColumn]}>Equipment</Text>
                <Text style={[styles.tableHeaderText, styles.locationColumn]}>Origin</Text>
                <Text style={[styles.tableHeaderText, styles.locationColumn]}>Destination</Text>
                <Text style={[styles.tableHeaderText, styles.dateColumn]}>Pickup</Text>
                <Text style={[styles.tableHeaderText, styles.dateColumn]}>Delivery</Text>
                <Text style={[styles.tableHeaderText, styles.rateColumn]}>Rate</Text>
                <Text style={[styles.tableHeaderText, styles.statusColumn]}>Status</Text>
              </View>
              
              {currentPageRows.map((row, index) => {
                const globalIndex = startIndex + index;
                const isExpanded = expandedErrors.has(globalIndex);
                
                return (
                  <View key={globalIndex} style={styles.tableRow}>
                    <View style={styles.tableRowContent}>
                      <Text style={[styles.tableCellText, styles.titleColumn]} numberOfLines={1}>
                        {row.title || '-'}
                      </Text>
                      <Text style={[styles.tableCellText, styles.equipmentColumn]} numberOfLines={1}>
                        {row.equipmentType || '-'}
                      </Text>
                      <Text style={[styles.tableCellText, styles.locationColumn]} numberOfLines={1}>
                        {row.origin || '-'}
                      </Text>
                      <Text style={[styles.tableCellText, styles.locationColumn]} numberOfLines={1}>
                        {row.destination || '-'}
                      </Text>
                      <Text style={[styles.tableCellText, styles.dateColumn]} numberOfLines={1}>
                        {row.pickupDate || '-'}
                      </Text>
                      <Text style={[styles.tableCellText, styles.dateColumn]} numberOfLines={1}>
                        {row.deliveryDate || '-'}
                      </Text>
                      <Text style={[styles.tableCellText, styles.rateColumn]} numberOfLines={1}>
                        {row.rate !== null ? `${row.rate.toLocaleString()}` : '-'}
                      </Text>
                      <View style={[styles.statusColumn, styles.statusContainer]}>
                        <View style={[styles.statusPill, row.status === 'valid' ? styles.validPill : styles.invalidPill]}>
                          <Text style={[styles.statusText, row.status === 'valid' ? styles.validText : styles.invalidText]}>
                            {row.status === 'valid' ? '✅ Valid' : '❌ Invalid'}
                          </Text>
                        </View>
                        {row.status === 'invalid' && row.errors.length > 0 && (
                          <TouchableOpacity
                            style={styles.errorToggle}
                            onPress={() => toggleErrorExpansion(globalIndex)}
                          >
                            <Text style={styles.errorToggleText}>
                              {isExpanded ? 'Hide errors' : 'Show errors'}
                            </Text>
                            {isExpanded ? (
                              <EyeOff size={12} color={theme.colors.danger} />
                            ) : (
                              <Eye size={12} color={theme.colors.danger} />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    {isExpanded && row.errors.length > 0 && (
                      <View style={styles.errorExpansion}>
                        {row.errors.map((error, errorIndex) => (
                          <Text key={errorIndex} style={styles.errorRowText}>
                            • {error}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft size={16} color={currentPage === 0 ? theme.colors.gray : theme.colors.primary} />
                  <Text style={[styles.paginationButtonText, currentPage === 0 && styles.paginationButtonTextDisabled]}>
                    Previous
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Page {currentPage + 1} of {totalPages}
                  </Text>
                  <Text style={styles.paginationSubtext}>
                    Showing {startIndex + 1}-{endIndex} of {normalizedRows.length}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages - 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  <Text style={[styles.paginationButtonText, currentPage === totalPages - 1 && styles.paginationButtonTextDisabled]}>
                    Next
                  </Text>
                  <ChevronRight size={16} color={currentPage === totalPages - 1 ? theme.colors.gray : theme.colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            
            {validCount > 0 && (
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
                  {isImporting ? 'Importing...' : `Import ${validCount} Valid Loads`}
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
  bannerErrorTextStyle: {
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  previewButton: {
    backgroundColor: theme.colors.primary,
    opacity: 1,
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
  previewHeader: {
    marginBottom: theme.spacing.md,
  },
  countsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  countPill: {
    backgroundColor: '#E5F3FF',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
  },
  invalidCountPill: {
    backgroundColor: '#FEE2E2',
  },
  countText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  invalidCountText: {
    color: theme.colors.danger,
  },
  countSeparator: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginHorizontal: theme.spacing.xs,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableHeaderText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.dark,
    textAlign: 'center',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableRowContent: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    textAlign: 'center',
  },
  titleColumn: {
    flex: 2,
    minWidth: 80,
  },
  equipmentColumn: {
    flex: 1.5,
    minWidth: 60,
  },
  locationColumn: {
    flex: 2,
    minWidth: 80,
  },
  dateColumn: {
    flex: 1.2,
    minWidth: 50,
  },
  rateColumn: {
    flex: 1,
    minWidth: 40,
  },
  statusColumn: {
    flex: 1.5,
    minWidth: 60,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 2,
  },
  validPill: {
    backgroundColor: '#D1FAE5',
  },
  invalidPill: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  validText: {
    color: theme.colors.success,
  },
  invalidText: {
    color: theme.colors.danger,
  },
  errorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  errorToggleText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    textDecorationLine: 'underline',
  },
  errorExpansion: {
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  errorRowText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginBottom: 2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs / 2,
  },
  paginationButtonDisabled: {
    borderColor: theme.colors.gray,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: theme.colors.gray,
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  paginationSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
});