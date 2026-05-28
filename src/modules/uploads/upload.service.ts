import { randomUUID } from "node:crypto";
import type { ProcessingStatus } from "@prisma/client";
import type { UploadFilePayload } from "./upload.types.js";
import type { Queue } from "bullmq";
import { env } from "../../config/env.js";
import {
  isAllowedMimeType,
  resolveMimeType,
} from "../../services/parsing/file-parser.js";
import { saveUploadFile } from "../../services/storage/local-storage.js";
import type { PrismaClient } from "../../types/database.js";

export class UploadService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly processingQueue: Queue,
  ) {}

  async list(datasetId?: string) {
    const files = await this.prisma.uploadedFile.findMany({
      where: datasetId ? { datasetId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return { data: files };
  }

  async getById(id: string) {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      throw new UploadNotFoundError(id);
    }
    return { data: file };
  }

  async uploadFile(datasetId: string, file: UploadFilePayload) {
    const dataset = await this.prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) {
      throw new UploadValidationError(`Dataset not found: ${datasetId}`);
    }

    const { buffer, filename, mimeType } = file;
    if (!isAllowedMimeType(mimeType, filename)) {
      throw new UploadValidationError(
        `Unsupported file type. Allowed: PDF, CSV, Excel (.xls/.xlsx), TXT, MD (got ${mimeType ?? "unknown"})`,
      );
    }

    const resolvedMime = resolveMimeType(mimeType, filename)!;

    if (buffer.length > env.maxUploadBytes) {
      throw new UploadValidationError(
        `File exceeds maximum size of ${env.maxUploadBytes} bytes`,
      );
    }

    const fileId = randomUUID();
    const storagePath = await saveUploadFile(datasetId, fileId, filename, buffer);

    const record = await this.prisma.uploadedFile.create({
      data: {
        id: fileId,
        filename,
        mimeType: resolvedMime,
        size: buffer.length,
        storagePath,
        datasetId,
        processingStatus: "pending",
      },
    });

    try {
      await this.processingQueue.add(
        "process-file",
        { datasetId, fileId: record.id },
        { removeOnComplete: 100, removeOnFail: 50 },
      );
    } catch (queueError) {
      await this.prisma.uploadedFile.update({
        where: { id: record.id },
        data: {
          processingStatus: "failed",
          errorMessage:
            "File saved but queue unavailable. Start Redis and run npm run dev:worker.",
        },
      });
      throw new UploadValidationError(
        "File saved but job queue is unavailable. Is Redis running on REDIS_PORT?",
      );
    }

    return { data: record };
  }
}

export class UploadNotFoundError extends Error {
  constructor(id: string) {
    super(`Upload not found: ${id}`);
    this.name = "UploadNotFoundError";
  }
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export type UploadedFileResponse = {
  id: string;
  filename: string;
  mimeType: string | null;
  size: number | null;
  storagePath: string | null;
  processingStatus: ProcessingStatus;
  errorMessage: string | null;
  chunkCount: number | null;
  datasetId: string;
  createdAt: Date;
  updatedAt: Date;
};
