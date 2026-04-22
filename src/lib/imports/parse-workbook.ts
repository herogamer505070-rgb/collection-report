import * as XLSX from "xlsx";

export type ParsedWorkbook = {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
};

/**
 * Parses an xlsx or csv buffer into a flat list of row objects.
 * Only the first sheet is processed.
 * Skips completely empty rows.
 *
 * Must be called in a Node.js environment (server action or Route Handler).
 */
export function parseWorkbook(
  buffer: Buffer,
  _fileKind: "xlsx" | "csv",
): ParsedWorkbook {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false, // keep as raw strings for our own normalization
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];

  // sheet_to_json with header: 1 gives us an array of arrays
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Derive headers from the keys of the first row
  const headers = Object.keys(rawRows[0] ?? {});

  // Filter out rows where every value is empty
  const nonEmptyRows = rawRows.filter((row) =>
    Object.values(row).some((v) => v !== "" && v !== null && v !== undefined),
  );

  return {
    headers,
    rows: nonEmptyRows,
    totalRows: nonEmptyRows.length,
  };
}
