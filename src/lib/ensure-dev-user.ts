import { env } from "../config/env.js";
import type { PrismaClient } from "../types/database.js";

const DEV_EMAIL = "dev@datapilot.local";

/** Ensures the dev user from DEV_USER_ID exists (required for dataset FK). */
export async function ensureDevUser(prisma: PrismaClient): Promise<string> {
  await prisma.user.upsert({
    where: { id: env.devUserId },
    create: {
      id: env.devUserId,
      email: DEV_EMAIL,
      name: "Dev User",
    },
    update: {},
  });
  return env.devUserId;
}
