import fs from "node:fs";
import { db } from "../src/lib/db";

const csv = fs.readFileSync("public/samples/oracle-erp-layout.csv", "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
const fields = lines.slice(1).map((line) => {
  const cols = line.split(",").map((c) => c.trim());
  return {
    fieldName: cols[1],
    interfaceColumn: cols[0],
    startPosition: parseInt(cols[2], 10) || undefined,
    charLimit: parseInt(cols[3], 10) || undefined,
    dataType: cols[4],
    table: cols[5],
    description: cols[6],
  };
});

async function main() {
  const user = await db.user.findUnique({ where: { username: "Marcellis20" } });
  if (!user) {
    console.error("User Marcellis20 not found");
    process.exit(1);
  }

  const profile = {
    erpSystem: "Oracle Fusion Cloud ERP",
    erpVersion: null,
    originalFileName: "oracle-erp-layout.csv",
    fields,
    fieldCount: fields.length,
  };

  await db.erpLayoutProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      erpSystem: profile.erpSystem,
      fieldCount: fields.length,
      layoutContent: JSON.stringify(profile),
      originalFileName: profile.originalFileName,
    },
    update: {
      erpSystem: profile.erpSystem,
      fieldCount: fields.length,
      layoutContent: JSON.stringify(profile),
      originalFileName: profile.originalFileName,
    },
  });

  console.log(`Seeded Oracle layout for ${user.username}: ${fields.length} fields`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
