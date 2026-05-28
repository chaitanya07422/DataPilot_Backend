import { ensureDevUser } from "../../lib/ensure-dev-user.js";
import type { PrismaClient } from "../../types/database.js";

export class DatasetService {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    const datasets = await this.prisma.dataset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { uploadedFiles: true } },
      },
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
