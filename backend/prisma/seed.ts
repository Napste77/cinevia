import { runSeed } from "../src/services/seed";
import { prisma } from "../src/db/prisma";

runSeed()
  .then((result) => console.log("Seed OK:", result))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
