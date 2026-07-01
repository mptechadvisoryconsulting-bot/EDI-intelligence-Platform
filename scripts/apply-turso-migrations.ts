/**
 * Apply all Prisma migrations to a Turso/libSQL database via HTTP.
 * Prisma Migrate deploy does not work with remote libSQL — use this instead.
 *
 * Usage:
 *   $env:TURSO_DATABASE_URL="libsql://..."
 *   $env:TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/apply-turso-migrations.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { loadProductionEnv } from "./load-production-env";

loadProductionEnv();

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

function listMigrationFolders(): string[] {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function stripLineComments(sql: string): string {
  return sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

function splitSqlStatements(sql: string): string[] {
  const normalized = sql.replace(/\r\n/g, "\n");
  return normalized
    .split(/;\s*\n/)
    .map(stripLineComments)
    .filter((s) => s.length > 0);
}

async function resetMigrationState(client: ReturnType<typeof createClient>) {
  try {
    await client.execute(`DELETE FROM "_prisma_migrations"`);
    console.log("Cleared _prisma_migrations for fresh apply.");
  } catch {
    /* table may not exist yet */
  }
}

async function ensureMigrationsTable(client: ReturnType<typeof createClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                    TEXT PRIMARY KEY NOT NULL,
      checksum              TEXT NOT NULL,
      finished_at           DATETIME,
      migration_name        TEXT NOT NULL,
      logs                  TEXT,
      rolled_back_at        DATETIME,
      started_at            DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count   INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function isApplied(client: ReturnType<typeof createClient>, name: string) {
  const result = await client.execute({
    sql: `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ? AND finished_at IS NOT NULL`,
    args: [name],
  });
  return result.rows.length > 0;
}

async function markApplied(client: ReturnType<typeof createClient>, name: string) {
  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
          VALUES (?, ?, ?, datetime('now'), 1)`,
    args: [id, "turso-manual", name],
  });
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("Set TURSO_DATABASE_URL (libsql://...) before running.");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  await ensureMigrationsTable(client);

  if (process.env.TURSO_RESET === "1") {
    await resetMigrationState(client);
  }

  const folders = listMigrationFolders();
  console.log(`Applying ${folders.length} migration(s) to Turso...`);

  for (const folder of folders) {
    const migrationName = folder;
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");

    if (!fs.existsSync(sqlPath)) continue;

    if (await isApplied(client, migrationName)) {
      console.log(`  skip ${migrationName} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    const statements = splitSqlStatements(sql);

    console.log(`  apply ${migrationName} (${statements.length} statement(s))`);
    for (const statement of statements) {
      try {
        await client.execute(statement);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate column") || msg.includes("already exists")) {
          console.warn(`    warn: ${msg.slice(0, 120)}`);
          continue;
        }
        throw err;
      }
    }

    await markApplied(client, migrationName);
  }

  console.log("Turso migrations complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
