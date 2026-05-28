import type { FastifyInstance } from "fastify";
import { logger } from "../../config/logger.js";
import {
  UploadNotFoundError,
  UploadService,
  UploadValidationError,
} from "./upload.service.js";
import type { UploadFilePayload } from "./upload.types.js";

export async function uploadRoutes(fastify: FastifyInstance) {
  const service = new UploadService(fastify.prisma, fastify.queues.dataProcessing);

  fastify.get("/", async (request) => {
    const query = request.query as { datasetId?: string };
    return service.list(query.datasetId);
  });

  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await service.getById(id);
    } catch (error) {
      if (error instanceof UploadNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.post("/", async (request, reply) => {
    try {
      let datasetId: string | undefined;
      let filePayload: UploadFilePayload | undefined;

      // Must consume each part inside the loop or multipart hangs (@fastify/multipart)
      for await (const part of request.parts()) {
        if (part.type === "file") {
          filePayload = {
            buffer: await part.toBuffer(),
            filename: part.filename,
            mimeType: part.mimetype,
          };
        } else if (part.fieldname === "datasetId") {
          datasetId = String(part.value);
        }
      }

      if (!datasetId) {
        return reply.status(400).send({ error: "datasetId is required" });
      }
      if (!filePayload) {
        return reply.status(400).send({ error: "file is required" });
      }

      logger.info(
        { datasetId, filename: filePayload.filename, size: filePayload.buffer.length },
        "Upload received",
      );

      const result = await service.uploadFile(datasetId, filePayload);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      logger.error({ err: error }, "Upload failed");
      throw error;
    }
  });
}
