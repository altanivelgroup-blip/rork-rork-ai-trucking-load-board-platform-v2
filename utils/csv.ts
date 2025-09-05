export type CSVRow = Record<string, string>;

export function parseCSV(input: string): { headers: string[]; rows: CSVRow[] } {
  const lines = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]).map(h => h.trim());
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const row: CSVRow = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function validateCSVHeaders(headers: string[], required: string[]): string[] {
  const issues: string[] = [];
  const normalized = headers.map(h => h.trim());
  required.forEach((r) => {
    if (!normalized.includes(r)) {
      issues.push(`Missing column: ${r}`);
    }
  });
  const extras = normalized.filter(h => !required.includes(h));
  if (extras.length) {
    issues.push(`Unexpected column(s): ${extras.join(', ')}`);
  }
  return issues;
}

function splitCSVLine(line: string): string[] {
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

export function buildTemplateCSV(): string {
  const headers = [
    'Origin',
    'Destination', 
    'Vehicle Type',
    'Weight',
    'Price'
  ];
  const example = [
    'Dallas, TX',
    'Houston, TX',
    'CAR-HAULER',
    '5000',
    '1200'
  ];
  return headers.join(',') + '\n' + example.map(v => csvEscape(v)).join(',') + '\n';
}

export interface SimpleLoadRow {
  'Origin': string;
  'Destination': string;
  'Vehicle Type': string;
  'Weight': string;
  'Price': string;
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
  } else if (isNaN(Number(row['Weight']))) {
    errors.push('Weight must be a valid number');
  }
  
  if (!row['Price']?.trim()) {
    errors.push('Price is required');
  } else if (isNaN(Number(row['Price']))) {
    errors.push('Price must be a valid number');
  }
  
  return errors;
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}
