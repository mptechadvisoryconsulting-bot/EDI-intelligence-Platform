/**
 * Push TURSO_* and AUTH_SECRET to Vercel production from environment variables.
 *
 * Usage (PowerShell) — set vars first, then run:
 *   $env:TURSO_DATABASE_URL="libsql://..."
 *   $env:TURSO_AUTH_TOKEN="..."
 *   $env:AUTH_SECRET="your-random-secret"
 *   npx tsx scripts/push-vercel-env.ts
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { loadProductionEnv } from "./load-production-env";

const VARS = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "AUTH_SECRET"] as const;

function pushEnv(name: string, value: string) {
  console.log(`Setting ${name} on Vercel (production)...`);
  execSync(`vercel env add ${name} production`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });
}

function main() {
  loadProductionEnv();
  for (const name of VARS) {
    let value = process.env[name];
    if (!value && name === "AUTH_SECRET") {
      value = randomBytes(32).toString("base64");
      console.log(`Generated AUTH_SECRET (${value.slice(0, 8)}...)`);
    }
    if (!value) {
      console.error(`Missing ${name}. Set it in your shell before running.`);
      process.exit(1);
    }
    try {
      pushEnv(name, value);
    } catch {
      console.log(`  ${name} may already exist — update in Vercel dashboard if needed.`);
    }
  }

  console.log("\nRedeploying production...");
  execSync("vercel --prod --yes", { stdio: "inherit" });
  console.log("\nDone. Credentials in .production-credentials.json");
}

main();
