import type { PrismaClient } from "../../types/database.js";
import type { Queue } from "bullmq";

export class UploadService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly processingQueue: Queue,
  ) {}

  async list() {
    return { data: [], message: "Upload module placeholder" };
  }

  async createPlaceholder() {
    return { data: null, message: "Upload module placeholder" };
  }
}
