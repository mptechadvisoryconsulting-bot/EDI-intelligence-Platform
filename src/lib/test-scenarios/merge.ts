import type { MappingDraft, MergedTestScenario, ParsedTestScenario, TestCoverageReport } from "@/lib/types/parsing";
import type { TransactionPack } from "@/lib/transaction-packs/types";

function mappingKey(m: { targetSegment: string; targetElement: string; qualifier?: string | null }) {
  return `${m.targetSegment}.${m.targetElement}${m.qualifier ? `:${m.qualifier}` : ""}`;
}

function scenarioCoversMapping(scenario: MergedTestScenario, key: string): boolean {
  const [segment, rest] = key.split(".");
  const element = rest?.split(":")[0];

  if (scenario.relatedSegments.some((s) => s.startsWith(key) || s === `${segment}.${element}`)) {
    return true;
  }

  const blob = [scenario.name, scenario.description, scenario.expectedOutcome, scenario.preconditions]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return blob.includes(segment) && (element ? blob.includes(element) : true);
}

export function mergeTestScenarios(input: {
  customerScenarios: ParsedTestScenario[];
  packs: TransactionPack[];
  mappings: MappingDraft[];
}): TestCoverageReport {
  const merged: MergedTestScenario[] = [];

  for (const cs of input.customerScenarios) {
    merged.push({
      name: cs.name,
      description: cs.description,
      source: "customer",
      transactionCode: cs.transactionCode,
      preconditions: cs.preconditions,
      expectedOutcome: cs.expectedOutcome,
      relatedSegments: cs.relatedSegments,
      coveredMappings: [],
      coverageStatus: "uncovered",
    });
  }

  for (const pack of input.packs) {
    for (const scenario of pack.testScenarios) {
      const exists = merged.some(
        (m) => m.source === "customer" && m.name.toLowerCase().includes(scenario.toLowerCase().slice(0, 20))
      );
      if (exists) continue;

      merged.push({
        name: `[${pack.code}] ${scenario}`,
        description: `Standard ${pack.name} test scenario from transaction family pack`,
        source: "pack",
        transactionCode: pack.code,
        relatedSegments: pack.fields.slice(0, 4).map((f) => `${f.segment}.${f.element}`),
        coveredMappings: [],
        coverageStatus: "uncovered",
      });
    }
  }

  for (const m of input.mappings.filter((x) => x.confidence >= 0.5 || !x.sourceField)) {
    const key = mappingKey(m);
    const alreadyCovered = merged.some((s) => scenarioCoversMapping(s, key));
    if (alreadyCovered) continue;

    merged.push({
      name: `Validate ${key} mapping`,
      description: m.rationale,
      source: "mapping",
      transactionCode: m.targetSegment === "ST" ? m.transformation?.replace(/\D/g, "").slice(0, 3) : undefined,
      expectedOutcome: m.sourceField
        ? `Source "${m.sourceField}" maps to ${key}${m.transformation ? ` via ${m.transformation}` : ""}`
        : `Constant or derived value populates ${key}`,
      relatedSegments: [key.split(":")[0]],
      coveredMappings: [key],
      coverageStatus: "partial",
    });
  }

  const mappingKeys = input.mappings.map(mappingKey);

  for (const scenario of merged) {
    const covered = mappingKeys.filter((k) => scenarioCoversMapping(scenario, k));
    scenario.coveredMappings = covered;
    if (covered.length >= 2) scenario.coverageStatus = "covered";
    else if (covered.length === 1) scenario.coverageStatus = "partial";
    else scenario.coverageStatus = "uncovered";
  }

  const coveredByAny = new Set(merged.flatMap((s) => s.coveredMappings));
  const uncoveredMappings = mappingKeys.filter((k) => !coveredByAny.has(k));

  const customerCount = merged.filter((s) => s.source === "customer").length;
  const packCount = merged.filter((s) => s.source === "pack").length;
  const mappingCount = merged.filter((s) => s.source === "mapping").length;

  return {
    scenarios: merged,
    uncoveredMappings,
    summary: `${merged.length} test scenarios (${customerCount} customer, ${packCount} pack, ${mappingCount} mapping-derived). ${uncoveredMappings.length} mapping(s) without test coverage.`,
  };
}

export function formatTestPlanArtifact(report: TestCoverageReport): string {
  const lines = [
    "QA Test Plan — Combined Customer + Generated Scenarios",
    "=".repeat(60),
    report.summary,
    "",
  ];

  for (const [i, s] of report.scenarios.entries()) {
    lines.push(`${i + 1}. [${s.source.toUpperCase()}] ${s.name}`);
    if (s.transactionCode) lines.push(`   Transaction: ${s.transactionCode}`);
    if (s.description) lines.push(`   Description: ${s.description}`);
    if (s.preconditions) lines.push(`   Preconditions: ${s.preconditions}`);
    if (s.expectedOutcome) lines.push(`   Expected: ${s.expectedOutcome}`);
    if (s.relatedSegments.length) lines.push(`   Segments: ${s.relatedSegments.join(", ")}`);
    lines.push(`   Coverage: ${s.coverageStatus} (${s.coveredMappings.length} mapping(s))`);
    lines.push("");
  }

  if (report.uncoveredMappings.length) {
    lines.push("MAPPINGS WITHOUT TEST COVERAGE:");
    report.uncoveredMappings.forEach((m) => lines.push(`  • ${m}`));
  }

  return lines.join("\n");
}

export function formatTestPlanCsv(report: TestCoverageReport): string {
  const rows = [
    "Source,Name,Transaction,Preconditions,ExpectedOutcome,RelatedSegments,CoverageStatus,CoveredMappings",
    ...report.scenarios.map((s) =>
      [
        s.source,
        `"${s.name.replace(/"/g, "'")}"`,
        s.transactionCode ?? "",
        `"${(s.preconditions ?? "").replace(/"/g, "'")}"`,
        `"${(s.expectedOutcome ?? s.description ?? "").replace(/"/g, "'")}"`,
        `"${s.relatedSegments.join("; ")}"`,
        s.coverageStatus,
        `"${s.coveredMappings.join("; ")}"`,
      ].join(",")
    ),
  ];
  return rows.join("\n");
}
