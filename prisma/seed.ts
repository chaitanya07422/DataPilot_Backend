import { PrismaClient } from "@prisma/client";

export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_DATASET_ID = "00000000-0000-4000-8000-000000000002";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "dev@datapilot.local" },
    create: {
      id: DEV_USER_ID,
      email: "dev@datapilot.local",
      name: "Dev User",
    },
    update: {},
  });

  await prisma.dataset.upsert({
    where: { id: DEV_DATASET_ID },
    create: {
      id: DEV_DATASET_ID,
      name: "Default Dataset",
      description: "Seed dataset for local development",
      userId: DEV_USER_ID,
    },
    update: {},
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
