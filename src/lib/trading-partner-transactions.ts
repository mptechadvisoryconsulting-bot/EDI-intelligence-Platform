import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { parseTransactionCodes, TRANSACTION_PACKS } from "@/lib/transaction-packs";
import { findDefaultInterfaceDefinition } from "@/lib/interface-definitions";

export const LIFECYCLE_LANES = [
  "technical_review",
  "needs_mapping",
  "testing",
  "ready_for_go_live",
  "production_changes",
] as const;

export function normalizePartnerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function lifecycleStateFromLegacy(status: string, reviewStatus = "pending") {
  if (status === "production") return "production";
  if (status === "revision") return "revision";
  if (status === "approved") return "ready_for_go_live";
  if (status.includes("customer_test")) return "customer_testing";
  if (status.includes("test")) return "internal_testing";
  if (status.includes("mapping")) return "mapping";
  if (reviewStatus === "approved") return "mapping";
  if (reviewStatus.includes("review")) return "technical_assessment";
  return "specification_received";
}

export function engineeringLane(lifecycleState: string) {
  if (["specification_received", "analysis", "technical_assessment", "waiting_business_approval"].includes(lifecycleState)) {
    return "technical_review";
  }
  if (["mapping", "validation"].includes(lifecycleState)) return "needs_mapping";
  if (["internal_testing", "customer_testing"].includes(lifecycleState)) return "testing";
  if (["ready_for_go_live", "go_live_approval", "scheduled"].includes(lifecycleState)) return "ready_for_go_live";
  if (lifecycleState === "revision") return "production_changes";
  return null;
}

export function transactionName(code: string) {
  return TRANSACTION_PACKS[code]?.name ?? `X12 ${code}`;
}

export async function syncTransactionLifecycleForLegacyProject(
  legacyProjectId: string,
  status: string,
  reviewStatus: string
) {
  const lifecycleState = lifecycleStateFromLegacy(status, reviewStatus);
  await db.tradingPartnerTransaction.updateMany({
    where: { legacyLinks: { some: { legacyProjectId } } },
    data: { lifecycleState },
  });
  await db.transactionRevision.updateMany({
    where: {
      isCurrent: true,
      transaction: { legacyLinks: { some: { legacyProjectId } } },
    },
    data: { lifecycleState },
  });
}

export async function createTradingPartnerTransactions(
  ownerId: string,
  input: {
    name?: string;
    customer?: string;
    tradingPartner?: string;
    erpSystem?: string;
    erpVersion?: string | null;
    translatorTarget?: string;
    connectionType?: string | null;
    connectionProvider?: string | null;
    ediVersion?: string | null;
    transactions?: string;
    description?: string | null;
  }
) {
  const partnerName = String(input.tradingPartner || input.customer || "").trim();
  if (!partnerName) throw new Error("Trading partner is required");
  const codes = [...new Set(parseTransactionCodes(String(input.transactions ?? "")))];
  if (codes.length === 0) throw new Error("At least one transaction code is required");
  const standard = await findDefaultInterfaceDefinition(ownerId, codes.join(","));

  return db.$transaction(async (tx) => {
    const partner = await tx.tradingPartner.upsert({
      where: {
        ownerId_normalizedName: {
          ownerId,
          normalizedName: normalizePartnerName(partnerName),
        },
      },
      update: { name: partnerName, status: "active" },
      create: {
        id: randomUUID(),
        ownerId,
        name: partnerName,
        normalizedName: normalizePartnerName(partnerName),
      },
    });

    const created = [];
    for (const code of codes) {
      const project = await tx.implementationProject.create({
        data: {
          name: codes.length === 1
            ? String(input.name || `${partnerName} ${code}`)
            : `${partnerName} ${code} ${transactionName(code)}`,
          customer: String(input.customer || partnerName),
          tradingPartner: partnerName,
          erpSystem: String(input.erpSystem ?? ""),
          erpVersion: input.erpVersion || null,
          translatorTarget: String(input.translatorTarget ?? ""),
          connectionType: input.connectionType || null,
          connectionProvider: input.connectionProvider || null,
          ediVersion: input.ediVersion || null,
          transactions: code,
          interfaceDefinitionId:
            standard?.transactionCode === code ? standard.id : null,
          description: input.description || null,
          ownerId,
        },
      });
      const transaction = await tx.tradingPartnerTransaction.create({
        data: {
          id: randomUUID(),
          tradingPartnerId: partner.id,
          transactionCode: code,
          transactionName: transactionName(code),
          lifecycleState: "specification_received",
          legacyProjectId: project.id,
          interfaceDefinitionId:
            standard?.transactionCode === code ? standard.id : null,
          revisions: {
            create: {
              id: randomUUID(),
              version: "1.0",
              reason: "Initial implementation",
              lifecycleState: "specification_received",
              legacyProjectId: project.id,
            },
          },
          legacyLinks: {
            create: {
              id: randomUUID(),
              legacyProjectId: project.id,
              relationship: "primary",
            },
          },
        },
        include: { tradingPartner: true, revisions: true },
      });
      created.push(transaction);
    }
    return created;
  });
}
