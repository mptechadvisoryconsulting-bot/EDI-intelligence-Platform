import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const dbPath =
  process.env.DATABASE_URL?.replace(/^file:/, "") ??
  path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("DecodeEncode2026", 12);

  const user = await prisma.user.upsert({
    where: { username: "Marcellis20" },
    update: { password: passwordHash },
    create: {
      username: "Marcellis20",
      password: passwordHash,
      name: "Marcellis",
      role: "analyst",
    },
  });

  console.log(`Seeded user: ${user.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
