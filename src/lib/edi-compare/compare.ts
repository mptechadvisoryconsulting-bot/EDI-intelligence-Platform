import type { MappingDraft } from "@/lib/types/parsing";
import {
  fieldKey,
  findSegments,
  getElementValue,
  parseEdiText,
  type ParsedEdiMessage,
} from "@/lib/edi/parse";
import type { PartnerPack, PartnerRule } from "@/lib/partner-packs/types";
import { getPartnerRulesForTransactions } from "@/lib/partner-packs";
import type { TransactionPack } from "@/lib/transaction-packs/types";

export type EdiCompareItem = {
  key: string;
  label: string;
  status: "present" | "missing" | "empty" | "unexpected";
  severity: "error" | "warning" | "info";
  expectedSource?: string | null;
  actualValue?: string;
  message: string;
};

export type EdiCompareReport = {
  score: number;
  summary: string;
  messagesAnalyzed: number;
  transactionSets: string[];
  present: EdiCompareItem[];
  missing: EdiCompareItem[];
  warnings: EdiCompareItem[];
  partnerViolations: EdiCompareItem[];
  sampleFile?: string;
};

function mappingKey(m: { targetSegment: string; targetElement: string; qualifier?: string | null }) {
  return fieldKey(m.targetSegment, m.targetElement, m.qualifier);
}

function checkRuleInMessage(rule: PartnerRule, message: ParsedEdiMessage): EdiCompareItem | null {
  if (rule.transactions.length && message.transactionSet && !rule.transactions.includes(message.transactionSet)) {
    return null;
  }

  const key = fieldKey(rule.segment, rule.element, rule.qualifier);
  const rows = findSegments(message, rule.segment, rule.qualifier);
  const label = `${rule.label} (${key})`;

  if (rows.length === 0) {
    if (!rule.required) return null;
    return {
      key: `rule:${rule.id}`,
      label,
      status: "missing",
      severity: "error",
      message: `Partner rule: ${rule.rule}`,
    };
  }

  const value = getElementValue(rows[0], rule.element);
  if (!value) {
    return {
      key: `rule:${rule.id}`,
      label,
      status: "empty",
      severity: rule.required ? "error" : "warning",
      actualValue: value,
      message: `Partner rule: ${rule.rule} — segment present but element ${rule.element} is empty`,
    };
  }

  if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
    return {
      key: `rule:${rule.id}`,
      label,
      status: "missing",
      severity: "error",
      actualValue: value,
      message: `Partner rule: ${rule.rule} — value "${value}" does not match expected pattern`,
    };
  }

  return {
    key: `rule:${rule.id}`,
    label,
    status: "present",
    severity: "info",
    actualValue: value,
    message: `Partner rule satisfied: ${rule.rule}`,
  };
}

function checkMappingInMessage(m: MappingDraft, message: ParsedEdiMessage): EdiCompareItem | null {
  const key = mappingKey(m);
  const rows = findSegments(message, m.targetSegment, m.qualifier);
  const label = key;

  if (rows.length === 0) {
    return {
      key: `map:${key}`,
      label,
      status: "missing",
      severity: "warning",
      expectedSource: m.sourceField,
      message: m.sourceField
        ? `Expected mapping target ${key} from source "${m.sourceField}" — not found in sample EDI`
        : `Expected segment ${key} not found in sample EDI`,
    };
  }

  const value = getElementValue(rows[0], m.targetElement);
  if (!value && m.confidence >= 0.5) {
    return {
      key: `map:${key}`,
      label,
      status: "empty",
      severity: "warning",
      expectedSource: m.sourceField,
      message: `${key} present but element ${m.targetElement} is empty`,
    };
  }

  return {
    key: `map:${key}`,
    label,
    status: "present",
    severity: "info",
    expectedSource: m.sourceField,
    actualValue: value,
    message: `${key} present${value ? `: "${value.slice(0, 50)}"` : ""}${m.sourceField ? ` (mapped from ${m.sourceField})` : ""}`,
  };
}

function packRequiredFields(packs: TransactionPack[], transactionSet: string | null) {
  if (!transactionSet) return [];
  const pack = packs.find((p) => p.code === transactionSet);
  if (!pack) return [];
  return pack.fields.filter((f) => f.required);
}

export function compareEdiSamples(input: {
  ediTexts: Array<{ name: string; text: string }>;
  mappings: MappingDraft[];
  partnerPack: PartnerPack;
  transactionPacks: TransactionPack[];
  projectTransactions: string;
}): EdiCompareReport {
  if (input.ediTexts.length === 0) {
    return {
      score: 0,
      summary: "No sample EDI files uploaded. Upload sample EDI as document type 'Sample EDI' to compare.",
      messagesAnalyzed: 0,
      transactionSets: [],
      present: [],
      missing: [],
      warnings: [],
      partnerViolations: [],
    };
  }

  const allPresent: EdiCompareItem[] = [];
  const allMissing: EdiCompareItem[] = [];
  const allWarnings: EdiCompareItem[] = [];
  const partnerItems: EdiCompareItem[] = [];
  const txSets = new Set<string>();
  let messagesAnalyzed = 0;

  const partnerRules = getPartnerRulesForTransactions(input.partnerPack, input.projectTransactions);
  const priorityMappings = input.mappings.filter((m) => m.confidence >= 0.4 || m.sourceField);

  for (const file of input.ediTexts) {
    const messages = parseEdiText(file.text);
    messagesAnalyzed += messages.length;

    for (const message of messages) {
      if (message.transactionSet) txSets.add(message.transactionSet);

      for (const rule of partnerRules) {
        const item = checkRuleInMessage(rule, message);
        if (!item) continue;
        if (item.status === "present") allPresent.push(item);
        else if (item.severity === "error") {
          allMissing.push(item);
          partnerItems.push(item);
        } else allWarnings.push(item);
      }

      for (const m of priorityMappings.slice(0, 25)) {
        if (message.transactionSet && m.targetSegment === "ST") continue;
        const item = checkMappingInMessage(m, message);
        if (!item) continue;
        if (item.status === "present") allPresent.push(item);
        else if (item.status === "missing") allMissing.push(item);
        else allWarnings.push(item);
      }

      if (message.transactionSet) {
        const requiredFields = packRequiredFields(input.transactionPacks, message.transactionSet);
        for (const field of requiredFields) {
          const key = fieldKey(field.segment, field.element, field.qualifier);
          if (allPresent.some((p) => p.key.includes(key)) || allMissing.some((m) => m.key.includes(key))) {
            continue;
          }
          const rows = findSegments(message, field.segment, field.qualifier);
          const value = rows[0] ? getElementValue(rows[0], field.element) : undefined;
          if (!rows.length || !value) {
            allMissing.push({
              key: `pack:${key}`,
              label: `${field.label} (${key})`,
              status: "missing",
              severity: "error",
              message: `Transaction pack requires ${key} on ${message.transactionSet}`,
            });
          }
        }
      }
    }
  }

  const dedupe = (items: EdiCompareItem[]) => {
    const seen = new Set<string>();
    return items.filter((i) => {
      if (seen.has(i.key)) return false;
      seen.add(i.key);
      return true;
    });
  };

  const present = dedupe(allPresent);
  const missing = dedupe(allMissing);
  const warnings = dedupe(allWarnings);
  const partnerViolations = dedupe(partnerItems);

  const totalChecks = present.length + missing.length + warnings.length;
  const score =
    totalChecks === 0
      ? 50
      : Math.round((present.length / totalChecks) * 100);

  const summary = [
    `Compared ${input.ediTexts.length} sample file(s), ${messagesAnalyzed} message(s).`,
    `${present.length} checks passed, ${missing.length} missing/error, ${warnings.length} warning(s).`,
    `Partner: ${input.partnerPack.name}. Score: ${score}/100.`,
  ].join(" ");

  return {
    score,
    summary,
    messagesAnalyzed,
    transactionSets: [...txSets],
    present,
    missing,
    warnings,
    partnerViolations,
    sampleFile: input.ediTexts.map((f) => f.name).join(", "),
  };
}

export function formatEdiCompareArtifact(report: EdiCompareReport): string {
  const lines = [
    "Sample EDI Compare Report",
    "=".repeat(50),
    report.summary,
    "",
  ];

  if (report.missing.length) {
    lines.push("MISSING / ERRORS:");
    report.missing.forEach((m) => lines.push(`  ✗ ${m.label}: ${m.message}`));
    lines.push("");
  }

  if (report.warnings.length) {
    lines.push("WARNINGS:");
    report.warnings.forEach((w) => lines.push(`  ! ${w.label}: ${w.message}`));
    lines.push("");
  }

  if (report.present.length) {
    lines.push("PASSED:");
    report.present.slice(0, 20).forEach((p) => lines.push(`  ✓ ${p.label}${p.actualValue ? `: ${p.actualValue}` : ""}`));
    if (report.present.length > 20) lines.push(`  ... and ${report.present.length - 20} more`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatEdiCompareCsv(report: EdiCompareReport): string {
  const rows = [
    "Status,Severity,Key,Label,ExpectedSource,ActualValue,Message",
    ...[...report.missing, ...report.warnings, ...report.present].map((i) =>
      [
        i.status,
        i.severity,
        i.key,
        `"${i.label.replace(/"/g, "'")}"`,
        `"${(i.expectedSource ?? "").replace(/"/g, "'")}"`,
        `"${(i.actualValue ?? "").replace(/"/g, "'")}"`,
        `"${i.message.replace(/"/g, "'")}"`,
      ].join(",")
    ),
  ];
  return rows.join("\n");
}
