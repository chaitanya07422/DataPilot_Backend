import type { FastifyInstance } from "fastify";
import { DatasetService } from "./dataset.service.js";

export async function datasetRoutes(fastify: FastifyInstance) {
  const service = new DatasetService(fastify.prisma);

  fastify.get("/", async () => service.list());
  fastify.get("/:id", async (request) => service.getById(request.params as { id: string }));
}
