import { extname } from "node:path";
import { readFile } from "node:fs/promises";
import pdf from "pdf-parse";
import * as XLSX from "xlsx";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function resolveMimeType(
  mimeType: string | null | undefined,
  filename: string,
): string | null {
  const ext = extname(filename).toLowerCase();
  const fromExt = EXTENSION_TO_MIME[ext];

  if (mimeType && mimeType !== "application/octet-stream" && ALLOWED_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }

  return fromExt ?? mimeType ?? null;
}

export function isAllowedMimeType(
  mimeType: string | null | undefined,
  filename = "",
): boolean {
  const resolved = resolveMimeType(mimeType, filename);
  return resolved !== null && ALLOWED_MIME_TYPES.has(resolved);
}

export async function extractTextFromFile(
  storagePath: string,
  mimeType: string | null,
  filename: string,
): Promise<string> {
  const buffer = await readFile(storagePath);
  const resolved = resolveMimeType(mimeType, filename);

  if (!resolved) {
    throw new Error(`Unsupported file type: ${mimeType ?? "unknown"}`);
  }

  if (resolved === "application/pdf") {
    const result = await pdf(buffer);
    return result.text ?? "";
  }

  if (resolved === "text/plain" || resolved === "text/markdown") {
    return buffer.toString("utf-8");
  }

  if (resolved === "text/csv" || resolved === "application/csv") {
    return buffer.toString("utf-8");
  }

  if (
    resolved === "application/vnd.ms-excel" ||
    resolved === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return extractTextFromExcel(buffer);
  }

  throw new Error(`Unsupported file type: ${resolved}`);
}

function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) {
      sections.push(`Sheet: ${sheetName}\n${csv}`);
    }
  }

  return sections.join("\n\n");
}
