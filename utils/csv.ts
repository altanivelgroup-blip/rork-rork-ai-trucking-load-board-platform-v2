export type CSVRow = Record<string, string>;

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
    'title','description','originCity','destinationCity','pickupDate','deliveryDate','vehicleType','weight','rate'
  ];
  const r1 = ['Dallas to Houston','Palletized goods','Dallas, TX','Houston, TX','2025-09-10 09:00','2025-09-10 17:00','Flatbed','12000','1400'];
  const r2 = ['Vegas to Phoenix','Expedited delivery','Las Vegas, NV','Phoenix, AZ','2025-09-12 09:00','2025-09-12 17:00','Reefer','8000','1800'];
  return headers.join(',') + '\n' + r1.map(csvEscape).join(',') + '\n' + r2.map(csvEscape).join(',') + '\n';
}

export function buildSimpleTemplateCSV(): string {
  const headers = ['Origin','Destination','Vehicle Type','Weight','Price'];
  const r1 = ['Dallas, TX','Houston, TX','Car Hauler','5000','$1200'];
  const r2 = ['Las Vegas, NV','Phoenix, AZ','Box Truck','8000','$1600'];
  return headers.join(',') + '\n' + r1.map(csvEscape).join(',') + '\n' + r2.map(csvEscape).join(',') + '\n';
}

export function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function normalizeCSVHeader(h: string): string {
  return (h ?? '').toString().replace(/\ufeff/g, '').trim();
}

export function validateCSVHeaders(headers: string[]): string[] {
  return (headers ?? []).map(normalizeCSVHeader);
}
