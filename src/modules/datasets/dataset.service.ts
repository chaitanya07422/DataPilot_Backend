import type { Queue } from "bullmq";
import { ensureDevUser } from "../../lib/ensure-dev-user.js";
import type { CleaningOptions } from "../../services/cleaning/sheet-cleaner.js";
import type { PrismaClient } from "../../types/database.js";

export class DatasetService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly processingQueue?: Queue,
  ) {}

  async list() {
    const datasets = await this.prisma.dataset.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { uploadedFiles: true } } },
    });
    return { data: datasets };
  }

  async getById(params: { id: string }) {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: params.id },
      include: {
        uploadedFiles: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!dataset) {
      throw new DatasetNotFoundError(params.id);
    }
    return { data: dataset };
  }

  async create(body: { name: string; description?: string }) {
    if (!body.name?.trim()) {
      throw new DatasetValidationError("name is required");
    }

    const userId = await ensureDevUser(this.prisma);

    const dataset = await this.prisma.dataset.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        userId,
      },
    });
    return { data: dataset };
  }

  async getFileHeaders(datasetId: string, fileId: string) {
    await this.assertFileInDataset(datasetId, fileId);
    const sheet = await this.prisma.fileSheet.findFirst({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });
    if (!sheet) {
      return { data: { headers: [] as string[] } };
    }
    return { data: { headers: sheet.headers as string[] } };
  }

  async getFileRows(
    datasetId: string,
    fileId: string,
    offset = 0,
    limit = 100,
  ) {
    await this.assertFileInDataset(datasetId, fileId);
    const sheet = await this.prisma.fileSheet.findFirst({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });
    if (!sheet) {
      return { data: { rows: [], total: 0, offset, limit } };
    }

    const [rows, total] = await Promise.all([
      this.prisma.fileRow.findMany({
        where: { sheetId: sheet.id },
        orderBy: { rowIndex: "asc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.fileRow.count({ where: { sheetId: sheet.id } }),
    ]);

    return {
      data: {
        rows: rows.map((r) => r.data as Record<string, unknown>),
        total,
        offset,
        limit,
      },
    };
  }

  async getCleaningReport(datasetId: string, fileId: string) {
    await this.assertFileInDataset(datasetId, fileId);
    const report = await this.prisma.cleaningReport.findFirst({
      where: { fileId },
      orderBy: { appliedAt: "desc" },
    });
    if (!report) {
      return { data: null };
    }
    return { data: report };
  }

  async enqueueReClean(
    datasetId: string,
    fileId: string,
    options: CleaningOptions,
  ) {
    await this.assertFileInDataset(datasetId, fileId);
    if (!this.processingQueue) {
      throw new DatasetValidationError("Processing queue not available");
    }

    await this.prisma.uploadedFile.update({
      where: { id: fileId },
      data: { processingStatus: "pending", errorMessage: null },
    });

    await this.processingQueue.add(
      "re-clean-file",
      { datasetId, fileId, cleaningOptions: options },
      { removeOnComplete: 100, removeOnFail: 50 },
    );

    return { data: { status: "queued" } };
  }

  private async assertFileInDataset(datasetId: string, fileId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, datasetId },
    });
    if (!file) {
      throw new DatasetNotFoundError(`File ${fileId} not found in dataset ${datasetId}`);
    }
    return file;
  }
}

export class DatasetNotFoundError extends Error {
  constructor(id: string) {
    super(`Dataset not found: ${id}`);
    this.name = "DatasetNotFoundError";
  }
}

export class DatasetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetValidationError";
  }
}
