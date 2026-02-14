import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("prof12345", 12);
  await prisma.user.upsert({
    where: { email: "prof@example.com" },
    update: {
      password,
      role: Role.PROF,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: "prof@example.com",
      password,
      role: Role.PROF,
      status: UserStatus.ACTIVE,
    },
  });
  console.log("Seeded professor: prof@example.com / prof12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
