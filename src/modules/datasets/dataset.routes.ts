import type { FastifyInstance } from "fastify";
import {
  DatasetNotFoundError,
  DatasetService,
  DatasetValidationError,
} from "./dataset.service.js";

export async function datasetRoutes(fastify: FastifyInstance) {
  const service = new DatasetService(fastify.prisma);

  fastify.get("/", async () => service.list());

  fastify.post("/", async (request, reply) => {
    try {
      const body = request.body as { name?: string; description?: string };
      const result = await service.create({
        name: body.name ?? "",
        description: body.description,
      });
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof DatasetValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await service.getById({ id });
    } catch (error) {
      if (error instanceof DatasetNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
