/**
 * Production hardening: rotate password, optional Turso token, write credentials file.
 * Password saved to .production-credentials.json (gitignored) — not printed to stdout.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { loadProductionEnv } from "./load-production-env";

function generatePassword() {
  const base = randomBytes(12).toString("base64url");
  return `Avept-EDI-${base}!9`;
}

async function main() {
  loadProductionEnv();

  const credPath = path.join(process.cwd(), ".production-credentials.json");
  const existing = fs.existsSync(credPath)
    ? (JSON.parse(fs.readFileSync(credPath, "utf8")) as Record<string, string>)
    : {};

  const newPassword = generatePassword();
  execSync(`npx tsx scripts/set-prod-password.ts "${newPassword}"`, {
    stdio: "inherit",
    env: process.env,
  });

  const creds = {
    ...existing,
    username: "Marcellis20",
    password: newPassword,
    updatedAt: new Date().toISOString(),
    loginUrl: "https://edi-intelligence-platform.vercel.app/login",
  };

  fs.writeFileSync(credPath, JSON.stringify(creds, null, 2));
  console.log("Production password updated. Credentials saved to .production-credentials.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
