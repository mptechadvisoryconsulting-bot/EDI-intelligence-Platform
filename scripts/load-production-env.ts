import fs from "node:fs";
import path from "node:path";

/** Load .env.production.local into process.env (simple key=value parser). */
export function loadProductionEnv() {
  const file = path.join(process.cwd(), ".env.production.local");
  if (!fs.existsSync(file)) return false;

  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  return true;
}
