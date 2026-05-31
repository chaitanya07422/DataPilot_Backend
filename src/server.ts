import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function start() {
  const app = await buildApp();

  // Fastify resolves 0.0.0.0 via os.networkInterfaces() when logging the listen
  // address; that syscall can fail on Node 25+ in restricted/sandboxed shells.
  const listenHost =
    env.host === "0.0.0.0" && env.nodeEnv === "development" ? "127.0.0.1" : env.host;

  try {
    await app.listen({ port: env.port, host: listenHost });
    logger.info(`DataPilot API listening on http://${listenHost}:${env.port}`);
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
