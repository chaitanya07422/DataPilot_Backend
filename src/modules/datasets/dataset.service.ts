import type { PrismaClient } from "../../types/database.js";

export class DatasetService {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    return { data: [], message: "Dataset module placeholder" };
  }

  async getById(_params: { id: string }) {
    return { data: null, message: "Dataset module placeholder" };
  }
}
