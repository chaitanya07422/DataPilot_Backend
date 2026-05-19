import type { PrismaClient } from "../../types/database.js";

export class ReportService {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    return { data: [], message: "Report module placeholder" };
  }

  async getById(_params: { id: string }) {
    return { data: null, message: "Report module placeholder" };
  }
}
