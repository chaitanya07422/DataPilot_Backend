import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { QUEUE_NAMES } from "./config/queue.js";
import { createQueueWorker } from "./workers/queue.worker.js";

async function start() {
  const worker = createQueueWorker();

  logger.info(
    { queue: QUEUE_NAMES.DATA_PROCESSING, redis: `${env.redis.host}:${env.redis.port}` },
    "DataPilot worker started",
  );

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down worker`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
