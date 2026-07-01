import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

const dbPath =
  process.env.DATABASE_URL?.replace(/^file:/, "") ??
  path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) {
    console.error("Set SEED_PASSWORD before seeding (e.g. in .env.local or shell).");
    process.exit(1);
  }
  const seedUsername = process.env.SEED_USERNAME ?? "Marcellis20";

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const user = await prisma.user.upsert({
    where: { username: seedUsername },
    update: { password: passwordHash },
    create: {
      username: seedUsername,
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
