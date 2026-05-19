import type { FastifyInstance } from "fastify";
import { UserService } from "./user.service.js";

export async function userRoutes(fastify: FastifyInstance) {
  const service = new UserService(fastify.prisma);

  fastify.get("/", async () => service.list());
  fastify.get("/:id", async (request) => service.getById(request.params as { id: string }));
}
