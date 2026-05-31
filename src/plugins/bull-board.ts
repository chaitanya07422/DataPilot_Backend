import fp from "fastify-plugin";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export default fp(async (fastify: FastifyInstance) => {
  if (!env.bullBoardEnabled) {
    fastify.log.info("Bull Board dashboard disabled (BULL_BOARD_ENABLED=false)");
    return;
  }

  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath(env.bullBoardPath);

  createBullBoard({
    queues: [new BullMQAdapter(fastify.queues.dataProcessing)],
    serverAdapter,
  });

  await fastify.register(serverAdapter.registerPlugin(), {
    prefix: env.bullBoardPath,
  });

  fastify.log.info(`Bull Board dashboard at ${env.bullBoardPath}`);
});
