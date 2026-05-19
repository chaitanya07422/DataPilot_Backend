import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { datasetRoutes } from "../modules/datasets/dataset.routes.js";
import { uploadRoutes } from "../modules/uploads/upload.routes.js";
import { aiRoutes } from "../modules/ai/ai.routes.js";
import { reportRoutes } from "../modules/reports/report.routes.js";
import { userRoutes } from "../modules/users/user.routes.js";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes, { prefix: "/api" });
  await fastify.register(userRoutes, { prefix: "/api/users" });
  await fastify.register(datasetRoutes, { prefix: "/api/datasets" });
  await fastify.register(uploadRoutes, { prefix: "/api/uploads" });
  await fastify.register(aiRoutes, { prefix: "/api/ai" });
  await fastify.register(reportRoutes, { prefix: "/api/reports" });
}
