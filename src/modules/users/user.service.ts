import type { PrismaClient } from "../../types/database.js";

export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    return { data: [], message: "User module placeholder" };
  }

  async getById(_params: { id: string }) {
    return { data: null, message: "User module placeholder" };
  }
}
