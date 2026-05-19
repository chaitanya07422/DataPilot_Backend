import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: env.host });
    logger.info(`DataPilot API listening on http://${env.host}:${env.port}`);
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
