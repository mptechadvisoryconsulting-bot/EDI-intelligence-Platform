import type { Document } from "@/generated/prisma/client";
import type { ParsedDocument, ParsedTargetField } from "@/lib/types/parsing";
import {
  TRANSACTION_PACKS,
  parseTransactionCodes,
  resolveTransactionPacks,
} from "@/lib/transaction-packs";
import { deserializeParsed } from "@/lib/uploads";

export type SpecRequirementRow = {
  key: string;
  sourceDocumentId: string;
  segment: string;
  element: string;
  qualifier?: string;
  description?: string;
  required: boolean;
  loopPath: string;
  parent: string;
  usage: "required" | "optional" | "conditional";
  condition?: string;
  dataType?: string;
  expectedFormat?: string;
  repeats?: string;
  reviewStatus: "pending" | "confirmed" | "needs_review";
  sourceDocument?: string;
  inPlatformPack: boolean;
  status: "supported" | "needs_mapping" | "clarification";
};

export type TransactionFeasibility = {
  code: string;
  name: string;
  status: "ready" | "partial" | "unsupported" | "not_in_spec";
  detail: string;
  inProjectScope: boolean;
  inCustomerSpec: boolean;
  platformSupported: boolean;
};

export type SpecReviewReport = {
  summary: string;
  canProduceNow: boolean;
  transactionFeasibility: TransactionFeasibility[];
  requirements: SpecRequirementRow[];
  detectedTransactionSets: string[];
  documentSummaries: Array<{
    id: string;
    name: string;
    kind: string;
    targetFieldCount: number;
    transactionSets: string[];
    warnings: string[];
  }>;
  customerFeasibilityEmail: string;
  gapsForCustomer: string[];
};

export function specRequirementKey(f: {
  loopPath?: string | null;
  parent?: string | null;
  segment: string;
  element: string;
  qualifier?: string | null;
}) {
  return `${f.loopPath ?? "Header"}|${f.parent ?? ""}|${f.segment}.${f.element}${f.qualifier ? `:${f.qualifier}` : ""}`;
}

function parseDocuments(documents: Document[]) {
  const parsed: Array<{ doc: Document; content: ParsedDocument }> = [];
  for (const doc of documents) {
    if (!doc.status.startsWith("parsed") || !doc.parsedContent) continue;
    const content = deserializeParsed(doc.parsedContent);
    if (content) parsed.push({ doc, content });
  }
  return parsed;
}

function aggregateTargetFields(
  parsedDocs: Array<{ doc: Document; content: ParsedDocument }>
): Array<ParsedTargetField & { sourceDocument: string; sourceDocumentId: string }> {
  const seen = new Set<string>();
  const fields: Array<ParsedTargetField & { sourceDocument: string; sourceDocumentId: string }> = [];

  for (const { doc, content } of parsedDocs) {
    for (const f of content.targetFields) {
      const key = specRequirementKey(f);
      if (seen.has(key)) continue;
      seen.add(key);
      fields.push({ ...f, sourceDocument: doc.name, sourceDocumentId: doc.id });
    }
  }
  return fields;
}

export function buildSpecReviewReport(input: {
  transactions: string;
  tradingPartner: string;
  translatorTarget: string;
  erpSystem: string;
  customer: string;
  documents: Document[];
}): SpecReviewReport {
  const parsedDocs = parseDocuments(input.documents);
  const projectCodes = parseTransactionCodes(input.transactions);
  const specTxSets = new Set<string>();
  const requirements = aggregateTargetFields(parsedDocs);

  for (const { content } of parsedDocs) {
    for (const tx of content.transactionSets) {
      const normalized = tx.replace(/^0+/, "").padStart(3, "0");
      if (/^\d{3}$/.test(normalized)) specTxSets.add(normalized);
    }
  }

  const allCodes = [...new Set([...projectCodes, ...specTxSets])];
  const detectedTransactionSets = [...specTxSets].sort();

  const transactionFeasibility: TransactionFeasibility[] = allCodes.map((code) => {
    const pack = TRANSACTION_PACKS[code];
    const inProjectScope = projectCodes.includes(code);
    const inCustomerSpec = specTxSets.has(code);
    const platformSupported = Boolean(pack);

    if (!platformSupported) {
      return {
        code,
        name: "Not in platform",
        status: "unsupported",
        detail: "Transaction pack not loaded — tell customer we cannot produce this yet.",
        inProjectScope,
        inCustomerSpec,
        platformSupported,
      };
    }

    const packRequired = pack!.fields.filter((f) => f.required);
    const specFieldsForTx = requirements.filter((r) => {
      return pack!.fields.some((pf) => pf.segment === r.segment && pf.element === r.element);
    });

    if (packRequired.length > 0 && specFieldsForTx.length === 0 && inCustomerSpec) {
      return {
        code,
        name: pack!.name,
        status: "partial",
        detail: "Transaction mentioned in spec but segment/element detail not parsed — review guide manually.",
        inProjectScope,
        inCustomerSpec,
        platformSupported,
      };
    }

    return {
      code,
      name: pack!.name,
      status: "ready",
      detail: inCustomerSpec
        ? "Supported — map ERP interface layout and export handoff."
        : inProjectScope
          ? "In implementation scope — confirm customer spec includes this transaction."
          : "Detected in implementation configuration.",
      inProjectScope,
      inCustomerSpec,
      platformSupported,
    };
  });

  if (transactionFeasibility.length === 0) {
    transactionFeasibility.push({
      code: "—",
      name: "No transactions configured",
      status: "partial",
      detail: "Set transaction codes on the implementation or upload a spec with EDI transaction sets.",
      inProjectScope: false,
      inCustomerSpec: false,
      platformSupported: false,
    });
  }

  const requirementRows: SpecRequirementRow[] = requirements.map((r) => {
    const inAnyPack = resolveTransactionPacks(input.transactions).some((pack) =>
      pack.fields.some(
        (pf) => pf.segment === r.segment && pf.element === r.element
      )
    );
    return {
      key: specRequirementKey(r),
      sourceDocumentId: r.sourceDocumentId,
      segment: r.segment,
      element: r.element,
      qualifier: r.qualifier,
      description: r.description,
      required: Boolean(r.required),
      loopPath: r.loopPath ?? "Header",
      parent: r.parent ?? r.loopPath ?? "Header",
      usage: r.usage ?? (r.required ? "required" : "optional"),
      condition: r.condition,
      dataType: r.dataType,
      expectedFormat: r.expectedFormat,
      repeats: r.repeats,
      reviewStatus: r.reviewStatus ?? "pending",
      sourceDocument: r.sourceDocument,
      inPlatformPack: inAnyPack,
      status: r.required && !inAnyPack ? "clarification" : inAnyPack ? "supported" : "needs_mapping",
    };
  });

  const unsupported = transactionFeasibility.filter((t) => t.status === "unsupported");
  const partial = transactionFeasibility.filter((t) => t.status === "partial");
  const ready = transactionFeasibility.filter((t) => t.status === "ready");
  const canProduceNow = unsupported.length === 0 && parsedDocs.length > 0;

  const gapsForCustomer: string[] = [];
  for (const t of unsupported) {
    gapsForCustomer.push(`Transaction ${t.code} is not supported in our current mapping library.`);
  }
  for (const t of partial) {
    gapsForCustomer.push(`${t.code} ${t.name}: ${t.detail}`);
  }
  const clarificationFields = requirementRows.filter((r) => r.status === "clarification");
  if (clarificationFields.length > 0) {
    gapsForCustomer.push(
      `${clarificationFields.length} mandatory segment/element(s) in the spec need clarification or custom handling.`
    );
  }
  if (parsedDocs.length === 0) {
    gapsForCustomer.push("No parsed specification documents — upload customer guide or mapping sheet first.");
  }

  const summary = canProduceNow
    ? `We can produce ${ready.length} transaction type(s) now${partial.length ? `; ${partial.length} need review` : ""}.`
    : unsupported.length > 0
      ? `${unsupported.length} transaction(s) cannot be produced yet.`
      : "Upload and parse customer specs to confirm feasibility.";

  const customerFeasibilityEmail = buildFeasibilityEmail({
    customer: input.customer,
    tradingPartner: input.tradingPartner,
    translatorTarget: input.translatorTarget,
    erpSystem: input.erpSystem,
    transactions: input.transactions,
    ready,
    unsupported,
    partial,
    gapsForCustomer,
  });

  return {
    summary,
    canProduceNow,
    transactionFeasibility,
    requirements: requirementRows,
    detectedTransactionSets,
    documentSummaries: parsedDocs.map(({ doc, content }) => ({
      id: doc.id,
      name: doc.name,
      kind: content.kind,
      targetFieldCount: content.targetFields.length,
      transactionSets: content.transactionSets,
      warnings: content.warnings,
    })),
    customerFeasibilityEmail,
    gapsForCustomer,
  };
}

function buildFeasibilityEmail(input: {
  customer: string;
  tradingPartner: string;
  translatorTarget: string;
  erpSystem: string;
  transactions: string;
  ready: TransactionFeasibility[];
  unsupported: TransactionFeasibility[];
  partial: TransactionFeasibility[];
  gapsForCustomer: string[];
}) {
  const supportedLines =
    input.ready.length > 0
      ? input.ready.map((t) => `  • ${t.code} ${t.name} — we can configure this`).join("\n")
      : "  • (pending spec review)";

  const gapLines =
    input.gapsForCustomer.length > 0
      ? input.gapsForCustomer.map((g) => `  • ${g}`).join("\n")
      : "  • None identified at this stage.";

  return [
    `Subject: EDI feasibility review — ${input.tradingPartner} (${input.transactions})`,
    "",
    `Hello ${input.customer},`,
    "",
    `Thank you for the EDI specification materials for ${input.tradingPartner}.`,
    `We reviewed your requirements against our ${input.translatorTarget} / ${input.erpSystem} implementation path.`,
    "",
    "Transactions we can produce now:",
    supportedLines,
    "",
    input.unsupported.length > 0 ? "Not available in our current scope:" : "",
    ...input.unsupported.map((t) => `  • ${t.code} — not in our standard pack library yet`),
    input.unsupported.length > 0 ? "" : "",
    "Items needing clarification or follow-up:",
    gapLines,
    "",
    "Next steps on our side: finalize ERP interface positions (Rec / Start / Width where applicable), build the mapping handoff package, and run pre-handoff test scenarios before translator configuration.",
    "",
    "Please reply with any corrections to the transaction list or mandatory fields.",
    "",
    "Best regards,",
    "EDI Implementation Team",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");
}
