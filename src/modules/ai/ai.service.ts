import type { PrismaClient } from "../../types/database.js";

export class AIService {
  constructor(private readonly prisma: PrismaClient) {}

  async listConversations() {
    return { data: [], message: "AI module placeholder" };
  }

  async createConversationPlaceholder() {
    return { data: null, message: "AI module placeholder" };
  }

  async queryPlaceholder() {
    return { data: null, message: "AI module placeholder" };
  }
}
