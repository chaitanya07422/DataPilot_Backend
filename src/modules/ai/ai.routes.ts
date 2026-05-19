import type { FastifyInstance } from "fastify";
import { AIService } from "./ai.service.js";

export async function aiRoutes(fastify: FastifyInstance) {
  const service = new AIService(fastify.prisma);

  fastify.get("/conversations", async () => service.listConversations());
  fastify.post("/conversations", async () => service.createConversationPlaceholder());
  fastify.post("/query", async () => service.queryPlaceholder());
}
