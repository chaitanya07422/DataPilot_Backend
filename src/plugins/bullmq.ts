import fp from "fastify-plugin";
import { Queue } from "bullmq";
import type { FastifyInstance } from "fastify";
import { QUEUE_NAMES, redisConnection } from "../config/queue.js";

export { QUEUE_NAMES } from "../config/queue.js";

declare module "fastify" {
  interface FastifyInstance {
    queues: {
      dataProcessing: Queue;
    };
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const dataProcessing = new Queue(QUEUE_NAMES.DATA_PROCESSING, {
    connection: redisConnection,
  });

  fastify.decorate("queues", { dataProcessing });

  fastify.addHook("onClose", async () => {
    await dataProcessing.close();
  });
});
