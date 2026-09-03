// lib/csv.js — RFC 4180 CSV serialisation.
//
// ═══════════════════════════════════════════════════════════════════════════
//  PURE. NO REACT, NO DOM.
// ═══════════════════════════════════════════════════════════════════════════
//
// This is thirty lines rather than one `join(',')` because the feed contains
// exactly the text that breaks the naive version. Real headlines here include
// commas, curly and straight double quotes, em dashes, and — from RSS
// descriptions — literal newlines. A join(',') export of this feed produces a
// file that opens misaligned in every spreadsheet, silently, with no error.
//
// RFC 4180: a field is quoted if it contains a comma, a double quote, CR or LF;
// a double quote inside a quoted field is doubled.

/** Quote one field iff it needs it, per RFC 4180. */
export function csvField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Rows → a CSV document.
 *
 * CRLF line endings, because RFC 4180 specifies them and Excel on Windows is
 * the one consumer that still cares.
 */
export function toCsv(columns, rows) {
  const head = columns.map(c => csvField(c.label ?? c.key)).join(',');
  const body = (rows || []).map(row =>
    columns.map(c => csvField(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(',')
  );
  return [head, ...body].join('\r\n') + '\r\n';
}

/**
 * A filename-safe slug plus an ISO date, so two exports never collide and a
 * folder of them sorts chronologically.
 */
export function csvFilename(prefix, date = new Date()) {
  const stamp = date.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${String(prefix).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.csv`;
}
