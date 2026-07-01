/**
 * Rotate Turso DB token via Platform API, update .env.production.local + Vercel.
 *
 * Requires TURSO_PLATFORM_TOKEN from https://app.turso.tech → Settings → API tokens
 *
 * Usage:
 *   $env:TURSO_PLATFORM_TOKEN="..."
 *   npx tsx scripts/rotate-turso-token.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadProductionEnv } from "./load-production-env";

const ORG = "mptechadvisoryconsulting-bot";
const DB = "edi-intelligence-platform";

async function main() {
  loadProductionEnv();

  const platformToken = process.env.TURSO_PLATFORM_TOKEN;
  if (!platformToken) {
    console.error("Set TURSO_PLATFORM_TOKEN (Turso → Organization → API Tokens)");
    process.exit(1);
  }

  // Step 1: invalidate all existing DB tokens (rotates signing keys)
  const inv = await fetch(
    `https://api.turso.tech/v1/organizations/${ORG}/databases/${DB}/auth/rotate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${platformToken}` },
    }
  );
  if (!inv.ok) {
    console.warn("Token rotate endpoint:", inv.status, await inv.text());
  }

  // Step 2: mint fresh token
  const res = await fetch(
    `https://api.turso.tech/v1/organizations/${ORG}/databases/${DB}/auth/tokens?expiration=never&authorization=full-access`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${platformToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Token create failed:", res.status, err);
    process.exit(1);
  }

  const data = (await res.json()) as { jwt: string };
  const newToken = data.jwt;

  const envPath = path.join(process.cwd(), ".env.production.local");
  let envText = fs.readFileSync(envPath, "utf8");
  envText = envText.replace(
    /TURSO_AUTH_TOKEN=.*/,
    `TURSO_AUTH_TOKEN=${newToken}`
  );
  fs.writeFileSync(envPath, envText);

  console.log("Updating Vercel TURSO_AUTH_TOKEN...");
  try {
    execSync("vercel env rm TURSO_AUTH_TOKEN production --yes", { stdio: "inherit" });
  } catch {
    /* may not exist */
  }
  execSync("vercel env add TURSO_AUTH_TOKEN production", {
    input: newToken,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });

  console.log("Turso token rotated. Redeploying...");
  execSync("vercel --prod --yes", { stdio: "inherit" });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
