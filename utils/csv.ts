export type CSVRow = Record<string, string>;

export type SimpleLoadRow = {
  'Origin': string;
  'Destination': string;
  'Vehicle Type': string;
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
    'title','description','originCity','originState','originZip','originAddress',
    'destinationCity','destinationState','destinationZip','destinationAddress',
    'pickupDate','pickupTime','deliveryDate','deliveryTime','timeZone',
    'vehicleType','weight','rate','ratePerMile','distance',
    'specialRequirements','contactName','contactPhone','contactEmail',
    'loadType','dimensions','hazmat','temperature','notes'
  ];
  const r1 = [
    'Dallas to Houston','Palletized goods','Dallas','TX','75201','123 Main St',
    'Houston','TX','77001','456 Oak Ave',
    '2025-09-10','09:00','2025-09-10','17:00','America/Chicago',
    'Flatbed','12000','1400','4.83','290',
    'Tarps required','John Smith','555-0123','john@company.com',
    'Freight','48x40x60','No','N/A','Handle with care'
  ];
  const r2 = [
    'Vegas to Phoenix','Expedited delivery','Las Vegas','NV','89101','789 Strip Blvd',
    'Phoenix','AZ','85001','321 Desert Rd',
    '2025-09-12','09:00','2025-09-12','17:00','America/Phoenix',
    'Reefer','8000','1800','6.21','290',
    'Keep frozen -10F','Jane Doe','555-0456','jane@logistics.com',
    'Food','40x48x72','No','-10F','Temperature critical'
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
  const headers = ['Origin','Destination','Vehicle Type','Weight','Price'];
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
  
  if (!row['Vehicle Type']?.trim()) {
    errors.push('Vehicle Type is required');
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
