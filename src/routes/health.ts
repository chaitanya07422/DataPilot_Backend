import type { FastifyInstance } from "fastify";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({
    status: "ok",
    service: "datapilot-backend",
    timestamp: new Date().toISOString(),
  }));

  fastify.get("/health/ready", async () => {
    await fastify.prisma.$queryRaw`SELECT 1`;
    const redisPing = await fastify.redis.ping();

    return {
      status: "ready",
      checks: {
        database: "ok",
        redis: redisPing === "PONG" ? "ok" : "degraded",
      },
      timestamp: new Date().toISOString(),
    };
  });
}
