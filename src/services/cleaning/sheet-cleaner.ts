export type CleaningOptions = {
  trimCells: boolean;
  normalizeHeaders: boolean;
  removeEmptyRows: boolean;
  removeDuplicateRows: boolean;
  duplicateKeyColumns?: string[];
};

export type CleaningReportData = {
  originalRowCount: number;
  cleanedRowCount: number;
  duplicatesRemoved: number;
  emptyRowsRemoved: number;
  cellsTrimmed: number;
};

export const DEFAULT_CLEANING_OPTIONS: CleaningOptions = {
  trimCells: true,
  normalizeHeaders: true,
  removeEmptyRows: true,
  removeDuplicateRows: true,
};

export function cleanSheet(
  headers: string[],
  rows: Record<string, unknown>[],
  options: CleaningOptions = DEFAULT_CLEANING_OPTIONS,
): { headers: string[]; rows: Record<string, unknown>[]; report: CleaningReportData } {
  const originalRowCount = rows.length;
  let cellsTrimmed = 0;

  let normalizedHeaders = headers;
  if (options.normalizeHeaders) {
    normalizedHeaders = normalizeHeaderNames(headers);
  }

  let workingRows = rows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i]!;
      const rawKey = headers[i] ?? header;
      mapped[header] = row[rawKey] ?? row[header] ?? null;
    }
    return mapped;
  });

  if (options.trimCells) {
    workingRows = workingRows.map((row) => {
      const trimmed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "string") {
          const next = value.trim();
          if (next !== value) cellsTrimmed += 1;
          trimmed[key] = next;
        } else {
          trimmed[key] = value;
        }
      }
      return trimmed;
    });
  }

  let emptyRowsRemoved = 0;
  if (options.removeEmptyRows) {
    const before = workingRows.length;
    workingRows = workingRows.filter((row) => !isEmptyRow(row));
    emptyRowsRemoved = before - workingRows.length;
  }

  let duplicatesRemoved = 0;
  if (options.removeDuplicateRows) {
    const keyColumns =
      options.duplicateKeyColumns?.length
        ? options.duplicateKeyColumns
        : normalizedHeaders;
    const before = workingRows.length;
    workingRows = dedupeRows(workingRows, keyColumns);
    duplicatesRemoved = before - workingRows.length;
  }

  return {
    headers: normalizedHeaders,
    rows: workingRows,
    report: {
      originalRowCount,
      cleanedRowCount: workingRows.length,
      duplicatesRemoved,
      emptyRowsRemoved,
      cellsTrimmed,
    },
  };
}

function normalizeHeaderNames(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    let base = header.trim().replace(/\s+/g, " ");
    if (!base) base = `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
  });
}

function dedupeRows(
  rows: Record<string, unknown>[],
  keyColumns: string[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const result: Record<string, unknown>[] = [];

  for (const row of rows) {
    const key = JSON.stringify(keyColumns.map((col) => row[col] ?? null));
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}
