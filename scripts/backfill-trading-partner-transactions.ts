import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import {
  lifecycleStateFromLegacy,
  normalizePartnerName,
  transactionName,
} from "../src/lib/trading-partner-transactions";
import { parseTransactionCodes } from "../src/lib/transaction-packs";

async function main() {
  const projects = await db.implementationProject.findMany({
    include: {
      approvals: {
        where: { action: "production_deployed" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  let expectedTransactions = 0;
  for (const project of projects) {
    const partnerName = (project.tradingPartner || project.customer).trim();
    const codes = [...new Set(parseTransactionCodes(project.transactions))];
    if (!partnerName || codes.length === 0) {
      throw new Error(`Cannot migrate legacy implementation ${project.id}: partner and transaction are required`);
    }
    expectedTransactions += codes.length;
    const partner = await db.tradingPartner.upsert({
      where: {
        ownerId_normalizedName: {
          ownerId: project.ownerId,
          normalizedName: normalizePartnerName(partnerName),
        },
      },
      update: { name: partnerName },
      create: {
        id: randomUUID(),
        ownerId: project.ownerId,
        name: partnerName,
        normalizedName: normalizePartnerName(partnerName),
      },
    });

    for (const code of codes) {
      const state = lifecycleStateFromLegacy(project.status, project.reviewStatus);
      const version = project.approvals.length <= 1 ? "1.0" : `1.${project.approvals.length - 1}`;
      const transaction = await db.tradingPartnerTransaction.upsert({
        where: {
          tradingPartnerId_transactionCode_direction_businessStream: {
            tradingPartnerId: partner.id,
            transactionCode: code,
            direction: "inbound",
            businessStream: "default",
          },
        },
        update: {
          transactionName: transactionName(code),
          lifecycleState: state,
          currentVersion: version,
          productionVersion: state === "production" || state === "revision" ? version : null,
          interfaceDefinitionId: project.interfaceDefinitionId,
        },
        create: {
          id: randomUUID(),
          tradingPartnerId: partner.id,
          transactionCode: code,
          transactionName: transactionName(code),
          lifecycleState: state,
          currentVersion: version,
          productionVersion: state === "production" || state === "revision" ? version : null,
          legacyProjectId: project.id,
          interfaceDefinitionId: project.interfaceDefinitionId,
        },
      });
      await db.legacyImplementationLink.upsert({
        where: {
          transactionId_legacyProjectId: {
            transactionId: transaction.id,
            legacyProjectId: project.id,
          },
        },
        update: {},
        create: {
          id: randomUUID(),
          transactionId: transaction.id,
          legacyProjectId: project.id,
          relationship: transaction.legacyProjectId === project.id ? "primary" : "source",
        },
      });
      await db.transactionRevision.upsert({
        where: { transactionId_version: { transactionId: transaction.id, version } },
        update: {
          lifecycleState: state,
          isCurrent: true,
          goLiveAt: project.approvals.at(-1)?.createdAt ?? null,
        },
        create: {
          id: randomUUID(),
          transactionId: transaction.id,
          version,
          reason: version === "1.0" ? "Initial implementation" : "Migrated production revision",
          lifecycleState: state,
          isCurrent: true,
          goLiveAt: project.approvals.at(-1)?.createdAt ?? null,
          legacyProjectId: project.id,
        },
      });
    }
  }

  const migrated = await db.tradingPartnerTransaction.count({
    where: { legacyProjectId: { in: projects.map((project) => project.id) } },
  });
  const represented = await db.legacyImplementationLink.findMany({
    where: { legacyProjectId: { in: projects.map((project) => project.id) } },
    select: { legacyProjectId: true },
  });
  const representedIds = new Set(represented.map((row) => row.legacyProjectId));
  const missing = projects.filter((project) => !representedIds.has(project.id));
  if (missing.length > 0 || represented.length < expectedTransactions) {
    throw new Error(
      `Migration reconciliation failed: expected ${expectedTransactions} lineage links, found ${represented.length}, missing ${missing.length}`
    );
  }
  console.log(
    `Trading Partner Transaction backfill reconciled: ${projects.length} legacy implementation(s), ${migrated} transaction workspace(s), 0 missing.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
