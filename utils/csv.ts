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
    'title',
    'description',
    'vehicleType',
    'originCity',
    'destinationCity',
    'pickupDate',
    'deliveryDate',
    'weight',
    'rate'
  ];
  const example = [
    'Pallets of water',
    '48 pallets, forklift needed',
    'flatbed',
    'Dallas',
    'Houston',
    '2025-08-20',
    '2025-08-21',
    '40000',
    '1200'
  ];
  return headers.join(',') + '\n' + example.map(v => csvEscape(v)).join(',') + '\n';
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}
