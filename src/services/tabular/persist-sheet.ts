import type { PrismaClient } from "@prisma/client";
import type { CleaningOptions, CleaningReportData } from "../cleaning/sheet-cleaner.js";
import {
  cleanSheet,
  DEFAULT_CLEANING_OPTIONS,
} from "../cleaning/sheet-cleaner.js";
import type { ParsedSheet } from "../parsing/tabular-parser.js";

const BATCH_SIZE = 500;

export async function persistCleanedSheet(
  prisma: PrismaClient,
  fileId: string,
  parsed: ParsedSheet,
  options: CleaningOptions = DEFAULT_CLEANING_OPTIONS,
): Promise<{ sheetId: string; reportId: string; headers: string[]; rows: Record<string, unknown>[] }> {
  const { headers, rows, report } = cleanSheet(parsed.headers, parsed.rows, options);
  const { sheetId, reportId } = await persistCleanedData(
    prisma,
    fileId,
    parsed.sheetName,
    headers,
    rows,
    options,
    report,
  );
  return { sheetId, reportId, headers, rows };
}

async function persistCleanedData(
  prisma: PrismaClient,
  fileId: string,
  sheetName: string | null,
  headers: string[],
  rows: Record<string, unknown>[],
  options: CleaningOptions,
  report: CleaningReportData,
): Promise<{ sheetId: string; reportId: string }> {
  await prisma.fileRow.deleteMany({
    where: { sheet: { fileId } },
  });
  await prisma.fileSheet.deleteMany({ where: { fileId } });
  await prisma.cleaningReport.deleteMany({ where: { fileId } });

  const sheet = await prisma.fileSheet.create({
    data: {
      fileId,
      sheetName,
      headers,
      cleaningConfig: options as object,
    },
  });

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await prisma.fileRow.createMany({
      data: batch.map((row, i) => ({
        sheetId: sheet.id,
        rowIndex: offset + i,
        data: row as object,
      })),
    });
  }

  const cleaningReport = await prisma.cleaningReport.create({
    data: {
      fileId,
      sheetId: sheet.id,
      originalRowCount: report.originalRowCount,
      cleanedRowCount: report.cleanedRowCount,
      duplicatesRemoved: report.duplicatesRemoved,
      emptyRowsRemoved: report.emptyRowsRemoved,
      cellsTrimmed: report.cellsTrimmed,
      cleaningConfig: options as object,
    },
  });

  await prisma.uploadedFile.update({
    where: { id: fileId },
    data: {
      rowCount: report.originalRowCount,
      cleanedRowCount: report.cleanedRowCount,
      sheetName,
    },
  });

  return { sheetId: sheet.id, reportId: cleaningReport.id };
}

export function rowsToText(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => String(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}
