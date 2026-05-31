import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { ensureUploadRoot } from "./services/storage/local-storage.js";
import { logger } from "./config/logger.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import bullmqPlugin from "./plugins/bullmq.js";
import bullBoardPlugin from "./plugins/bull-board.js";
import { registerRoutes } from "./routes/index.js";

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
  });

  await ensureUploadRoot();

  await app.register(cors, { origin: env.corsOrigin });
  await app.register(helmet, {
    // Bull Board serves inline scripts/styles on /admin/queues
    contentSecurityPolicy: false,
  });
  await app.register(multipart, {
    limits: { fileSize: env.maxUploadBytes },
  });
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(bullmqPlugin);
  await app.register(bullBoardPlugin);
  await app.register(registerRoutes);

  return app;
}
