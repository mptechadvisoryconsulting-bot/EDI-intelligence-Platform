import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  const dbPath =
    process.env.DATABASE_URL?.replace(/^file:/, "") ??
    path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

function getClient() {
  const cached = globalForPrisma.prisma;
  if (cached && "erpLayoutProfile" in cached) return cached;
  return createClient();
}

export const db = getClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
