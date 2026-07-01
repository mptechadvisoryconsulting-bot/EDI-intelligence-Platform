import { createClient } from "@libsql/client";
import { loadProductionEnv } from "./load-production-env";

async function main() {
  loadProductionEnv();
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const users = await client.execute("SELECT COUNT(*) AS n FROM User");
  const cols = await client.execute('PRAGMA table_info("ImplementationProject")');
  const colNames = cols.rows.map((r) => String(r.name));

  console.log("Turso OK");
  console.log("  users:", users.rows[0]?.n ?? 0);
  console.log("  connectionType:", colNames.includes("connectionType") ? "yes" : "missing");
  console.log("  connectionProvider:", colNames.includes("connectionProvider") ? "yes" : "missing");
  console.log("  ediVersion:", colNames.includes("ediVersion") ? "yes" : "missing");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
