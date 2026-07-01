/**
 * Push OPENAI_API_KEY to Vercel if set in .env.production.local
 */
import { execSync } from "node:child_process";
import { loadProductionEnv } from "./load-production-env";

function main() {
  loadProductionEnv();
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  if (!key || key.startsWith("sk-") === false) {
    console.log("No OPENAI_API_KEY in .env.production.local — copilot uses rules engine.");
    console.log("Add OPENAI_API_KEY=sk-... to .env.production.local and re-run.");
    process.exit(0);
  }

  for (const [name, value] of [
    ["OPENAI_API_KEY", key],
    ["OPENAI_MODEL", model],
  ] as const) {
    try {
      execSync(`vercel env rm ${name} production --yes`, { stdio: "pipe" });
    } catch {
      /* ignore */
    }
    execSync(`vercel env add ${name} production`, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    });
    console.log(`Set ${name} on Vercel production.`);
  }

  execSync("vercel --prod --yes", { stdio: "inherit" });
}

main();
