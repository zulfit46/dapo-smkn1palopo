/**
 * Date Utility Functions for SMKN 1 Palopo Dapodik & GTK App
 * Handles conversions between:
 * - Spreadsheet format: DD/MM/YYYY (hh/mm/yyyy - text format in Google Sheets)
 * - HTML5 input type="date" & standard state format: YYYY-MM-DD
 * - Google Sheets GViz format: Date(yyyy,m,d) or formatted string
 */

/**
 * Converts any date representation (YYYY-MM-DD, Date object, GViz Date(...), etc.)
 * into strictly text format "DD/MM/YYYY" (hh/mm/yyyy) for saving to Google Spreadsheet.
 */
export function formatToDDMMYYYY(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str || str === '-' || str === 'null' || str === 'undefined') return '';

  // Case 1: Already DD/MM/YYYY or D/M/YYYY (with optional time)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // Case 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Case 3: Google GViz Date(yyyy, m, d) -> note: m is 0-indexed in GViz
  const gvizMatch = str.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gvizMatch) {
    const y = gvizMatch[1];
    const m = String(Number(gvizMatch[2]) + 1).padStart(2, '0');
    const d = String(gvizMatch[3]).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Case 4: Date object or standard Date parseable string
  try {
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      const d = String(parsedDate.getDate()).padStart(2, '0');
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const y = parsedDate.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch (e) {}

  return str;
}

/**
 * Converts any date representation (DD/MM/YYYY, Date object, GViz Date(...), etc.)
 * into standard "YYYY-MM-DD" for HTML input[type="date"] and application state.
 */
export function parseToYYYYMMDD(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str || str === '-' || str === 'null' || str === 'undefined') return '';

  // Case 1: Already YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Case 3: Google GViz Date(yyyy, m, d) -> note: m is 0-indexed in GViz
  const gvizMatch = str.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gvizMatch) {
    const y = gvizMatch[1];
    const m = String(Number(gvizMatch[2]) + 1).padStart(2, '0');
    const d = String(gvizMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case 4: Date object or standard Date parseable string
  try {
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}

  return str;
}

/**
 * Format for display in Indonesian localized tables or cards
 */
export function formatDisplayDate(val: any): string {
  const dmy = formatToDDMMYYYY(val);
  if (!dmy) return '-';
  return dmy;
}

/**
 * Format number to Indonesian Rupiah currency string
 */
export function formatRupiah(amount: number | string): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Parses various date and timestamp formats (DD/MM/YYYY, YYYY-MM-DD, timestamps, ISO)
 * into numeric millisecond timestamps for robust sorting (e.g. newest first / Z-A).
 */
export function parseDateToTimestamp(dateVal?: any, timestampVal?: any, createdAt?: any): number {
  if (timestampVal && typeof timestampVal === 'string') {
    const trimmed = timestampVal.trim();
    const indMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (indMatch) {
      const d = parseInt(indMatch[1], 10);
      const m = parseInt(indMatch[2], 10) - 1;
      const y = parseInt(indMatch[3], 10);
      const hh = indMatch[4] ? parseInt(indMatch[4], 10) : 0;
      const mm = indMatch[5] ? parseInt(indMatch[5], 10) : 0;
      const ss = indMatch[6] ? parseInt(indMatch[6], 10) : 0;
      const parsed = new Date(y, m, d, hh, mm, ss);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    const t = Date.parse(trimmed);
    if (!isNaN(t)) return t;
  }

  if (dateVal && typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const indMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (indMatch) {
      const d = parseInt(indMatch[1], 10);
      const m = parseInt(indMatch[2], 10) - 1;
      const y = parseInt(indMatch[3], 10);
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    const t = Date.parse(trimmed);
    if (!isNaN(t)) return t;
  }

  if (createdAt && typeof createdAt === 'string') {
    const t = Date.parse(createdAt);
    if (!isNaN(t)) return t;
  }

  return 0;
}

