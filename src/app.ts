import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import bullmqPlugin from "./plugins/bullmq.js";
import { registerRoutes } from "./routes/index.js";

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
  });

  await app.register(cors, { origin: env.corsOrigin });
  await app.register(helmet);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(bullmqPlugin);
  await app.register(registerRoutes);

  return app;
}
