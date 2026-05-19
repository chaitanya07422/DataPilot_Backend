import type { FastifyInstance } from "fastify";
import { ReportService } from "./report.service.js";

export async function reportRoutes(fastify: FastifyInstance) {
  const service = new ReportService(fastify.prisma);

  fastify.get("/", async () => service.list());
  fastify.get("/:id", async (request) => service.getById(request.params as { id: string }));
}
