/**
 * Update production user password on Turso.
 * Reads TURSO_* from .env.production.local
 *
 * Usage:
 *   npx tsx scripts/set-prod-password.ts "YourNewSecurePassword"
 */
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadProductionEnv } from "./load-production-env";

async function main() {
  loadProductionEnv();

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const username = process.env.PROD_USERNAME ?? "Marcellis20";
  const password = process.argv[2] ?? process.env.PROD_PASSWORD;

  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }
  if (!password || password.length < 12) {
    console.error("Provide a password (12+ chars): npx tsx scripts/set-prod-password.ts \"...\"");
    process.exit(1);
  }

  const adapter = new PrismaLibSql({ url, authToken });
  const prisma = new PrismaClient({ adapter });

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { username },
    data: { password: hash },
  });

  console.log(`Updated password for ${user.username}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
