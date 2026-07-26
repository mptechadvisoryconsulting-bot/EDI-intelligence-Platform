import { execFileSync } from "node:child_process";
const hasRemoteDatabase =
  process.env.TURSO_DATABASE_URL?.startsWith("libsql://") &&
  process.env.TURSO_AUTH_TOKEN &&
  process.env.TURSO_AUTH_TOKEN !== "[SENSITIVE]";

if (process.env.VERCEL === "1" && hasRemoteDatabase) {
  console.log("Applying additive Turso migrations before the Vercel build...");
  execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/apply-turso-migrations.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Backfilling and reconciling permanent Trading Partner Transactions...");
  execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/backfill-trading-partner-transactions.ts"], {
    stdio: "inherit",
    env: process.env,
  });
}

execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: process.env,
});
