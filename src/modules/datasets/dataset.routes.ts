import type { FastifyInstance } from "fastify";
import type { CleaningOptions } from "../../services/cleaning/sheet-cleaner.js";
import {
  DatasetNotFoundError,
  DatasetService,
  DatasetValidationError,
} from "./dataset.service.js";

export async function datasetRoutes(fastify: FastifyInstance) {
  const service = new DatasetService(fastify.prisma, fastify.queues.dataProcessing);

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

  fastify.get("/:id/files/:fileId/headers", async (request, reply) => {
    try {
      const { id, fileId } = request.params as { id: string; fileId: string };
      return await service.getFileHeaders(id, fileId);
    } catch (error) {
      if (error instanceof DatasetNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.get("/:id/files/:fileId/rows", async (request, reply) => {
    try {
      const { id, fileId } = request.params as { id: string; fileId: string };
      const query = request.query as { offset?: string; limit?: string };
      const offset = Number(query.offset ?? 0);
      const limit = Math.min(Number(query.limit ?? 100), 500);
      return await service.getFileRows(id, fileId, offset, limit);
    } catch (error) {
      if (error instanceof DatasetNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.get("/:id/files/:fileId/cleaning-report", async (request, reply) => {
    try {
      const { id, fileId } = request.params as { id: string; fileId: string };
      return await service.getCleaningReport(id, fileId);
    } catch (error) {
      if (error instanceof DatasetNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.post("/:id/files/:fileId/clean", async (request, reply) => {
    try {
      const { id, fileId } = request.params as { id: string; fileId: string };
      const body = request.body as Partial<CleaningOptions>;
      const options: CleaningOptions = {
        trimCells: body.trimCells ?? true,
        normalizeHeaders: body.normalizeHeaders ?? true,
        removeEmptyRows: body.removeEmptyRows ?? true,
        removeDuplicateRows: body.removeDuplicateRows ?? true,
        duplicateKeyColumns: body.duplicateKeyColumns,
      };
      return await service.enqueueReClean(id, fileId, options);
    } catch (error) {
      if (error instanceof DatasetNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof DatasetValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });
}
