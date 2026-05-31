import { readFile } from "node:fs/promises";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedSheet = {
  sheetName: string | null;
  headers: string[];
  rows: Record<string, unknown>[];
};

const TABULAR_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isTabularMimeType(mimeType: string | null | undefined, filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "csv" || ext === "xls" || ext === "xlsx") return true;
  return mimeType !== null && mimeType !== undefined && TABULAR_MIME_TYPES.has(mimeType);
}

export async function parseTabularFile(
  storagePath: string,
  mimeType: string | null,
  filename: string,
): Promise<ParsedSheet> {
  const buffer = await readFile(storagePath);
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "csv" || mimeType === "text/csv" || mimeType === "application/csv") {
    return parseCsv(buffer.toString("utf-8"));
  }

  if (
    ext === "xls" ||
    ext === "xlsx" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return parseExcel(buffer);
  }

  throw new Error(`Unsupported tabular file type: ${mimeType ?? ext ?? "unknown"}`);
}

function parseCsv(content: string): ParsedSheet {
  const result = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: false,
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0]?.message ?? "unknown"}`);
  }

  const data = result.data.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (data.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headerRow = data[0]!.map((cell, i) => String(cell ?? "").trim() || `column_${i + 1}`);
  const rows = data.slice(1).map((row) => rowToObject(headerRow, row));

  if (rows.length === 0) {
    throw new Error("CSV file has headers but no data rows");
  }

  return { sheetName: null, headers: headerRow, rows };
}

function parseExcel(buffer: Buffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel workbook has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Excel sheet not found: ${sheetName}`);
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (!raw.length) {
    throw new Error("Excel sheet is empty");
  }

  const headerRow = (raw[0] as unknown[]).map((cell, i) =>
    cell === null || cell === undefined || String(cell).trim() === ""
      ? `column_${i + 1}`
      : String(cell).trim(),
  );

  const rows = raw
    .slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => !isBlank(cell)))
    .map((row) => rowToObject(headerRow, row as unknown[]));

  if (rows.length === 0) {
    throw new Error("Excel sheet has headers but no data rows");
  }

  return { sheetName, headers: headerRow, rows };
}

function rowToObject(headers: string[], row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]!] = row[i] ?? null;
  }
  return obj;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}
