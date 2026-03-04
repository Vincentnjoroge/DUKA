// ============================================================
// DUKA POS - CSV Parsing Utilities
// ============================================================

export interface CSVParseResult<T> {
  headers: string[];
  rows: T[];
  errors: { row: number; message: string }[];
  totalParsed: number;
}

/** Parse CSV text into rows of objects */
export function parseCSV(csvText: string): CSVParseResult<Record<string, string>> {
  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row.' }], totalParsed: 0 };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        errors.push({ row: i + 1, message: `Expected ${headers.length} columns, got ${values.length}` });
        continue;
      }
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx].trim();
      });
      rows.push(row);
    } catch (err: any) {
      errors.push({ row: i + 1, message: err.message || 'Parse error' });
    }
  }

  return { headers, rows, errors, totalParsed: rows.length };
}

/** Parse a single CSV line, handling quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

/** Validate product CSV row and return typed object or error */
export interface CSVProductRow {
  name: string;
  barcode?: string;
  category?: string;
  buying_price: number;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  expiry_date?: string;
}

export function validateProductCSVRow(
  row: Record<string, string>,
  rowIndex: number
): { data?: CSVProductRow; error?: string } {
  if (!row.name || !row.name.trim()) {
    return { error: `Row ${rowIndex}: Missing product name` };
  }

  const buyingPrice = parseFloat(row.buying_price || row.cost_price || '0');
  const sellingPrice = parseFloat(row.selling_price || row.price || '0');
  const stock = parseInt(row.current_stock || row.stock || row.quantity || '0', 10);
  const reorderLevel = parseInt(row.reorder_level || '10', 10);

  if (isNaN(buyingPrice) || buyingPrice < 0) {
    return { error: `Row ${rowIndex}: Invalid buying price` };
  }
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    return { error: `Row ${rowIndex}: Invalid selling price` };
  }
  if (sellingPrice <= buyingPrice) {
    return { error: `Row ${rowIndex}: Selling price must exceed buying price` };
  }

  return {
    data: {
      name: row.name.trim(),
      barcode: row.barcode?.trim() || undefined,
      category: row.category?.trim() || undefined,
      buying_price: buyingPrice,
      selling_price: sellingPrice,
      current_stock: isNaN(stock) ? 0 : stock,
      reorder_level: isNaN(reorderLevel) ? 10 : reorderLevel,
      expiry_date: row.expiry_date?.trim() || undefined,
    },
  };
}

/** Generate CSV template string */
export function generateProductCSVTemplate(): string {
  const headers = 'name,barcode,category,buying_price,selling_price,current_stock,reorder_level,expiry_date';
  const example = 'Tusker Lager 500ml,5449000000996,Beer,120,180,48,12,2027-06-15';
  return `${headers}\n${example}`;
}
