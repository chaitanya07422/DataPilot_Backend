import type { FastifyInstance } from "fastify";
import { UploadService } from "./upload.service.js";

export async function uploadRoutes(fastify: FastifyInstance) {
  const service = new UploadService(fastify.prisma, fastify.queues.dataProcessing);

  fastify.get("/", async () => service.list());
  fastify.post("/", async () => service.createPlaceholder());
}
