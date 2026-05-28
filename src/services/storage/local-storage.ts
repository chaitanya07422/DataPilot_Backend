import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureUploadRoot(): Promise<void> {
  await mkdir(env.uploadDir, { recursive: true });
}

export function buildStoragePath(
  datasetId: string,
  fileId: string,
  filename: string,
): string {
  const safeName = sanitizeFilename(filename);
  return path.join(env.uploadDir, datasetId, `${fileId}_${safeName}`);
}

export async function saveUploadFile(
  datasetId: string,
  fileId: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  await ensureUploadRoot();
  const storagePath = buildStoragePath(datasetId, fileId, filename);
  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, buffer);
  return storagePath;
}
