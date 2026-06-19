import { prisma } from "./Backend/src/config/database.js";

async function main() {
  const groups = await prisma.chargeGroup.findMany();
  for (const group of groups) {
    const _ = await prisma.chargeGroup.findUnique({
      where: { id: group.id }
    });
  }
}

main().catch(console.error);
