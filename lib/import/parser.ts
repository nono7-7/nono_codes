/**
 * File Parser
 *
 * Uses SheetJS (xlsx) to parse both CSV and XLSX files into a uniform
 * array-of-objects format. SheetJS handles encoding, date formats, and
 * merged cells so we don't need separate CSV/XLSX codepaths.
 */

import * as XLSX from 'xlsx';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse a CSV or XLSX file into headers + rows.
 * Every cell value is coerced to a trimmed string.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('File contains no sheets');

  const sheet = workbook.Sheets[sheetName];
  // Convert to array-of-arrays to get raw headers
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (aoa.length < 2) throw new Error('File must have at least a header row and one data row');

  // First row = headers, rest = data
  const rawHeaders = (aoa[0] as unknown[]).map((h) => String(h ?? '').trim());

  // Deduplicate headers (append _2, _3, etc. for collisions)
  const headerCounts: Record<string, number> = {};
  const headers = rawHeaders.map((h) => {
    const key = h || 'Column';
    headerCounts[key] = (headerCounts[key] || 0) + 1;
    return headerCounts[key] > 1 ? `${key}_${headerCounts[key]}` : key;
  });

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const cells = aoa[i] as unknown[];
    // Skip completely empty rows
    const hasData = cells.some((c) => String(c ?? '').trim() !== '');
    if (!hasData) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = cells[j];
      // Handle Date objects from xlsx cellDates option
      if (val instanceof Date) {
        row[headers[j]] = val.toISOString().slice(0, 10);
      } else {
        row[headers[j]] = String(val ?? '').trim();
      }
    }
    rows.push(row);
  }

  return { headers, rows };
}
