import * as XLSX from 'xlsx';

export type CSVRow = Record<string, string>;

export type SimpleLoadRow = {
  'Origin': string;
  'Destination': string;
  'VehicleType': string;
  'Weight': string;
  'Price': string;
};

export function parseCSV(input: string): { headers: string[]; rows: CSVRow[] } {
  const cleaned = input.replace(/\ufeff/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const lines = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]).map(h => h.trim());
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const row: CSVRow = {};
    headers.forEach((h, idx) => {
      const v = cols[idx] ?? '';
      row[h] = v.replace(/\ufeff/g, '').trim();
    });
    const allEmpty = Object.values(row).every(v => (v ?? '').trim().length === 0);
    if (!allEmpty) rows.push(row);
  }
  return { headers, rows };
}

export function splitCSVLine(line: string): string[] {
  const res: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  res.push(current);
  return res;
}

export function buildCanonicalTemplateCSV(): string {
  const headers = [
    'title','description','equipmentType','vehicleCount','originCity','originState','originZip','destinationCity','destinationState','destinationZip','pickupDate','deliveryDate','rate','contactName','contactEmail','contactPhone'
  ];
  const r1 = [
    'Dallas to Houston','Palletized goods','Flatbed','1','Dallas','TX','75201','Houston','TX','77001','2025-09-10','2025-09-10','1400','John Smith','john@company.com','555-0123'
  ];
  const r2 = [
    'Vegas to Phoenix','Expedited delivery','Reefer','1','Las Vegas','NV','89101','Phoenix','AZ','85001','2025-09-12','2025-09-12','1800','Jane Doe','jane@logistics.com','555-0456'
  ];
  return headers.join(',') + '\n' + r1.map(csvEscape).join(',') + '\n' + r2.map(csvEscape).join(',') + '\n';
}

export function buildCompleteTemplateCSV(): string {
  const headers = [
    // Basic Load Information
    'title','description','loadType','reference',
    // Origin Details
    'originCity','originState','originZip','originAddress','originCompany','originContact','originPhone','originEmail',
    // Destination Details
    'destinationCity','destinationState','destinationZip','destinationAddress','destinationCompany','destinationContact','destinationPhone','destinationEmail',
    // Scheduling
    'pickupDate','pickupTime','deliveryDate','deliveryTime','timeZone','appointmentRequired','flexibleTiming',
    // Equipment & Cargo
    'vehicleType','weight','dimensions','pieces','commodityType','hazmat','temperature','specialEquipment',
    // Pricing
    'rate','rateType','ratePerMile','distance','fuelSurcharge','accessorials','totalRate',
    // Requirements & Instructions
    'specialRequirements','loadingInstructions','deliveryInstructions','driverRequirements','insuranceRequirements',
    // Contact & Documentation
    'primaryContact','primaryPhone','primaryEmail','backupContact','backupPhone','backupEmail',
    'bolRequired','podRequired','signatureRequired','photoRequired','documentsRequired',
    // Additional Information
    'notes','internalNotes','customerReference','poNumber','priority','expedited'
  ];
  
  const r1 = [
    // Basic Load Information
    'Steel Coils - Chicago to Detroit','Heavy steel coils for automotive manufacturing','Steel/Metal','SC-2025-001',
    // Origin Details
    'Chicago','IL','60601','1200 Industrial Blvd','Steel Works Inc','Mike Johnson','312-555-0101','mike@steelworks.com',
    // Destination Details
    'Detroit','MI','48201','500 Auto Plant Rd','Motor City Manufacturing','Sarah Wilson','313-555-0202','sarah@motorcity.com',
    // Scheduling
    '2025-09-15','08:00','2025-09-15','16:00','America/Chicago','Yes','No',
    // Equipment & Cargo
    'Flatbed','45000','20x8x6','5','Steel Coils','No','Ambient','Tarps and chains required',
    // Pricing
    '2800','Flat Rate','9.33','300','150','Tarping: $75','3025',
    // Requirements & Instructions
    'Crane required for loading/unloading','Use overhead crane at dock 3','Deliver to receiving dock B','CDL-A required, 2+ years experience','$1M cargo insurance minimum',
    // Contact & Documentation
    'Mike Johnson','312-555-0101','mike@steelworks.com','Tom Brown','312-555-0103','tom@steelworks.com',
    'Yes','Yes','Yes','Yes','BOL, POD, Weight tickets',
    // Additional Information
    'Handle with extreme care - high value cargo','Customer prefers morning deliveries','CUST-REF-789','PO-456123','High','No'
  ];
  
  const r2 = [
    // Basic Load Information
    'Frozen Food Distribution','Temperature-controlled food products','Food/Beverage','FF-2025-002',
    // Origin Details
    'Los Angeles','CA','90001','800 Food Processing Way','Fresh Foods Co','Lisa Garcia','213-555-0301','lisa@freshfoods.com',
    // Destination Details
    'Phoenix','AZ','85001','1500 Distribution Center Dr','Desert Foods LLC','Carlos Martinez','602-555-0401','carlos@desertfoods.com',
    // Scheduling
    '2025-09-16','06:00','2025-09-16','14:00','America/Phoenix','Yes','2 hour window',
    // Equipment & Cargo
    'Reefer','38000','48x8.5x9','26','Frozen Foods','No','-10°F','Multi-temp zones, food grade',
    // Pricing
    '2200','Flat Rate','5.89','374','125','Fuel surcharge included','2325',
    // Requirements & Instructions
    'Maintain -10°F throughout transit, food grade trailer only','Load from dock 5, temperature check required','Deliver to frozen section, temp log required','Food safety certified driver preferred','Food grade insurance required',
    // Contact & Documentation
    'Lisa Garcia','213-555-0301','lisa@freshfoods.com','Maria Rodriguez','213-555-0302','maria@freshfoods.com',
    'Yes','Yes','Yes','Yes','Temperature logs, food safety docs',
    // Additional Information
    'Critical temperature maintenance - reject if temp exceeded','High-value perishable goods','FRESH-789','PO-789456','Critical','Yes'
  ];
  
  return headers.join(',') + '\n' + r1.map(csvEscape).join(',') + '\n' + r2.map(csvEscape).join(',') + '\n';
}

export function buildSimpleTemplateCSV(): string {
  const headers = ['Origin','Destination','VehicleType','Weight','Price'];
  const r1 = ['Dallas, TX','Houston, TX','Car Hauler','5000','1200'];
  const r2 = ['Las Vegas, NV','Phoenix, AZ','Box Truck','8000','1600'];
  const r3 = ['Miami, FL','Atlanta, GA','Flatbed','12000','2400'];
  return headers.join(',') + '\n' + r1.map(csvEscape).join(',') + '\n' + r2.map(csvEscape).join(',') + '\n' + r3.map(csvEscape).join(',') + '\n';
}

export function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function normalizeCSVHeader(h: string): string {
  return (h ?? '').toString().replace(/\ufeff/g, '').trim();
}

export function validateCSVHeaders(headers: string[], requiredHeaders?: string[]): string[] {
  if (!requiredHeaders) {
    return (headers ?? []).map(normalizeCSVHeader);
  }
  
  const normalized = (headers ?? []).map(normalizeCSVHeader);
  const missing = requiredHeaders.filter(req => !normalized.includes(req));
  const errors: string[] = [];
  
  if (missing.length > 0) {
    errors.push(`Missing required headers: ${missing.join(', ')}`);
  }
  
  return errors;
}

export function validateSimpleLoadRow(row: SimpleLoadRow): string[] {
  const errors: string[] = [];
  
  if (!row['Origin']?.trim()) {
    errors.push('Origin is required');
  }
  
  if (!row['Destination']?.trim()) {
    errors.push('Destination is required');
  }
  
  if (!row['VehicleType']?.trim()) {
    errors.push('VehicleType is required');
  }
  
  if (!row['Weight']?.trim()) {
    errors.push('Weight is required');
  } else {
    const weight = Number(row['Weight'].replace(/[^0-9.]/g, ''));
    if (isNaN(weight) || weight <= 0) {
      errors.push('Weight must be a valid positive number');
    }
  }
  
  if (!row['Price']?.trim()) {
    errors.push('Price is required');
  } else {
    const price = Number(row['Price'].replace(/[^0-9.]/g, ''));
    if (isNaN(price) || price <= 0) {
      errors.push('Price must be a valid positive number');
    }
  }
  
  return errors;
}

export type StandardLoadRow = {
  title: string;
  description: string;
  originCity: string;
  originState?: string;
  originZip?: string;
  originAddress?: string;
  destinationCity: string;
  destinationState?: string;
  destinationZip?: string;
  destinationAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  timeZone?: string;
  vehicleType: string;
  weight: string;
  rate: string;
  ratePerMile?: string;
  distance?: string;
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

export function validateStandardLoadRow(row: CSVRow): string[] {
  const errors: string[] = [];
  
  // Required fields for standard template
  if (!row['title']?.trim()) {
    errors.push('Title is required');
  }
  
  if (!row['originCity']?.trim()) {
    errors.push('Origin city is required');
  }
  
  if (!row['destinationCity']?.trim()) {
    errors.push('Destination city is required');
  }
  
  if (!row['vehicleType']?.trim()) {
    errors.push('Vehicle type is required');
  }
  
  if (!row['weight']?.trim()) {
    errors.push('Weight is required');
  } else {
    const weight = Number(row['weight'].replace(/[^0-9.]/g, ''));
    if (isNaN(weight) || weight <= 0) {
      errors.push('Weight must be a valid positive number');
    }
  }
  
  if (!row['rate']?.trim()) {
    errors.push('Rate is required');
  } else {
    const rate = Number(row['rate'].replace(/[^0-9.]/g, ''));
    if (isNaN(rate) || rate <= 0) {
      errors.push('Rate must be a valid positive number');
    }
  }
  
  // Validate dates if provided
  if (row['pickupDate']?.trim()) {
    const date = new Date(row['pickupDate']);
    if (isNaN(date.getTime())) {
      errors.push('Pickup date must be a valid date');
    }
  }
  
  if (row['deliveryDate']?.trim()) {
    const date = new Date(row['deliveryDate']);
    if (isNaN(date.getTime())) {
      errors.push('Delivery date must be a valid date');
    }
  }
  
  return errors;
}

export type CompleteLoadRow = {
  // Basic Load Information
  title: string;
  description?: string;
  loadType?: string;
  reference?: string;
  // Origin Details
  originCity: string;
  originState?: string;
  originZip?: string;
  originAddress?: string;
  originCompany?: string;
  originContact?: string;
  originPhone?: string;
  originEmail?: string;
  // Destination Details
  destinationCity: string;
  destinationState?: string;
  destinationZip?: string;
  destinationAddress?: string;
  destinationCompany?: string;
  destinationContact?: string;
  destinationPhone?: string;
  destinationEmail?: string;
  // Scheduling
  pickupDate?: string;
  pickupTime?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  timeZone?: string;
  appointmentRequired?: string;
  flexibleTiming?: string;
  // Equipment & Cargo
  vehicleType: string;
  weight: string;
  dimensions?: string;
  pieces?: string;
  commodityType?: string;
  hazmat?: string;
  temperature?: string;
  specialEquipment?: string;
  // Pricing
  rate: string;
  rateType?: string;
  ratePerMile?: string;
  distance?: string;
  fuelSurcharge?: string;
  accessorials?: string;
  totalRate?: string;
  // Requirements & Instructions
  specialRequirements?: string;
  loadingInstructions?: string;
  deliveryInstructions?: string;
  driverRequirements?: string;
  insuranceRequirements?: string;
  // Contact & Documentation
  primaryContact?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  backupContact?: string;
  backupPhone?: string;
  backupEmail?: string;
  bolRequired?: string;
  podRequired?: string;
  signatureRequired?: string;
  photoRequired?: string;
  documentsRequired?: string;
  // Additional Information
  notes?: string;
  internalNotes?: string;
  customerReference?: string;
  poNumber?: string;
  priority?: string;
  expedited?: string;
};

export function validateCompleteLoadRow(row: CSVRow): string[] {
  const errors: string[] = [];
  
  // Required fields for complete template
  if (!row['title']?.trim()) {
    errors.push('Title is required');
  }
  
  if (!row['originCity']?.trim()) {
    errors.push('Origin city is required');
  }
  
  if (!row['destinationCity']?.trim()) {
    errors.push('Destination city is required');
  }
  
  if (!row['vehicleType']?.trim()) {
    errors.push('Vehicle type is required');
  }
  
  if (!row['weight']?.trim()) {
    errors.push('Weight is required');
  } else {
    const weight = Number(row['weight'].replace(/[^0-9.]/g, ''));
    if (isNaN(weight) || weight <= 0) {
      errors.push('Weight must be a valid positive number');
    }
  }
  
  if (!row['rate']?.trim()) {
    errors.push('Rate is required');
  } else {
    const rate = Number(row['rate'].replace(/[^0-9.]/g, ''));
    if (isNaN(rate) || rate <= 0) {
      errors.push('Rate must be a valid positive number');
    }
  }
  
  // Validate dates if provided
  if (row['pickupDate']?.trim()) {
    const date = new Date(row['pickupDate']);
    if (isNaN(date.getTime())) {
      errors.push('Pickup date must be a valid date');
    }
  }
  
  if (row['deliveryDate']?.trim()) {
    const date = new Date(row['deliveryDate']);
    if (isNaN(date.getTime())) {
      errors.push('Delivery date must be a valid date');
    }
  }
  
  // Validate email formats if provided
  const emailFields = ['originEmail', 'destinationEmail', 'primaryEmail', 'backupEmail'];
  emailFields.forEach(field => {
    if (row[field]?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row[field].trim())) {
        errors.push(`${field} must be a valid email address`);
      }
    }
  });
  
  // Validate phone numbers if provided
  const phoneFields = ['originPhone', 'destinationPhone', 'primaryPhone', 'backupPhone'];
  phoneFields.forEach(field => {
    if (row[field]?.trim()) {
      const phoneRegex = /^[\d\s\-\(\)\+\.]{10,}$/;
      if (!phoneRegex.test(row[field].trim())) {
        errors.push(`${field} must be a valid phone number`);
      }
    }
  });
  
  return errors;
}

// Generic validation function that routes to the appropriate validator
export function validateLoadRow(row: CSVRow, templateType: 'simple' | 'standard' | 'complete'): string[] {
  switch (templateType) {
    case 'simple':
      return validateSimpleLoadRow(row as unknown as SimpleLoadRow);
    case 'standard':
      return validateStandardLoadRow(row);
    case 'complete':
      return validateCompleteLoadRow(row);
    default:
      return ['Unknown template type'];
  }
}

// Function to convert Excel file to CSV format
export async function parseExcelFile(fileUri: string, fileName: string): Promise<{ headers: string[]; rows: CSVRow[] }> {
  try {
    let arrayBuffer: ArrayBuffer;
    
    if (typeof window !== 'undefined' && fileUri.startsWith('blob:')) {
      // Web environment
      const response = await fetch(fileUri);
      arrayBuffer = await response.arrayBuffer();
    } else {
      // React Native environment
      try {
        const FileSystem = await import('expo-file-system');
        if (!FileSystem || !FileSystem.readAsStringAsync) {
          throw new Error('FileSystem.readAsStringAsync is not available');
        }
        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const binaryString = atob(base64);
        arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      } catch (error) {
        console.warn('FileSystem not available for Excel parsing, trying fetch fallback:', error);
        // Fallback to fetch for React Native Web or when FileSystem is not available
        const response = await fetch(fileUri);
        arrayBuffer = await response.arrayBuffer();
      }
    }
    
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    
    if (jsonData.length === 0) {
      return { headers: [], rows: [] };
    }
    
    const headers = jsonData[0].map(h => (h || '').toString().trim());
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const rowData = jsonData[i];
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        const value = rowData[index];
        row[header] = (value || '').toString().trim();
      });
      
      // Skip empty rows
      const hasData = Object.values(row).some(v => v.trim().length > 0);
      if (hasData) {
        rows.push(row);
      }
    }
    
    return { headers, rows };
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file. Please ensure it\'s a valid Excel file.');
  }
}

// Function to determine file type and parse accordingly
export async function parseFileContent(fileUri: string, fileName: string): Promise<{ headers: string[]; rows: CSVRow[] }> {
  const fileExtension = fileName.toLowerCase().split('.').pop();
  
  if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    return parseExcelFile(fileUri, fileName);
  } else {
    // Default to CSV parsing
    let csvContent: string;
    
    if (typeof window !== 'undefined' && fileUri.startsWith('blob:')) {
      // Web environment
      const response = await fetch(fileUri);
      csvContent = await response.text();
    } else {
      // React Native environment
      try {
        const FileSystem = await import('expo-file-system');
        if (!FileSystem || !FileSystem.readAsStringAsync) {
          throw new Error('FileSystem.readAsStringAsync is not available');
        }
        csvContent = await FileSystem.readAsStringAsync(fileUri);
      } catch (error) {
        console.warn('FileSystem not available, trying fetch fallback:', error);
        // Fallback to fetch for React Native Web or when FileSystem is not available
        const response = await fetch(fileUri);
        csvContent = await response.text();
      }
    }
    
    return parseCSV(csvContent);
  }
}
