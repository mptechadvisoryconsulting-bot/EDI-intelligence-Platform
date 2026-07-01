/**
 * Production DB setup: apply Turso migrations + seed demo user.
 *
 * Prerequisites — create a Turso database at https://turso.tech/app:
 *   1. Create database (e.g. edi-intelligence-platform)
 *   2. Copy Database URL and create an auth token
 *
 * Usage (PowerShell):
 *   $env:TURSO_DATABASE_URL="libsql://your-db-org.turso.io"
 *   $env:TURSO_AUTH_TOKEN="your-token"
 *   npm run db:prod-setup
 */
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadProductionEnv } from "./load-production-env";

async function main() {
  loadProductionEnv();
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before running.");
    console.error("Create a database at https://turso.tech/app");
    process.exit(1);
  }

  console.log("Applying migrations to Turso...");
  execSync("npx tsx scripts/apply-turso-migrations.ts", {
    stdio: "inherit",
    env: {
      ...process.env,
      TURSO_DATABASE_URL: url,
      TURSO_AUTH_TOKEN: authToken,
      TURSO_RESET: process.env.TURSO_RESET ?? "1",
    },
  });

  const adapter = new PrismaLibSql({ url, authToken });
  const prisma = new PrismaClient({ adapter });

  const seedPassword = process.env.SEED_PASSWORD ?? process.env.PROD_PASSWORD;
  if (!seedPassword) {
    console.error("Set SEED_PASSWORD or PROD_PASSWORD before running production setup.");
    process.exit(1);
  }
  const seedUsername = process.env.SEED_USERNAME ?? process.env.PROD_USERNAME ?? "Marcellis20";

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

  console.log(`Seeded production user: ${user.username}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
