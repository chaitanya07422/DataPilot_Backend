import fp from "fastify-plugin";
import { Redis, type Redis as RedisClient } from "ioredis";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    maxRetriesPerRequest: null,
  });

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async () => {
    await redis.quit();
  });
});
