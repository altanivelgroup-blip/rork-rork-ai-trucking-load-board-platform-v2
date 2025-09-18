import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Info } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { parseCSV, CSVRow, buildCanonicalTemplateCSV, buildSimpleTemplateCSV, buildCompleteTemplateCSV } from '@/utils/csv';
import { getFirebase, ensureFirebaseAuth, checkFirebasePermissions } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LOADS_COLLECTION } from '@/lib/loadSchema';
import HeaderBack from '@/components/HeaderBack';
import { useToast } from '@/components/Toast';

// Canonical columns we accept for full template
const CANONICAL_HEADERS = [
  // Basic Load Information
  'title', 'description', 'loadType', 'reference',
  // Origin Details
  'originCity', 'originState', 'originZip', 'originAddress', 'originCompany', 'originContact', 'originPhone', 'originEmail',
  // Destination Details
  'destinationCity', 'destinationState', 'destinationZip', 'destinationAddress', 'destinationCompany', 'destinationContact', 'destinationPhone', 'destinationEmail',
  // Scheduling
  'pickupDate', 'pickupTime', 'deliveryDate', 'deliveryTime', 'timeZone', 'appointmentRequired', 'flexibleTiming',
  // Equipment & Cargo
  'vehicleType', 'weight', 'dimensions', 'pieces', 'commodityType', 'hazmat', 'temperature', 'specialEquipment',
  // Pricing
  'rate', 'rateType', 'ratePerMile', 'distance', 'fuelSurcharge', 'accessorials', 'totalRate',
  // Requirements & Instructions
  'specialRequirements', 'loadingInstructions', 'deliveryInstructions', 'driverRequirements', 'insuranceRequirements',
  // Contact & Documentation
  'primaryContact', 'primaryPhone', 'primaryEmail', 'backupContact', 'backupPhone', 'backupEmail',
  'bolRequired', 'podRequired', 'signatureRequired', 'photoRequired', 'documentsRequired',
  // Additional Information
  'notes', 'internalNotes', 'customerReference', 'poNumber', 'priority', 'expedited'
] as const;

// Header synonyms mapping
const HEADER_MAP: Record<string, string[]> = {
  // Basic Load Information
  title:              ['loadtitle','title_text','name','load_title'],
  description:        ['desc','notes','note','details','load_description'],
  loadType:           ['load_type','cargo_type','freight_type','commodity_type'],
  reference:          ['ref','reference_number','load_reference','job_number'],
  
  // Origin Details
  originCity:         ['origin','pickupcity','fromcity','origin_city','origincity','from','pickup city','pickup_city'],
  originState:        ['origin_state','pickup_state','from_state','origin_st'],
  originZip:          ['origin_zip','pickup_zip','from_zip','origin_zipcode','origin_postal'],
  originAddress:      ['origin_address','pickup_address','from_address','origin_addr'],
  originCompany:      ['origin_company','pickup_company','from_company','shipper_company'],
  originContact:      ['origin_contact','pickup_contact','from_contact','shipper_contact'],
  originPhone:        ['origin_phone','pickup_phone','from_phone','shipper_phone'],
  originEmail:        ['origin_email','pickup_email','from_email','shipper_email'],
  
  // Destination Details
  destinationCity:    ['destination','destcity','tocity','dropoffcity','destinationcity','to','dropoff city','dest_city'],
  destinationState:   ['destination_state','dest_state','dropoff_state','to_state','dest_st'],
  destinationZip:     ['destination_zip','dest_zip','dropoff_zip','to_zip','destination_zipcode','dest_postal'],
  destinationAddress: ['destination_address','dest_address','dropoff_address','to_address','dest_addr'],
  destinationCompany: ['destination_company','dest_company','dropoff_company','consignee_company','receiver_company'],
  destinationContact: ['destination_contact','dest_contact','dropoff_contact','consignee_contact','receiver_contact'],
  destinationPhone:   ['destination_phone','dest_phone','dropoff_phone','consignee_phone','receiver_phone'],
  destinationEmail:   ['destination_email','dest_email','dropoff_email','consignee_email','receiver_email'],
  
  // Scheduling
  pickupDate:         ['pickup','pickup_at','pickupdate','pickupdateLocal','pickup date','pickup_date'],
  pickupTime:         ['pickup_time','pickup_at_time','pickup_hour'],
  deliveryDate:       ['delivery','delivery_at','deliverydate','deliverydatelocal','dropoff_at','delivery date','delivery_date'],
  deliveryTime:       ['delivery_time','dropoff_time','delivery_at_time','delivery_hour'],
  timeZone:           ['timezone','tz','time_zone','zone'],
  appointmentRequired:['appointment_required','appointment','appt_required','scheduled'],
  flexibleTiming:     ['flexible_timing','flexible','timing_flexibility'],
  
  // Equipment & Cargo
  vehicleType:        ['equipment','equipmenttype','type','vehicle_type','vehicletype','trailer_type'],
  weight:             ['weightlbs','wt','totalweight','weight_lbs','gross_weight'],
  dimensions:         ['dims','size','dimensions','length_width_height','lwh'],
  pieces:             ['piece_count','count','quantity','units','pallets'],
  commodityType:      ['commodity_type','commodity','cargo_type','product_type'],
  hazmat:             ['hazmat','hazardous','dangerous_goods','haz_mat'],
  temperature:        ['temp','temperature','temp_requirements','temp_control'],
  specialEquipment:   ['special_equipment','equipment_needed','special_gear'],
  
  // Pricing
  rate:               ['price','revenue','pay','revenueusd','amount','total','price_usd','rateusd','base_rate'],
  rateType:           ['rate_type','pricing_type','rate_method'],
  ratePerMile:        ['rate_per_mile','rpm','price_per_mile','per_mile_rate'],
  distance:           ['miles','mi','distance_mi','total_miles','mileage'],
  fuelSurcharge:      ['fuel_surcharge','fuel_charge','fsc'],
  accessorials:       ['accessorials','additional_charges','extras','add_ons'],
  totalRate:          ['total_rate','total_price','final_rate','all_in_rate'],
  
  // Requirements & Instructions
  specialRequirements:['special_requirements','special','requirements','specs','special_instructions'],
  loadingInstructions:['loading_instructions','loading_notes','pickup_instructions','loading_info'],
  deliveryInstructions:['delivery_instructions','delivery_notes','dropoff_instructions','delivery_info'],
  driverRequirements: ['driver_requirements','driver_specs','driver_qualifications'],
  insuranceRequirements:['insurance_requirements','insurance_specs','coverage_requirements'],
  
  // Contact & Documentation
  primaryContact:     ['primary_contact','main_contact','contact_name','contact'],
  primaryPhone:       ['primary_phone','main_phone','contact_phone','phone'],
  primaryEmail:       ['primary_email','main_email','contact_email','email'],
  backupContact:      ['backup_contact','secondary_contact','alt_contact'],
  backupPhone:        ['backup_phone','secondary_phone','alt_phone'],
  backupEmail:        ['backup_email','secondary_email','alt_email'],
  bolRequired:        ['bol_required','bill_of_lading','bol'],
  podRequired:        ['pod_required','proof_of_delivery','pod'],
  signatureRequired:  ['signature_required','signature','sig_required'],
  photoRequired:      ['photo_required','photos','pictures_required'],
  documentsRequired:  ['documents_required','docs_required','paperwork'],
  
  // Additional Information
  notes:              ['additional_notes','comments','remarks','extra_info','general_notes'],
  internalNotes:      ['internal_notes','private_notes','office_notes'],
  customerReference:  ['customer_reference','customer_ref','cust_ref'],
  poNumber:           ['po_number','purchase_order','po','po_num'],
  priority:           ['priority','urgency','importance'],
  expedited:          ['expedited','rush','urgent','asap'],
};

const TYPE_MAP: Record<string, string> = {
  'car hauler':'Car Hauler', 'car-hauler':'Car Hauler',
  'box truck':'Box Truck', 'cargo van':'Cargo Van',
  'flatbed':'Flatbed', 'reefer':'Reefer',
};

type Canonical = {
  title: string;
  description: string;
  originCity: string;
  originState?: string;
  originZip?: string;
  originAddress?: string;
  destinationCity: string;
  destState?: string;
  destinationZip?: string;
  destinationAddress?: string;
  pickupDate: string;    // normalized local string: YYYY-MM-DD HH:mm
  deliveryDate: string;  // normalized local string: YYYY-MM-DD HH:mm
  timeZone?: string;
  vehicleType: string;   // one of VEHICLE_ALLOWED
  weight: number;        // > 0
  rate: number;          // > 0
  ratePerMile?: number;
  distance?: number;
  specialRequirements?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  loadType?: string;
  dimensions?: string;
  hazmat?: string;
  temperature?: string;
  notes?: string;
};

type RowReason = { field: string; message: string };

interface ProcessedRow {
  original: CSVRow;
  parsed: Canonical | null;
  reasons: RowReason[];
  skip: boolean;
}

export default function CSVImportScreen() {
  const { user } = useAuth();

  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [showReasons, setShowReasons] = useState<boolean>(true);
  const toast = useToast();

  const hasAccess = (user?.membershipTier ?? 'basic') !== 'basic';

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    toast.show(message, type);
  }, [toast]);

  const normalizeHeader = useCallback((h: string) => {
    const key = h.trim().toLowerCase();
    for (const can of Object.keys(HEADER_MAP)) {
      const arr = HEADER_MAP[can];
      if (arr.some(a => a.toLowerCase() === key)) return can;
    }
    const canon = (CANONICAL_HEADERS as readonly string[]).find(c => c.toLowerCase() === key);
    if (canon) return canon;
    return h.trim();
  }, []);

  const parseMoney = (v: string): number => {
    if (!v) return NaN;
    const cleaned = v.replace(/[$,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const parseNumber = (v: string): number => {
    if (!v) return NaN;
    const cleaned = v.replace(/[,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const parseDateFlexible = (v: string, fallbackTime: string | null): { ok: boolean; out?: string; reason?: string } => {
    const formats = ['YYYY-MM-DD HH:mm','YYYY-MM-DDTHH:mm','M/D/YYYY H:mm','M/D/YY H:mm','YYYY-MM-DD'];
    const s = (v ?? '').trim();
    const fail = { ok: false, reason: `invalid format; accepted: ${formats.join(', ')}` } as const;
    if (!s) return fail;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const tryBuild = (y: number, m: number, d: number, hh: number, mm: number) => {
      const dt = new Date(y, m - 1, d, hh, mm);
      if (isNaN(dt.getTime())) return undefined;
      const out = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      return out;
    };
    const m1 = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})[ T]([0-9]{2}):([0-9]{2})$/);
    if (m1) {
      const out = tryBuild(Number(m1[1]), Number(m1[2]), Number(m1[3]), Number(m1[4]), Number(m1[5]));
      return out ? { ok: true, out } : fail;
    }
    const m2 = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    if (m2) {
      const [hh, mm] = (fallbackTime ?? '09:00').split(':').map(x => Number(x));
      const out = tryBuild(Number(m2[1]), Number(m2[2]), Number(m2[3]), Number(hh), Number(mm));
      return out ? { ok: true, out } : fail;
    }
    const m3 = s.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})\s+([0-9]{1,2}):([0-9]{2})$/);
    if (m3) {
      const yy = Number(m3[3]);
      const y = yy < 100 ? 2000 + yy : yy;
      const out = tryBuild(y, Number(m3[1]), Number(m3[2]), Number(m3[4]), Number(m3[5]));
      return out ? { ok: true, out } : fail;
    }
    return fail;
  };

  const normalizeVehicleType = (v: string): { ok: boolean; out?: string; reason?: string; normalized?: string } => {
    const s = (v ?? '').toString().trim().toLowerCase().replace(/-/g, ' ');
    const mapped = TYPE_MAP[s];
    if (mapped) return { ok: true, out: mapped, normalized: mapped };
    const found = (Object.values(TYPE_MAP) as string[]).find(t => t.toLowerCase() === s);
    if (found) return { ok: true, out: found, normalized: found };
    return { ok: false, reason: `vehicleType must be one of ${[...new Set(Object.values(TYPE_MAP))].join(', ')}` };
  };

  const processCSVData = useCallback((headersRaw: string[], rows: CSVRow[]) => {
    console.log('[CSV] Raw headers:', headersRaw);
    const headers = headersRaw.map(normalizeHeader);
    console.log('[CSV] Normalized headers:', headers);

    const out: ProcessedRow[] = rows.map((row) => {
      const reasons: RowReason[] = [];

      const getByHeaderName = (name: string): string => {
        const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
        return key ? (row[key] ?? '') : '';
      };

      const get = (canonicalKey: string): string => {
        // try exact canonical
        const exact = headers.findIndex(h => h.toLowerCase() === canonicalKey.toLowerCase());
        if (exact >= 0) {
          const key = Object.keys(row)[exact];
          return (row[key] ?? '').trim();
        }
        // try synonyms
        const alts = HEADER_MAP[canonicalKey];
        if (alts) {
          for (const a of alts) {
            const idx = headers.findIndex(h => h.toLowerCase() === a.toLowerCase());
            if (idx >= 0) {
              const key = Object.keys(row)[idx];
              return (row[key] ?? '').trim();
            }
          }
        }
        return '';
      };

      const simpleHeaders = ['Origin','Destination','Vehicle Type','Weight','Price'];
      const isSimple = simpleHeaders.every(h => Object.keys(row).some(rh => rh.trim().toLowerCase() === h.toLowerCase()));

      let title = get('title');
      let description = get('description');
      let origin = get('originCity');
      let originState = get('originState');
      let originZip = get('originZip');
      let originAddress = get('originAddress');
      let destination = get('destinationCity');
      let destState = get('destinationState');
      let destZip = get('destinationZip');
      let destAddress = get('destinationAddress');
      let pickup = get('pickupDate');
      let pickupTime = get('pickupTime');
      let delivery = get('deliveryDate');
      let deliveryTime = get('deliveryTime');
      let timeZone = get('timeZone');
      let vehicle = get('vehicleType');
      let weightStr = get('weight');
      let rateStr = get('rate');
      let ratePerMileStr = get('ratePerMile');
      let distanceStr = get('distance');
      let specialRequirements = get('specialRequirements');
      let contactName = get('contactName');
      let contactPhone = get('contactPhone');
      let contactEmail = get('contactEmail');
      let loadType = get('loadType');
      let dimensions = get('dimensions');
      let hazmat = get('hazmat');
      let temperature = get('temperature');
      let notes = get('notes');

      if (isSimple) {
        const parseCityState = (s: string): { city: string; state?: string } => {
          const t = (s ?? '').replace(/\ufeff/g, '').trim();
          const m = t.match(/^(.+?)[,\s]+([A-Za-z]{2})$/);
          if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
          return { city: t, state: undefined };
        };
        const o = parseCityState(getByHeaderName('Origin'));
        const d = parseCityState(getByHeaderName('Destination'));
        origin = o.city; 
        originState = o.state || '';
        destination = d.city; 
        destState = d.state || '';
        vehicle = getByHeaderName('Vehicle Type');
        weightStr = getByHeaderName('Weight');
        rateStr = getByHeaderName('Price');
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth() + 1;
        const dday = today.getDate();
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        pickup = `${y}-${pad(m)}-${pad(dday)} 09:00`;
        delivery = `${y}-${pad(m)}-${pad(dday)} 17:00`;
        title = `${origin}${originState ? ', '+originState : ''} → ${destination}${destState ? ', '+destState : ''} — CSV`;
        description = 'Imported via CSV';
      }

      title = (title ?? '').replace(/[\u0000-\u001F\ufeff]/g, '').trim();
      description = (description ?? '').replace(/[\u0000-\u001F\ufeff]/g, '').trim();
      origin = (origin ?? '').replace(/[\u0000-\u001F\ufeff]/g, '').trim();
      destination = (destination ?? '').replace(/[\u0000-\u001F\ufeff]/g, '').trim();
      vehicle = (vehicle ?? '').replace(/[\u0000-\u001F\ufeff]/g, '').trim();

      const rate = parseMoney(rateStr);
      if (isNaN(rate) || rate <= 0) reasons.push({ field: 'rate', message: 'Must be a number > 0' });
      const weight = parseNumber(weightStr);
      if (isNaN(weight) || weight <= 0) reasons.push({ field: 'weight', message: 'Must be a number > 0' });
      
      const ratePerMile = parseNumber(ratePerMileStr);
      const distance = parseNumber(distanceStr);
      
      // Combine pickup date and time if both provided
      if (pickup && pickupTime && !pickup.includes(':')) {
        pickup = `${pickup} ${pickupTime}`;
      }
      if (delivery && deliveryTime && !delivery.includes(':')) {
        delivery = `${delivery} ${deliveryTime}`;
      }

      const p1 = parseDateFlexible(pickup, '09:00');
      if (!p1.ok) reasons.push({ field: 'pickupDate', message: p1.reason ?? 'invalid' });
      const d1 = parseDateFlexible(delivery, '17:00');
      if (!d1.ok) reasons.push({ field: 'deliveryDate', message: d1.reason ?? 'invalid' });

      const vt = normalizeVehicleType(vehicle);
      if (!vt.ok) {
        reasons.push({ field: 'vehicleType', message: vt.reason ?? 'invalid type' });
      } else if (vt.normalized && vt.normalized !== vehicle) {
        reasons.push({ field: 'vehicleType', message: `normalized to "${vt.normalized}"` });
      }

      if (!title) reasons.push({ field: 'title', message: 'Required' });
      if (!description) reasons.push({ field: 'description', message: 'Required' });
      if (!origin) reasons.push({ field: 'originCity', message: 'Required' });
      if (!destination) reasons.push({ field: 'destinationCity', message: 'Required' });

      const parsed: Canonical | null = reasons.length === 0 ? {
        title,
        description,
        originCity: origin,
        originState: originState || undefined,
        originZip: originZip || undefined,
        originAddress: originAddress || undefined,
        destinationCity: destination,
        destState: destState || undefined,
        destinationZip: destZip || undefined,
        destinationAddress: destAddress || undefined,
        pickupDate: p1.ok ? (p1.out as string) : '',
        deliveryDate: d1.ok ? (d1.out as string) : '',
        timeZone: timeZone || undefined,
        vehicleType: vt.ok ? (vt.out as string) : '',
        weight: Number(weight),
        rate: Number(rate),
        ratePerMile: Number.isFinite(ratePerMile) ? ratePerMile : undefined,
        distance: Number.isFinite(distance) ? distance : undefined,
        specialRequirements: specialRequirements || undefined,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        loadType: loadType || undefined,
        dimensions: dimensions || undefined,
        hazmat: hazmat || undefined,
        temperature: temperature || undefined,
        notes: notes || undefined,
      } : null;

      return { original: row, parsed, reasons, skip: false };
    });

    setProcessedRows(out);
  }, [normalizeHeader]);

  const handleFileSelect = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      let csvContent: string;
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        csvContent = await response.text();
      } else {
        csvContent = await FileSystem.readAsStringAsync(file.uri);
      }
      const { headers, rows } = parseCSV(csvContent);
      processCSVData(headers, rows);
      showToast(`Loaded ${rows.length} rows for preview`);
    } catch (error) {
      console.error('File select error:', error);
      showToast('Failed to read CSV file', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [processCSVData, showToast]);

  const toggleRowSkip = useCallback((index: number) => {
    setProcessedRows(prev => prev.map((row, i) => i === index ? { ...row, skip: !row.skip } : row));
  }, []);

  const handleImport = useCallback(async () => {
    if (!user) {
      showToast('Authentication required', 'error');
      return;
    }
    try {
      setIsImporting(true);
      const authed = await ensureFirebaseAuth();
      if (!authed || !getFirebase().auth?.currentUser) {
        console.warn('[CSV Import] Firebase auth not available');
        showToast('Authentication with Firebase failed. Please retry or open Firebase Sanity Check.', 'error');
        return;
      }
      const perms = await checkFirebasePermissions();
      if (!perms.canWrite) {
        console.warn('[CSV Import] Permission check failed:', perms.error);
        showToast(perms.error ?? 'Missing or insufficient permissions to write to Firestore', 'error');
        return;
      }
      const { db } = getFirebase();
      const rowsToImport = processedRows.filter(r => !r.skip && r.parsed);
      let imported = 0;
      let skipped = processedRows.filter(r => r.skip || !r.parsed).length;
      let i = 0;
      for (const r of rowsToImport) {
        const p = r.parsed as Canonical;
        const id = `csv-${Date.now()}-${i++}`;
        const docData = {
          title: p.title,
          description: p.description,
          origin: `${p.originCity}${p.originState ? ', '+p.originState : ''}`,
          destination: `${p.destinationCity}${p.destState ? ', '+p.destState : ''}`,
          vehicleType: p.vehicleType,
          rate: p.rate,
          status: 'OPEN',
          createdBy: (getFirebase().auth?.currentUser?.uid ?? user.id),
          // Shipper tagging for complete profile data across devices
          shipperId: (getFirebase().auth?.currentUser?.uid ?? user.id),
          shipperName: (user?.name ?? user?.email ?? 'Shipper'),
          pickupDate: p.pickupDate,
          deliveryDate: p.deliveryDate,
          deliveryTZ: p.timeZone,
          createdAt: serverTimestamp(),
          clientCreatedAt: Date.now(),
          attachments: [],
          weightLbs: p.weight,
          revenueUsd: p.rate,
          distanceMi: p.distance,
          // Additional fields from expanded template
          originPlace: p.originAddress || p.originZip ? {
            city: p.originCity,
            state: p.originState || '',
            lat: 0,
            lng: 0
          } : undefined,
          destinationPlace: p.destinationAddress || p.destinationZip ? {
            city: p.destinationCity,
            state: p.destState || '',
            lat: 0,
            lng: 0
          } : undefined,
          // Store additional CSV data as metadata
          csvMetadata: {
            originAddress: p.originAddress,
            originZip: p.originZip,
            destinationAddress: p.destinationAddress,
            destinationZip: p.destinationZip,
            ratePerMile: p.ratePerMile,
            specialRequirements: p.specialRequirements,
            contactName: p.contactName,
            contactPhone: p.contactPhone,
            contactEmail: p.contactEmail,
            loadType: p.loadType,
            dimensions: p.dimensions,
            hazmat: p.hazmat,
            temperature: p.temperature,
            notes: p.notes,
          },
        };
        console.log('[FIXED][CSV IMPORT] Tagged load with shipperId and shipperName for complete profile data');
        await setDoc(doc(db, LOADS_COLLECTION, id), docData);
        imported++;
      }
      showToast(`Imported ${imported} loads. Skipped: ${skipped}`);
      setProcessedRows([]);
      router.back();
    } catch (error: any) {
      const code = error?.code ?? '';
      console.error('Import error:', error);
      if (code === 'permission-denied') {
        showToast('Missing or insufficient permissions to write to Firestore. Please ensure you are signed in.', 'error');
      } else {
        showToast('Import failed. Please try again.', 'error');
      }
    } finally {
      setIsImporting(false);
    }
  }, [user, processedRows, showToast]);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'CSV Import', headerLeft: () => <HeaderBack /> }} />
        <View style={styles.accessDenied}>
          <AlertCircle size={64} color={theme.colors.warning} />
          <Text style={styles.accessTitle}>Business Plan Required</Text>
          <Text style={styles.accessText}>
            CSV Import is available for Business plan members only. Upgrade your membership to access bulk load import.
          </Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={() => router.push('/membership')}>
            <Text style={styles.upgradeButtonText}>Upgrade Membership</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'CSV Import', headerLeft: () => <HeaderBack /> }} />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <FileText size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Import Loads from CSV</Text>
          <Text style={styles.subtitle}>Upload a CSV file. Column order doesn’t matter. Unknown columns are ignored.</Text>
        </View>

        <View style={styles.templateContainer}>
          <TouchableOpacity testID="csv-template-complete" style={[styles.templateButton, styles.templateButtonFull]} onPress={() => {
            const csv = buildCompleteTemplateCSV();
            if (Platform.OS === 'web') {
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'loads_complete_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            } else {
              console.log(csv);
              showToast('Complete template printed in console. Copy & save as .csv', 'success');
            }
          }}>
            <Download size={20} color={theme.colors.white} />
            <Text style={styles.templateTextFull}>Complete Template (All Fields)</Text>
          </TouchableOpacity>
          
          <View style={styles.templateRow}>
            <TouchableOpacity testID="csv-template-canonical" style={styles.templateButton} onPress={() => {
              const csv = buildCanonicalTemplateCSV();
              if (Platform.OS === 'web') {
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'loads_canonical_template.csv';
                a.click();
                URL.revokeObjectURL(url);
              } else {
                console.log(csv);
                showToast('Canonical template printed in console. Copy & save as .csv', 'success');
              }
            }}>
              <Download size={20} color={theme.colors.primary} />
              <Text style={styles.templateText}>Standard Template</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="csv-template-simple" style={styles.templateButton} onPress={() => {
              const csv = buildSimpleTemplateCSV();
              if (Platform.OS === 'web') {
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'loads_simple_template.csv';
                a.click();
                URL.revokeObjectURL(url);
              } else {
                console.log(csv);
                showToast('Simple template printed in console. Copy & save as .csv', 'success');
              }
            }}>
              <Download size={20} color={theme.colors.primary} />
              <Text style={styles.templateText}>Simple Template (5 cols)</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.templateInfo}>
          <View style={styles.simpleNote}>
            <Info size={16} color={theme.colors.gray} />
            <Text style={styles.simpleNoteText}>Complete Template: All fields for comprehensive load management</Text>
          </View>
          <View style={styles.simpleNote}>
            <Info size={16} color={theme.colors.gray} />
            <Text style={styles.simpleNoteText}>Standard Template: Essential fields for basic load posting</Text>
          </View>
          <View style={styles.simpleNote}>
            <Info size={16} color={theme.colors.gray} />
            <Text style={styles.simpleNoteText}>Simple Template: Minimal fields, dates default to 09:00 and 17:00</Text>
          </View>
        </View>

        <TouchableOpacity testID="csv-file-select" style={styles.uploadButton} onPress={handleFileSelect} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={theme.colors.white} /> : <Upload size={24} color={theme.colors.white} />}
          <Text style={styles.uploadText}>{isLoading ? 'Loading...' : 'Select CSV File'}</Text>
        </TouchableOpacity>

        {processedRows.length > 0 && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Preview ({processedRows.length} rows)</Text>
              <View style={styles.reasonsRow}>
                <Text style={styles.reasonsLabel}>Show reasons</Text>
                <Switch value={showReasons} onValueChange={setShowReasons} />
              </View>
            </View>

            {processedRows.map((row, index) => (
              <View key={index} style={styles.rowContainer}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowId}>#{index + 1}</Text>
                  <View style={styles.rowActions}>
                    <TouchableOpacity style={[styles.actionButton, row.skip && styles.actionButtonActive]} onPress={() => toggleRowSkip(index)}>
                      <X size={16} color={row.skip ? theme.colors.white : theme.colors.danger} />
                      <Text style={[styles.actionText, row.skip && styles.actionTextActive]}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showReasons && row.reasons.length > 0 && (
                  <View style={styles.rowErrors}>
                    {row.reasons.map((r, ri) => (
                      <Text key={ri} style={styles.rowErrorText}>• Row {index + 1}: {r.field} → {r.message}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.rowInfo}>
                  {row.parsed ? (
                    <>
                      <Text style={styles.rowInfoText}>{row.parsed.title}</Text>
                      <Text style={styles.rowInfoText}>
                        {row.parsed.originCity}{row.parsed.originState ? `, ${row.parsed.originState}` : ''} → {row.parsed.destinationCity}{row.parsed.destState ? `, ${row.parsed.destState}` : ''}
                      </Text>
                      <Text style={styles.rowInfoText}>
                        {row.parsed.pickupDate} • {row.parsed.deliveryDate} • {row.parsed.vehicleType} • ${row.parsed.rate}
                      </Text>
                      {(row.parsed.contactName || row.parsed.specialRequirements) && (
                        <Text style={styles.rowInfoText}>
                          {row.parsed.contactName && `Contact: ${row.parsed.contactName}`}
                          {row.parsed.contactName && row.parsed.specialRequirements && ' • '}
                          {row.parsed.specialRequirements && `Special: ${row.parsed.specialRequirements}`}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.rowInfoText}>Row invalid</Text>
                  )}
                </View>
              </View>
            ))}

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Import Summary</Text>
              <Text style={styles.summaryText}>
                Total: {processedRows.length} | Will Import: {processedRows.filter(r => !r.skip && r.parsed).length} | Skip: {processedRows.filter(r => r.skip || !r.parsed).length}
              </Text>
            </View>

            <TouchableOpacity
              testID="csv-import-button"
              style={[styles.importButton, (isImporting || processedRows.filter(r => !r.skip && r.parsed).length === 0) && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={isImporting || processedRows.filter(r => !r.skip && r.parsed).length === 0}
            >
              {isImporting ? <ActivityIndicator color={theme.colors.white} /> : <CheckCircle size={24} color={theme.colors.white} />}
              <Text style={styles.importText}>{isImporting ? 'Importing...' : `Import ${processedRows.filter(r => !r.skip && r.parsed).length} Loads`}</Text>
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
  templateContainer: {
    marginBottom: theme.spacing.md,
  },
  templateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  templateButtonFull: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  templateTextFull: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  templateInfo: {
    marginBottom: theme.spacing.md,
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
    flex: 1,
  },
  templateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  simpleNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  simpleNoteText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
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
  previewContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  previewTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  reasonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reasonsLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
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