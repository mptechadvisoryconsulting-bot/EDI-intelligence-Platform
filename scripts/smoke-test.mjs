/**
 * Smoke test — run after build: node scripts/smoke-test.mjs
 * Requires dev or production server on BASE_URL (default http://localhost:3001)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.push({ name, ok: false, error: msg });
    console.error(`✗ ${name}: ${msg}`);
  }
}

async function get(path, expectStatus = 200) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  if (res.status !== expectStatus) {
    throw new Error(`GET ${path} → ${res.status}, expected ${expectStatus}`);
  }
  return res;
}

async function main() {
  console.log(`Smoke test → ${BASE}\n`);

  await check("Home/login reachable", async () => {
    const res = await get("/login", 200);
    const html = await res.text();
    if (!html.includes("login") && !html.includes("Login") && !html.includes("Sign")) {
      throw new Error("Login page HTML unexpected");
    }
  });

  await check("Dashboard redirects unauthenticated", async () => {
    await get("/dashboard", 307);
  });

  await check("Account ERP layout API requires auth", async () => {
    await get("/api/account/erp-layout", 401);
  });

  await check("Sample Oracle layout file served", async () => {
    const res = await get("/samples/oracle-erp-layout.csv", 200);
    const text = await res.text();
    if (!text.includes("Interface") && !text.includes("interface")) {
      throw new Error("Sample layout CSV missing expected columns");
    }
  });

  await check("Root redirects to login or dashboard", async () => {
    const res = await fetch(`${BASE}/`, { redirect: "manual" });
    if (![200, 307, 308].includes(res.status)) {
      throw new Error(`GET / → ${res.status}`);
    }
  });

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main();
