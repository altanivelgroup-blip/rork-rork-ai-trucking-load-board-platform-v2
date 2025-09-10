import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Switch,

} from 'react-native';
import { Stack, router } from 'expo-router';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Trash2, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw, Share, History, ExternalLink } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseFileContent, validateCSVHeaders, buildSimpleTemplateCSV, buildCompleteTemplateCSV, buildCanonicalTemplateCSV, validateLoadRow, CSVRow, parseCSV } from '@/utils/csv';
import * as XLSX from 'xlsx';
import { getFirebase, ensureFirebaseAuth } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp, Timestamp, writeBatch, query, where, collection, getDocs, updateDoc, orderBy, limit } from 'firebase/firestore';
import { LOADS_COLLECTION } from '@/lib/loadSchema';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';
import { BulkImportSession } from '@/types';


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
  status: 'valid' | 'invalid' | 'duplicate';
  errors: string[];
  rowHash?: string;
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
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; webFile?: File } | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [lastBulkImportId, setLastBulkImportId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [importHistory, setImportHistory] = useState<BulkImportSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [skippedRowsData, setSkippedRowsData] = useState<NormalizedPreviewRow[]>([]);
  const toast = useToast();
  
  const PAGE_SIZE = 20;
  const MAX_ROWS = 5000;
  const BULK_IMPORTS_COLLECTION = 'bulkImports';

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    toast.show(message, type);
  }, [toast]);

  // Load import history
  const loadImportHistory = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingHistory(true);
      const { db } = getFirebase();
      
      const q = query(
        collection(db, BULK_IMPORTS_COLLECTION),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const sessions: BulkImportSession[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          userId: data.userId,
          createdAt: data.createdAt?.toDate() || new Date(),
          templateType: data.templateType,
          fileName: data.fileName,
          totals: data.totals,
          notes: data.notes
        });
      });
      
      setImportHistory(sessions);
    } catch (error) {
      console.warn('[IMPORT HISTORY] Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Create bulk import session record
  const createBulkImportSession = useCallback(async (
    bulkImportId: string,
    templateType: TemplateType,
    fileName: string,
    totals: { valid: number; skipped: number; written: number }
  ) => {
    if (!user?.id) return;
    
    try {
      const { db } = getFirebase();
      const sessionData: Omit<BulkImportSession, 'id'> = {
        userId: user.id,
        createdAt: new Date(),
        templateType,
        fileName,
        totals
      };
      
      await setDoc(doc(db, BULK_IMPORTS_COLLECTION, bulkImportId), {
        ...sessionData,
        createdAt: serverTimestamp()
      });
      
      console.log(`[BULK IMPORT] Created session record: ${bulkImportId}`);
    } catch (error) {
      console.warn('[BULK IMPORT] Error creating session record:', error);
    }
  }, [user?.id]);

  // Navigate to loads filtered by bulk import ID
  const viewBulkImportLoads = useCallback((bulkImportId: string) => {
    router.push(`/loads?bulkImportId=${bulkImportId}`);
  }, [router]);

  // Undo bulk import by ID
  const undoBulkImport = useCallback(async (bulkImportId: string) => {
    Alert.alert(
      'Undo Import',
      'This will mark all documents from this import as deleted. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUndoing(true);
              
              const authSuccess = await ensureFirebaseAuth();
              if (!authSuccess) {
                throw new Error('Authentication failed');
              }
              
              const { db } = getFirebase();
              const q = query(
                collection(db, LOADS_COLLECTION),
                where('bulkImportId', '==', bulkImportId)
              );
              
              const querySnapshot = await getDocs(q);
              const batch = writeBatch(db);
              
              querySnapshot.forEach((docSnapshot) => {
                batch.update(docSnapshot.ref, {
                  status: 'deleted',
                  deletedAt: serverTimestamp(),
                  deletedBy: user?.id || 'unknown'
                });
              });
              
              await batch.commit();
              
              showToast(`↩️ Reverted ${querySnapshot.size} documents from import`, 'success');
              
              // Refresh history
              await loadImportHistory();
              
            } catch (error: any) {
              console.error('Undo error:', error);
              showToast(error.message || 'Undo failed', 'error');
            } finally {
              setIsUndoing(false);
            }
          }
        }
      ]
    );
  }, [user?.id, showToast, loadImportHistory]);

  // Load history on component mount
  useEffect(() => {
    if (user?.id) {
      loadImportHistory();
    }
  }, [user?.id, loadImportHistory]);

  const generateLoadId = useCallback(() => {
    return 'LOAD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  const generateBulkImportId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  // Helper functions for location parsing
  const parseLocationText = useCallback((locationStr: string): { city: string; state: string; zip: string } | null => {
    if (!locationStr?.trim()) return null;
    
    // Try to parse "City, ST ZIP" format
    const parts = locationStr.trim().split(',');
    if (parts.length >= 2) {
      const city = parts[0].trim();
      const stateZipPart = parts[1].trim();
      
      // Extract state (2 letters) and zip
      const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
      if (stateZipMatch) {
        return {
          city,
          state: stateZipMatch[1],
          zip: stateZipMatch[2] || ''
        };
      }
    }
    
    return null;
  }, []);

  const toTimestampOrNull = useCallback((dateStr: string | null): Timestamp | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return Timestamp.fromDate(date);
    } catch {
      return null;
    }
  }, []);

  const stripMoney = useCallback((value: string | null | undefined): number | null => {
    if (!value?.trim()) return null;
    const cleaned = value.replace(/[$,]/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : Math.max(0, num);
  }, []);

  // Compute row hash for duplicate detection
  const computeRowHash = useCallback((row: NormalizedPreviewRow): string => {
    const hashInput = [
      row.title || '',
      row.equipmentType || '',
      row.origin || '',
      row.destination || '',
      row.pickupDate || '',
      row.deliveryDate || '',
      row.rate?.toString() || ''
    ].join('|').toLowerCase().trim();
    
    return CryptoJS.SHA1(hashInput).toString();
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
    
    let normalizedRow: NormalizedPreviewRow;
    
    if (template === 'simple') {
      normalizedRow = {
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
      
      normalizedRow = {
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
    
    // Compute and attach row hash
    normalizedRow.rowHash = computeRowHash(normalizedRow);
    
    return normalizedRow;
  }, [validateRowData, normalizeNumber, normalizeDate, computeRowHash]);

  // Transform parsed row to Firestore document format
  const toFirestoreDoc = useCallback((parsedRow: NormalizedPreviewRow, templateType: TemplateType, bulkImportId: string): any => {
    const baseDoc = {
      status: 'OPEN',
      createdBy: user?.id || 'unknown',
      createdAt: serverTimestamp(),
      bulkImportId,
      isArchived: false,
      clientCreatedAt: Date.now(),
    };

    if (templateType === 'simple') {
      // For simple template, try to parse origin/destination
      const originParsed = parseLocationText(parsedRow.origin || '');
      const destinationParsed = parseLocationText(parsedRow.destination || '');
      
      return {
        ...baseDoc,
        title: parsedRow.title || `${parsedRow.equipmentType || 'Load'} - ${parsedRow.origin} to ${parsedRow.destination}`,
        description: null,
        equipmentType: parsedRow.equipmentType,
        vehicleCount: null,
        origin: originParsed,
        destination: destinationParsed,
        originCity: parsedRow.origin, // Friendly fallback
        destCity: parsedRow.destination, // Friendly fallback
        pickupDate: null,
        deliveryDate: null,
        rate: parsedRow.rate,
        rateTotalUSD: parsedRow.rate, // Legacy compatibility
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        rowHash: parsedRow.rowHash,
      };
    } else {
      // Standard template - build structured origin/destination from normalized data
      const originParsed = parseLocationText(parsedRow.origin || '');
      const destinationParsed = parseLocationText(parsedRow.destination || '');
      
      return {
        ...baseDoc,
        title: parsedRow.title,
        description: null, // Could be mapped from original data if available
        equipmentType: parsedRow.equipmentType,
        vehicleCount: null, // Could be mapped from original data if available
        origin: originParsed,
        destination: destinationParsed,
        originCity: parsedRow.origin, // Friendly fallback
        destCity: parsedRow.destination, // Friendly fallback
        pickupDate: toTimestampOrNull(parsedRow.pickupDate),
        deliveryDate: toTimestampOrNull(parsedRow.deliveryDate),
        rate: parsedRow.rate,
        rateTotalUSD: parsedRow.rate, // Legacy compatibility
        contactName: null, // Could be mapped from original data if available
        contactEmail: null, // Could be mapped from original data if available
        contactPhone: null, // Could be mapped from original data if available
        rowHash: parsedRow.rowHash,
      };
    }
  }, [user, parseLocationText, toTimestampOrNull]);

  // Check for duplicate rows in Firestore
  const checkForDuplicates = useCallback(async (rows: NormalizedPreviewRow[]): Promise<NormalizedPreviewRow[]> => {
    if (rows.length === 0) return rows;
    
    try {
      const { db } = getFirebase();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const rowHashes = rows.map(row => row.rowHash).filter(Boolean) as string[];
      
      if (rowHashes.length === 0) return rows;
      
      // Query for existing documents with the same hashes
      // Note: Firestore 'in' queries are limited to 30 items, so we need to batch
      const batchSize = 30;
      const existingHashes = new Set<string>();
      
      for (let i = 0; i < rowHashes.length; i += batchSize) {
        const batchHashes = rowHashes.slice(i, i + batchSize);
        
        const q = query(
          collection(db, LOADS_COLLECTION),
          where('rowHash', 'in', batchHashes),
          where('status', '!=', 'deleted'),
          where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.rowHash) {
            existingHashes.add(data.rowHash);
          }
        });
      }
      
      // Mark duplicate rows
      return rows.map(row => {
        if (row.rowHash && existingHashes.has(row.rowHash)) {
          return {
            ...row,
            status: 'duplicate' as const,
            errors: [...row.errors, 'Duplicate (existing recent load)']
          };
        }
        return row;
      });
      
    } catch (error) {
      console.warn('[DUPLICATE CHECK] Error checking for duplicates:', error);
      // If duplicate check fails, return original rows without marking duplicates
      return rows;
    }
  }, []);

  const processCSVData = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      console.log('[CSV PROCESSING] Starting row parsing and validation...');
      
      let headers: string[];
      let rows: CSVRow[];
      
      if (Platform.OS === 'web' && selectedFile.webFile) {
        // Web path: use the File object directly
        const text = await selectedFile.webFile.text();
        const parsed = parseCSV(text);
        headers = parsed.headers;
        rows = parsed.rows;
      } else if (selectedFile.uri) {
        // Native path: use FileSystem or parseFileContent
        const parsed = await parseFileContent(selectedFile.uri, selectedFile.name);
        headers = parsed.headers;
        rows = parsed.rows;
      } else {
        throw new Error('No file data available for processing');
      }
      
      console.log(`[CSV PROCESSING] Parsed ${rows.length} rows`);
      
      // Check row limit
      if (rows.length > MAX_ROWS) {
        throw new Error(`File too large. Please split into smaller batches (≤${MAX_ROWS.toLocaleString()} rows).`);
      }
      
      // Normalize and validate all rows
      const normalized = rows.map(row => normalizeRowForPreview(row, selectedTemplate));
      
      // Check for duplicates
      const normalizedWithDuplicateCheck = await checkForDuplicates(normalized);
      
      setNormalizedRows(normalizedWithDuplicateCheck);
      setCurrentPage(0);
      
      const validCount = normalizedWithDuplicateCheck.filter(r => r.status === 'valid').length;
      const invalidCount = normalizedWithDuplicateCheck.filter(r => r.status === 'invalid').length;
      const duplicateCount = normalizedWithDuplicateCheck.filter(r => r.status === 'duplicate').length;
      
      console.log(`[CSV PROCESSING] Processed ${normalizedWithDuplicateCheck.length} rows: ${validCount} valid, ${invalidCount} invalid, ${duplicateCount} duplicates`);
      
    } catch (error: any) {
      console.error('[CSV PROCESSING] Error:', error);
      throw error;
    }
  }, [selectedFile, selectedTemplate, normalizeRowForPreview, checkForDuplicates]);

  // Use web vs native paths. Keep it tiny and defensive.
  const readHeaderLine = useCallback(async (opts?: {
    webFile?: File;
    nativePick?: boolean;
  }): Promise<{ ok: true; headersLine: string; fileName: string; uri?: string; webFile?: File } | { ok: false; message: string }> => {
    try {
      // 1) Web path: <input type="file"> gives us a File
      if (Platform.OS === "web") {
        const f = opts?.webFile;
        if (!f) return { ok: false, message: "No file selected." };

        // Reject Excel for header-read step
        if (/\.(xlsx?|xls)$/i.test(f.name)) {
          return { ok: false, message: "Excel not supported in header check. Please upload a CSV." };
        }

        const text = await f.text();
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        return { ok: true, headersLine: firstLine, fileName: f.name, webFile: f };
      }

      // 2) Native path: use DocumentPicker + Expo FileSystem
      if (opts?.nativePick) {
        const res = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: false,
          type: ["text/csv", "text/plain", "application/vnd.ms-excel"],
        });

        if (res.canceled) return { ok: false, message: "File selection canceled." };
        const asset = res.assets?.[0];
        if (!asset?.uri) return { ok: false, message: "No file URI returned." };

        const name = asset.name ?? "selected.csv";
        if (/\.(xlsx?|xls)$/i.test(name)) {
          return { ok: false, message: "Excel not supported in header check. Please upload a CSV." };
        }

        if (!FileSystem || !FileSystem.readAsStringAsync) {
          return { ok: false, message: "FileSystem unavailable. Did you install expo-file-system?" };
        }

        const content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const firstLine = content.split(/\r?\n/)[0] ?? "";
        return { ok: true, headersLine: firstLine, fileName: name, uri: asset.uri };
      }

      return { ok: false, message: "Unsupported file selection flow." };
    } catch (err: any) {
      console.warn("Header read error", err);
      return { ok: false, message: "CSV read error. See console for details." };
    }
  }, []);

  // Web file input change handler
  const onWebFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const res = await readHeaderLine({ webFile: file });
    if (!res.ok) return showToast(res.message, 'error');
    handleHeadersLine(res.headersLine, res.fileName, res.uri, res.webFile);
  }, [readHeaderLine, showToast]);

  // Native file picker handler
  const onPickNativeFile = useCallback(async () => {
    const res = await readHeaderLine({ nativePick: true });
    if (!res.ok) return showToast(res.message, 'error');
    handleHeadersLine(res.headersLine, res.fileName, res.uri, res.webFile);
  }, [readHeaderLine, showToast]);

  // Common header processing logic
  const handleHeadersLine = useCallback((headersLine: string, fileName: string, uri?: string, webFile?: File) => {
    try {
      // Parse headers from the first line
      const headers = headersLine.split(',').map(h => h.replace(/"/g, '').trim());
      
      console.log('Headers:', headers);
      
      setFileHeaders(headers);
      setSelectedFile({ 
        uri: uri || '', 
        name: fileName,
        webFile: webFile
      });
      
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
      console.error('Header processing error:', error);
      showToast(error.message || 'Header processing failed', 'error');
    }
  }, [selectedTemplate, showToast]);

  const handleFileSelect = useCallback(async () => {
    try {
      setIsLoading(true);
      setHeaderValidation(null);
      setProcessedRows([]);
      setFileHeaders([]);
      setNormalizedRows([]);
      setSelectedFile(null);
      
      if (Platform.OS === 'web') {
        // Create a file input for web
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt';
        input.multiple = false;
        
        const filePromise = new Promise<File | null>((resolve) => {
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            resolve(files?.[0] || null);
          };
          input.oncancel = () => resolve(null);
        });
        
        input.click();
        const webFile = await filePromise;
        
        if (!webFile) {
          return;
        }
        
        // Directly call the header processing logic for web files
        const res = await readHeaderLine({ webFile });
        if (!res.ok) {
          showToast(res.message, 'error');
          return;
        }
        handleHeadersLine(res.headersLine, res.fileName, res.uri, res.webFile);
      } else {
        // Native file picker
        await onPickNativeFile();
      }
      
    } catch (error: any) {
      console.error('File select error:', error);
      console.warn(error);
      const errorMessage = error.message || 'CSV read error';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onWebFileChange, onPickNativeFile, showToast]);

  const removeRow = useCallback((index: number) => {
    setProcessedRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const performImport = useCallback(async (dryRun: boolean = false) => {
    try {
      setIsImporting(true);
      setImportProgress({ current: 0, total: 0 });
      setImportSummary(null);
      
      console.log(`[BULK UPLOAD] Starting ${dryRun ? 'simulation' : 'import'} process...`);
      
      if (!dryRun) {
        const authSuccess = await ensureFirebaseAuth();
        if (!authSuccess) {
          throw new Error('Authentication failed. Please try again.');
        }
      }
      
      const validRows = normalizedRows.filter(row => row.status === 'valid');
      const invalidRows = normalizedRows.filter(row => row.status === 'invalid');
      const duplicateRows = normalizedRows.filter(row => row.status === 'duplicate');
      const skippedRows = [...invalidRows, ...duplicateRows];
      
      if (validRows.length === 0) {
        throw new Error('No valid rows to import');
      }
      
      setImportProgress({ current: 0, total: validRows.length });
      
      if (dryRun) {
        // In dry run, also check for duplicates among the valid rows
        const validRowsWithDuplicateCheck = await checkForDuplicates(validRows);
        const finalValidRows = validRowsWithDuplicateCheck.filter(row => row.status === 'valid');
        const newDuplicates = validRowsWithDuplicateCheck.filter(row => row.status === 'duplicate');
        
        // Simulate processing
        for (let i = 0; i < finalValidRows.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for UI
          setImportProgress({ current: i + 1, total: finalValidRows.length });
        }
        
        setImportSummary({
          imported: finalValidRows.length,
          skipped: skippedRows.length + newDuplicates.length,
          total: normalizedRows.length
        });
        
        showToast(`Simulation complete: ${finalValidRows.length} rows would be imported, ${newDuplicates.length} additional duplicates found`, 'success');
        return;
      }
      
      // Real import - check for duplicates one more time before writing
      const { db } = getFirebase();
      const bulkImportId = generateBulkImportId();
      const BATCH_SIZE = 400;
      let imported = 0;
      let skippedDuplicates = 0;
      
      console.log(`[BULK UPLOAD] Processing ${validRows.length} valid rows with bulk ID: ${bulkImportId}`);
      
      // Process in batches with duplicate checking
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batchRows = validRows.slice(i, Math.min(i + BATCH_SIZE, validRows.length));
        
        // Check this batch for duplicates before writing
        const batchWithDuplicateCheck = await checkForDuplicates(batchRows);
        const batchValidRows = batchWithDuplicateCheck.filter(row => row.status === 'valid');
        const batchDuplicates = batchWithDuplicateCheck.filter(row => row.status === 'duplicate');
        
        skippedDuplicates += batchDuplicates.length;
        
        if (batchValidRows.length > 0) {
          const batch = writeBatch(db);
          
          for (const row of batchValidRows) {
            const docId = generateLoadId();
            const docData = toFirestoreDoc(row, selectedTemplate, bulkImportId);
            const docRef = doc(db, LOADS_COLLECTION, docId);
            batch.set(docRef, docData);
          }
          
          try {
            await batch.commit();
            imported += batchValidRows.length;
            console.log(`[BULK UPLOAD] Batch completed: ${imported}/${validRows.length}, skipped ${batchDuplicates.length} duplicates`);
          } catch (error: any) {
            console.error(`[BULK UPLOAD] Batch failed at ${imported}/${validRows.length}:`, error);
            throw new Error(`Import failed after ${imported} rows. ${error.message}`);
          }
        }
        
        setImportProgress({ current: i + batchRows.length, total: validRows.length });
      }
      
      setLastBulkImportId(bulkImportId);
      const finalSummary = {
        imported: imported,
        skipped: skippedRows.length + skippedDuplicates,
        total: normalizedRows.length
      };
      setImportSummary(finalSummary);
      
      // Store skipped rows for download
      setSkippedRowsData([...skippedRows, ...normalizedRows.filter(r => r.status === 'duplicate')]);
      
      // Create bulk import session record
      await createBulkImportSession(
        bulkImportId,
        selectedTemplate,
        selectedFile?.name || 'unknown.csv',
        {
          valid: validRows.length,
          skipped: skippedRows.length + skippedDuplicates,
          written: imported
        }
      );
      
      // Refresh history
      await loadImportHistory();
      
      console.log(`[BULK UPLOAD] Import completed successfully. Imported ${imported} loads, skipped ${skippedDuplicates} duplicates.`);
      showToast(`Successfully imported ${imported} loads${skippedDuplicates > 0 ? `, skipped ${skippedDuplicates} duplicates` : ''}`, 'success');
      
      // Store the last bulk import ID for easy access
      try {
        await AsyncStorage.setItem('lastBulkImportId', bulkImportId);
        console.log(`[BULK UPLOAD] Stored lastBulkImportId: ${bulkImportId}`);
      } catch (error) {
        console.warn('[BULK UPLOAD] Failed to store last bulk import ID:', error);
      }
      
      // Force refresh loads to show the newly imported loads
      console.log('[BULK UPLOAD] Triggering loads refresh...');
      // Note: The loads will be automatically refreshed by the Firestore listener in useLoads
      
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.message || `${dryRun ? 'Simulation' : 'Import'} failed. Please try again.`;
      showToast(errorMessage, 'error');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  }, [normalizedRows, selectedTemplate, generateBulkImportId, generateLoadId, toFirestoreDoc, showToast, checkForDuplicates]);

  const handleImport = useCallback(async () => {
    if (!isDryRun && !user) {
      showToast('Sign in required', 'error');
      return;
    }

    const validRows = normalizedRows.filter(row => row.status === 'valid');
    
    if (validRows.length === 0) {
      showToast('No valid rows to import', 'error');
      return;
    }

    if (isDryRun) {
      await performImport(true);
    } else {
      Alert.alert(
        'Confirm Import',
        `Import ${validRows.length} loads to Firestore?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import', onPress: () => performImport(false) }
        ]
      );
    }
  }, [isDryRun, user, normalizedRows, showToast, performImport]);

  const downloadSkippedRows = useCallback(async (rowsToDownload?: NormalizedPreviewRow[]) => {
    const skippedRows = rowsToDownload || normalizedRows.filter(row => row.status === 'invalid' || row.status === 'duplicate');
    
    if (skippedRows.length === 0) {
      showToast('No skipped rows to download', 'error');
      return;
    }

    // Build CSV content with error reasons
    const headers = ['rowNumber', 'errorReasons', 'title', 'equipmentType', 'origin', 'destination', 'pickupDate', 'deliveryDate', 'rate'];
    const csvRows = skippedRows.map((row, index) => {
      return [
        (index + 1).toString(),
        row.errors.join('; '),
        row.title || '',
        row.equipmentType || '',
        row.origin || '',
        row.destination || '',
        row.pickupDate || '',
        row.deliveryDate || '',
        row.rate?.toString() || ''
      ];
    });
    
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const filename = `skipped_rows_${Date.now()}.csv`;
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Skipped rows downloaded', 'success');
    } else {
      try {
        const FileSystem = await import('expo-file-system');
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          showToast('File saved to device', 'success');
        }
      } catch (error) {
        console.error('Error sharing file:', error);
        showToast('Error downloading file', 'error');
      }
    }
  }, [normalizedRows, showToast]);

  // Download skipped rows from history
  const downloadHistorySkippedRows = useCallback(async (session: BulkImportSession) => {
    // For now, we'll show a message that this feature requires stored error data
    // In a full implementation, you'd store the skipped rows data in the session
    showToast('Skipped rows data not available for historical imports', 'error');
  }, [showToast]);

  const undoLastImport = useCallback(async () => {
    if (!lastBulkImportId) {
      showToast('No recent import to undo', 'error');
      return;
    }

    Alert.alert(
      'Undo Last Import',
      'This will mark all documents from the last import as deleted. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUndoing(true);
              
              const authSuccess = await ensureFirebaseAuth();
              if (!authSuccess) {
                throw new Error('Authentication failed');
              }
              
              const { db } = getFirebase();
              const q = query(
                collection(db, LOADS_COLLECTION),
                where('bulkImportId', '==', lastBulkImportId)
              );
              
              const querySnapshot = await getDocs(q);
              const batch = writeBatch(db);
              
              querySnapshot.forEach((docSnapshot) => {
                batch.update(docSnapshot.ref, {
                  status: 'deleted',
                  deletedAt: serverTimestamp(),
                  deletedBy: user?.id || 'unknown'
                });
              });
              
              await batch.commit();
              
              showToast(`↩️ Reverted ${querySnapshot.size} documents from last import`, 'success');
              setLastBulkImportId(null);
              
            } catch (error: any) {
              console.error('Undo error:', error);
              showToast(error.message || 'Undo failed', 'error');
            } finally {
              setIsUndoing(false);
            }
          }
        }
      ]
    );
  }, [lastBulkImportId, user, showToast]);



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
  const duplicateCount = normalizedRows.filter(r => r.status === 'duplicate').length;
  
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
            
            <View style={styles.importSection}>
              <View style={styles.dryRunContainer}>
                <View style={styles.dryRunToggle}>
                  <Text style={styles.dryRunLabel}>Dry Run (no writes)</Text>
                  <Switch
                    value={isDryRun}
                    onValueChange={setIsDryRun}
                    trackColor={{ false: theme.colors.gray, true: theme.colors.primary }}
                    thumbColor={isDryRun ? theme.colors.white : theme.colors.white}
                  />
                </View>
                <Text style={styles.dryRunDescription}>
                  {isDryRun ? 'Simulate import without writing to database' : 'Perform actual import to database'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.importButton, normalizedRows.length > 0 && validCount > 0 ? { opacity: 1 } : {}]}
                onPress={handleImport}
                disabled={normalizedRows.length === 0 || validCount === 0 || isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <CheckCircle size={16} color={theme.colors.white} />
                )}
                <Text style={styles.actionButtonText}>
                  {isImporting ? 'Processing...' : isDryRun ? `Simulate Import (${validCount} valid)` : `Import ${validCount} Valid Rows`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress Bar */}
        {isImporting && importProgress.total > 0 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Processed {importProgress.current} / {importProgress.total}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(importProgress.current / importProgress.total) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Import Summary */}
        {importSummary && (
          <View style={styles.summaryBanner}>
            <CheckCircle size={20} color={theme.colors.success} />
            <Text style={styles.summaryText}>
              ✅ {isDryRun ? 'Simulated' : 'Imported'} {importSummary.imported} • ❗Skipped {importSummary.skipped} • Total {importSummary.total}
            </Text>
          </View>
        )}

        {/* Import History Panel */}
        <View style={styles.historyContainer}>
          <TouchableOpacity
            style={styles.historyHeader}
            onPress={() => setShowHistory(!showHistory)}
          >
            <View style={styles.historyHeaderLeft}>
              <History size={20} color={theme.colors.primary} />
              <Text style={styles.historyTitle}>Import History</Text>
            </View>
            <ChevronDown 
              size={16} 
              color={theme.colors.gray} 
              style={[styles.historyChevron, showHistory && styles.historyChevronRotated]} 
            />
          </TouchableOpacity>
          
          {showHistory && (
            <View style={styles.historyContent}>
              {isLoadingHistory ? (
                <View style={styles.historyLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.historyLoadingText}>Loading history...</Text>
                </View>
              ) : importHistory.length === 0 ? (
                <Text style={styles.historyEmpty}>No import history found</Text>
              ) : (
                importHistory.map((session) => (
                  <View key={session.id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemDate}>
                        {session.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <View style={styles.historyItemStats}>
                        <Text style={styles.historyItemStat}>
                          {session.totals.written} written
                        </Text>
                        <Text style={styles.historyItemStatSeparator}>•</Text>
                        <Text style={styles.historyItemStat}>
                          {session.totals.skipped} skipped
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.historyItemFile}>
                      {session.fileName} ({session.templateType})
                    </Text>
                    
                    <View style={styles.historyItemActions}>
                      <TouchableOpacity
                        style={styles.historyAction}
                        onPress={() => viewBulkImportLoads(session.id)}
                      >
                        <ExternalLink size={14} color={theme.colors.primary} />
                        <Text style={styles.historyActionText}>View Loads</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.historyAction}
                        onPress={() => undoBulkImport(session.id)}
                        disabled={isUndoing}
                      >
                        {isUndoing ? (
                          <ActivityIndicator size={14} color={theme.colors.danger} />
                        ) : (
                          <RotateCcw size={14} color={theme.colors.danger} />
                        )}
                        <Text style={[styles.historyActionText, styles.historyActionDanger]}>
                          Undo
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.historyAction}
                        onPress={() => downloadHistorySkippedRows(session)}
                      >
                        <Download size={14} color={theme.colors.gray} />
                        <Text style={[styles.historyActionText, styles.historyActionSecondary]}>
                          Skipped CSV
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {normalizedRows.length > 0 && importSummary && (
          <View style={styles.postImportActions}>
            {importSummary.skipped > 0 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => downloadSkippedRows(skippedRowsData.length > 0 ? skippedRowsData : undefined)}
              >
                <Download size={16} color={theme.colors.primary} />
                <Text style={styles.secondaryButtonText}>Download Skipped Rows (.csv)</Text>
              </TouchableOpacity>
            )}
            
            {lastBulkImportId && !isDryRun && (
              <TouchableOpacity
                style={[styles.secondaryButton, styles.undoButton]}
                onPress={undoLastImport}
                disabled={isUndoing}
              >
                {isUndoing ? (
                  <ActivityIndicator size={16} color={theme.colors.danger} />
                ) : (
                  <RotateCcw size={16} color={theme.colors.danger} />
                )}
                <Text style={[styles.secondaryButtonText, styles.undoButtonText]}>
                  {isUndoing ? 'Undoing...' : 'Undo last import'}
                </Text>
              </TouchableOpacity>
            )}
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
                {duplicateCount > 0 && (
                  <>
                    <Text style={styles.countSeparator}>•</Text>
                    <View style={[styles.countPill, styles.duplicateCountPill]}>
                      <Text style={[styles.countText, styles.duplicateCountText]}>Duplicate {duplicateCount}</Text>
                    </View>
                  </>
                )}
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
                        <View style={[
                          styles.statusPill, 
                          row.status === 'valid' ? styles.validPill : 
                          row.status === 'duplicate' ? styles.duplicatePill : styles.invalidPill
                        ]}>
                          <Text style={[
                            styles.statusText, 
                            row.status === 'valid' ? styles.validText : 
                            row.status === 'duplicate' ? styles.duplicateText : styles.invalidText
                          ]}>
                            {row.status === 'valid' ? '✅ Valid' : 
                             row.status === 'duplicate' ? '🔄 Duplicate' : '❌ Invalid'}
                          </Text>
                        </View>
                        {(row.status === 'invalid' || row.status === 'duplicate') && row.errors.length > 0 && (
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
  importSection: {
    gap: theme.spacing.sm,
  },
  dryRunContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dryRunToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dryRunLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  dryRunDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  progressContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  postImportActions: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  undoButton: {
    borderColor: theme.colors.danger,
  },
  undoButtonText: {
    color: theme.colors.danger,
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
  duplicateCountPill: {
    backgroundColor: '#FEF3C7',
  },
  countText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  invalidCountText: {
    color: theme.colors.danger,
  },
  duplicateCountText: {
    color: theme.colors.warning,
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
  duplicatePill: {
    backgroundColor: '#FEF3C7',
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
  duplicateText: {
    color: theme.colors.warning,
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
  historyContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  historyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  historyChevron: {
    transform: [{ rotate: '0deg' }],
  },
  historyChevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  historyContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  historyLoadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  historyEmpty: {
    textAlign: 'center',
    padding: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  historyItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  historyItemDate: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  historyItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  historyItemStat: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  historyItemStatSeparator: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  historyItemFile: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  historyItemActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  historyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  historyActionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  historyActionDanger: {
    color: theme.colors.danger,
  },
  historyActionSecondary: {
    color: theme.colors.gray,
  },
});