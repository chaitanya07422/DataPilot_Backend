import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";
import { logger } from "../../config/logger.js";
import { chunkText } from "../../services/chunking/text-chunker.js";
import {
  DEFAULT_CLEANING_OPTIONS,
  type CleaningOptions,
} from "../../services/cleaning/sheet-cleaner.js";
import { createEmbeddingProvider } from "../../services/embeddings/index.js";
import { extractTextFromFile } from "../../services/parsing/file-parser.js";
import {
  isTabularMimeType,
  parseTabularFile,
} from "../../services/parsing/tabular-parser.js";
import { QdrantService } from "../../services/qdrant.service.js";
import {
  persistCleanedSheet,
  rowsToText,
} from "../../services/tabular/persist-sheet.js";

export type DataProcessingJobData = {
  datasetId?: string;
  fileId?: string;
  cleaningOptions?: CleaningOptions;
};

export type DataProcessingJobResult = {
  status: "indexed" | "failed";
  chunkCount?: number;
  cleanedRowCount?: number;
  error?: string;
};

const prisma = new PrismaClient();
const qdrant = new QdrantService();

export async function processDataProcessingJob(
  job: Job<DataProcessingJobData>,
): Promise<DataProcessingJobResult> {
  const { fileId, datasetId, cleaningOptions } = job.data;

  if (!fileId || !datasetId) {
    throw new Error("Job requires fileId and datasetId");
  }

  logger.info({ jobId: job.id, name: job.name, fileId, datasetId }, "Processing job");

  try {
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { processingStatus: "processing", errorMessage: null },
    });

    const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file?.storagePath) {
      throw new Error(`File record or storage path missing: ${fileId}`);
    }

    const options = cleaningOptions ?? DEFAULT_CLEANING_OPTIONS;

    if (isTabularMimeType(file.mimeType, file.filename)) {
      const parsed = await parseTabularFile(file.storagePath, file.mimeType, file.filename);
      const { headers, rows } = await persistCleanedSheet(prisma, fileId, parsed, options);

      const text = rowsToText(headers, rows);
      const chunks = chunkText(text);
      const embedder = createEmbeddingProvider();
      const vectors = await embedder.embed(chunks.map((c) => c.text));
      await qdrant.deleteByFileId(fileId);
      await qdrant.upsertChunks(fileId, datasetId, file.filename, chunks, vectors);

      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: {
          processingStatus: "indexed",
          chunkCount: chunks.length,
          errorMessage: null,
        },
      });

      logger.info(
        { jobId: job.id, fileId, cleanedRows: rows.length, chunks: chunks.length },
        "Tabular file indexed",
      );

      return { status: "indexed", chunkCount: chunks.length, cleanedRowCount: rows.length };
    }

    const text = await extractTextFromFile(file.storagePath, file.mimeType, file.filename);
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("No text content extracted from file");
    }

    const embedder = createEmbeddingProvider();
    const vectors = await embedder.embed(chunks.map((c) => c.text));
    await qdrant.deleteByFileId(fileId);
    await qdrant.upsertChunks(fileId, datasetId, file.filename, chunks, vectors);

    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        processingStatus: "indexed",
        chunkCount: chunks.length,
        errorMessage: null,
      },
    });

    logger.info({ jobId: job.id, fileId, chunkCount: chunks.length }, "File indexed");

    return { status: "indexed", chunkCount: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    logger.error({ jobId: job.id, fileId, err: error }, "Job failed");

    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { processingStatus: "failed", errorMessage: message },
    });

    return { status: "failed", error: message };
  }
}
