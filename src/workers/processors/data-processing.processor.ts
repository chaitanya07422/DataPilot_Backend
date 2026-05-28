import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";
import { logger } from "../../config/logger.js";
import { chunkText } from "../../services/chunking/text-chunker.js";
import { createEmbeddingProvider } from "../../services/embeddings/index.js";
import { extractTextFromFile } from "../../services/parsing/file-parser.js";
import { QdrantService } from "../../services/qdrant.service.js";

export type DataProcessingJobData = {
  datasetId?: string;
  fileId?: string;
};

export type DataProcessingJobResult = {
  status: "indexed" | "failed";
  chunkCount?: number;
  error?: string;
};

const prisma = new PrismaClient();
const qdrant = new QdrantService();

export async function processDataProcessingJob(
  job: Job<DataProcessingJobData>,
): Promise<DataProcessingJobResult> {
  const { fileId, datasetId } = job.data;

  if (!fileId || !datasetId) {
    throw new Error("Job requires fileId and datasetId");
  }

  logger.info({ jobId: job.id, fileId, datasetId }, "Processing file");

  try {
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { processingStatus: "processing", errorMessage: null },
    });

    const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file?.storagePath) {
      throw new Error(`File record or storage path missing: ${fileId}`);
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
    logger.error({ jobId: job.id, fileId, err: error }, "File processing failed");

    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { processingStatus: "failed", errorMessage: message },
    });

    return { status: "failed", error: message };
  }
}
