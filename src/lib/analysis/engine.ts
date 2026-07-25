import type {
  AnalysisResult,
  MappingDraft,
  ParsedDocument,
  ParsedSourceField,
  ParsedTargetField,
} from "@/lib/types/parsing";
import {
  formatTestPlanArtifact,
  formatTestPlanCsv,
  mergeTestScenarios,
} from "@/lib/test-scenarios/merge";
import {
  buildSourceHintsMap,
  describeTransactionCoverage,
  getPackChecklist,
  getPackQuestions,
  packFieldToTarget,
  resolveTransactionPacks,
  type TransactionPack,
} from "@/lib/transaction-packs";
import { describeErpSupport, enrichHintsMap } from "@/lib/erp-profiles";
import { sourceTransformation } from "@/lib/erp-layout";
import {
  compareEdiSamples,
  formatEdiCompareArtifact,
  formatEdiCompareCsv,
} from "@/lib/edi-compare";
import {
  describePartnerSupport,
  getPartnerChecklist,
  getPartnerQuestions,
  resolvePartnerPack,
} from "@/lib/partner-packs";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function scoreFieldMatch(
  targetKey: string,
  source: ParsedSourceField,
  hintsMap: Record<string, string[]>
) {
  const hints = hintsMap[targetKey] ?? [];
  const names = [source.name, source.interfaceColumn, source.jsonPath, source.xpath, source.soapPath].filter(
    Boolean
  ) as string[];
  let bestScore = 0;

  for (const sourceName of names) {
    const normalizedSource = normalize(sourceName);
    if (hints.some((hint) => normalize(hint) === normalizedSource)) bestScore = Math.max(bestScore, 0.95);
    else if (hints.some((hint) => normalizedSource.includes(normalize(hint)))) bestScore = Math.max(bestScore, 0.82);

    const [segment, element] = targetKey.split(".");
    if (normalizedSource.includes(segment.toLowerCase()) && normalizedSource.includes(element)) {
      bestScore = Math.max(bestScore, 0.7);
    } else if (normalizedSource.includes(segment.toLowerCase())) {
      bestScore = Math.max(bestScore, 0.45);
    }
  }

  return bestScore;
}

function positionalTransformation(source: ParsedSourceField): string | null {
  return sourceTransformation(source);
}

function bestSourceMatch(
  target: ParsedTargetField,
  sourceFields: ParsedSourceField[],
  hintsMap: Record<string, string[]>
) {
  const key = `${target.segment}.${target.element}`;
  let best: ParsedSourceField | null = null;
  let bestScore = 0;

  for (const source of sourceFields) {
    const score = scoreFieldMatch(key, source, hintsMap);
    if (score > bestScore) {
      bestScore = score;
      best = source;
    }
  }

  if (bestScore >= 0.4) return { field: best, confidence: bestScore };
  return { field: null, confidence: 0 };
}

function targetsFromPacks(packs: TransactionPack[]): ParsedTargetField[] {
  return packs.flatMap((pack) => pack.fields.map(packFieldToTarget));
}

function buildMapping(
  target: ParsedTargetField,
  sourceFields: ParsedSourceField[],
  hintsMap: Record<string, string[]>,
  packs: TransactionPack[],
  erpProfileName: string
): MappingDraft {
  const match = bestSourceMatch(target, sourceFields, hintsMap);
  const key = `${target.segment}.${target.element}`;

  const packField = packs
    .flatMap((p) => p.fields)
    .find(
      (f) =>
        f.segment === target.segment &&
        f.element === target.element &&
        (f.qualifier ?? null) === (target.qualifier ?? null)
    );

  if (target.segment === "ST" && target.element === "01") {
    const txCode = packs.find((p) => p.fields.some((f) => f.segment === "ST"))?.code;
    return {
      targetSegment: target.segment,
      targetElement: target.element,
      sourceField: null,
      transformation: txCode ? `Constant: ${txCode}` : "Set from transaction pack",
      qualifier: target.qualifier ?? null,
      confidence: txCode ? 0.95 : 0.5,
      rationale: packField
        ? `${packField.label} — fixed per ${txCode} transaction family pack`
        : "Transaction set fixed per implementation scope",
    };
  }

  if (match.field) {
    const positional = positionalTransformation(match.field);
    return {
      targetSegment: target.segment,
      targetElement: target.element,
      sourceField: match.field.interfaceColumn ?? match.field.name,
      interfaceColumn: match.field.interfaceColumn ?? null,
      recNumber: match.field.recNumber ?? null,
      startPosition: match.field.startPosition ?? null,
      charLimit: match.field.charLimit ?? null,
      transformation:
        positional ??
        packField?.transformation ??
        (target.qualifier ? `Conditional on qualifier ${target.qualifier}` : "Direct map"),
      qualifier: target.qualifier ?? null,
      confidence: match.confidence,
      rationale: packField
        ? `${packField.label}: matched "${match.field.name}" using ${erpProfileName} + transaction pack hints${positional ? ` (${positional})` : ""}`
        : `Matched source field "${match.field.name}" to ${key}${positional ? ` — ${positional}` : ""}`,
    };
  }

  return {
    targetSegment: target.segment,
    targetElement: target.element,
    sourceField: null,
    transformation: packField?.transformation ?? null,
    qualifier: target.qualifier ?? null,
    confidence: target.required ? 0.15 : 0.25,
    rationale: packField
      ? `Required ${packField.label} (${key}) has no confident source match in uploaded ERP data`
      : target.required
        ? `Required target ${key} has no confident source match`
        : `Optional target ${key} needs manual source assignment`,
  };
}

export function runImplementationAnalysis(input: {
  parsedDocuments: ParsedDocument[];
  projectTransactions: string;
  erpSystem: string;
  tradingPartner: string;
  ediTexts?: Array<{ name: string; text: string }>;
  accountSourceFields?: ParsedSourceField[];
}): AnalysisResult {
  const packs = resolveTransactionPacks(input.projectTransactions);
  const partnerPack = resolvePartnerPack(input.tradingPartner);
  const baseHints = buildSourceHintsMap(packs);
  const { hints: hintsMap, profile: erpProfile } = enrichHintsMap(baseHints, input.erpSystem);

  const targetFields: ParsedTargetField[] = [];
  const sourceFields: ParsedSourceField[] = [];
  const segments = new Set<string>();

  for (const doc of input.parsedDocuments) {
    targetFields.push(...doc.targetFields);
    sourceFields.push(...doc.sourceFields);
    doc.segments.forEach((s) => segments.add(s));
  }

  if (input.accountSourceFields?.length) {
    const existing = new Set<string>();
    for (const s of sourceFields) {
      existing.add(normalize(s.name));
      if (s.interfaceColumn) existing.add(normalize(s.interfaceColumn));
    }
    for (const field of input.accountSourceFields) {
      const keys = [normalize(field.name), field.interfaceColumn ? normalize(field.interfaceColumn) : ""].filter(
        Boolean
      );
      if (!keys.some((k) => existing.has(k))) {
        sourceFields.push(field);
        keys.forEach((k) => existing.add(k));
      }
    }
  }

  const packTargets = targetsFromPacks(packs);
  targetFields.push(...packTargets);

  packs.forEach((pack) => pack.commonSegments.forEach((s) => segments.add(s)));

  const uniqueTargets = targetFields.filter((field, index, arr) => {
    const key = `${field.segment}.${field.element}${field.qualifier ? `:${field.qualifier}` : ""}`;
    return arr.findIndex((f) => `${f.segment}.${f.element}${f.qualifier ? `:${f.qualifier}` : ""}` === key) === index;
  });

  const uniqueSources = sourceFields.filter(
    (field, index, arr) => arr.findIndex((f) => normalize(f.name) === normalize(field.name)) === index
  );

  const mappings = uniqueTargets.map((target) =>
    buildMapping(target, uniqueSources, hintsMap, packs, erpProfile.name)
  );

  const openQuestions = mappings
    .filter((m) => !m.sourceField && m.confidence < 0.5)
    .map((m) => ({
      question: `What is the source for ${m.targetSegment}.${m.targetElement}${
        m.qualifier ? ` (qualifier ${m.qualifier})` : ""
      }? No match found in uploaded ERP/source files.`,
      category: "source_data",
      priority: m.confidence < 0.3 ? "high" : "medium",
    }));

  if (uniqueSources.length === 0) {
    openQuestions.unshift({
      question: input.accountSourceFields?.length
        ? `Account ERP layout loaded but no matches yet — verify field names align with ${input.erpSystem} interface columns.`
        : `Upload an ERP schema or configure your account ERP layout for ${input.erpSystem} to improve mapping confidence.`,
      category: "source_data",
      priority: "high",
    });
  }

  const packQuestions = getPackQuestions(packs);
  const partnerQuestions = getPartnerQuestions(partnerPack, input.projectTransactions);
  const mergedQuestions = [...openQuestions];
  for (const pq of [...packQuestions, ...partnerQuestions]) {
    if (!mergedQuestions.some((q) => q.question.includes(pq.question.slice(0, 40)))) {
      mergedQuestions.push(pq);
    }
  }

  const lowConfidence = mappings.filter((m) => m.confidence > 0 && m.confidence < 0.7);
  const assumptions = lowConfidence.map((m) => ({
    assumption: `${m.targetSegment}.${m.targetElement} mapped to "${m.sourceField}" should be validated with ${input.tradingPartner} guide requirements.`,
    risk: m.confidence < 0.5 ? "high" : "medium",
  }));

  const matrixLines = [
    "Segment,Element,Qualifier,Source,Transformation,Confidence,Review",
    ...mappings.map(
      (m) =>
        `${m.targetSegment},${m.targetElement},${m.qualifier ?? ""},${m.sourceField ?? ""},${m.transformation ?? ""},${Math.round(m.confidence * 100)}%,pending`
    ),
  ];

  const checklist = [...getPackChecklist(packs), ...getPartnerChecklist(partnerPack)];
  const packSummary = packs
    .map(
      (p) =>
        `${p.code} ${p.name}: ${p.fields.length} standard fields · ${p.testScenarios.length} test scenarios`
    )
    .join("\n");

  const testCoverage = mergeTestScenarios({
    customerScenarios: input.parsedDocuments.flatMap((d) => d.testScenarios ?? []),
    packs,
    mappings,
  });

  const ediTexts =
    input.ediTexts ??
    input.parsedDocuments
      .filter((d) => d.kind === "sample_edi")
      .filter((d) => d.fullText || d.rawExcerpt)
      .map((d, i) => ({
        name: `sample-${i + 1}`,
        text: d.fullText ?? d.rawExcerpt,
      }));

  const ediCompare = compareEdiSamples({
    ediTexts,
    mappings,
    partnerPack,
    transactionPacks: packs,
    projectTransactions: input.projectTransactions,
  });

  const artifacts = [
    {
      type: "mapping_matrix",
      title: "Mapping Matrix",
      content: matrixLines.join("\n"),
    },
    {
      type: "transaction_packs",
      title: "Transaction Family Packs",
      content: packSummary || "No supported transaction packs configured.",
    },
    {
      type: "open_questions",
      title: "Open Questions Log",
      content:
        mergedQuestions.length === 0
          ? "No open questions — all targets have source matches or constants."
          : mergedQuestions.map((q, i) => `${i + 1}. [${q.priority}] ${q.question}`).join("\n"),
    },
    {
      type: "assumptions",
      title: "Assumptions Log",
      content:
        assumptions.length === 0
          ? "No assumptions logged."
          : assumptions.map((a, i) => `${i + 1}. (${a.risk} risk) ${a.assumption}`).join("\n"),
    },
    {
      type: "checklist",
      title: "Implementation Checklist",
      content: checklist.join("\n"),
    },
    {
      type: "testing_scenarios",
      title: "QA Test Plan",
      content: formatTestPlanArtifact(testCoverage),
    },
    {
      type: "qa_test_plan_csv",
      title: "QA Test Plan (CSV)",
      content: formatTestPlanCsv(testCoverage),
    },
    {
      type: "test_coverage_gaps",
      title: "Test Coverage Gaps",
      content:
        testCoverage.uncoveredMappings.length === 0
          ? "All mappings have at least partial test scenario coverage."
          : [
              `${testCoverage.uncoveredMappings.length} mapping(s) lack test scenario coverage:`,
              ...testCoverage.uncoveredMappings.map((m) => `• ${m}`),
              "",
              "Add customer test scenarios in the spec or approve mapping-derived scenarios.",
            ].join("\n"),
    },
    {
      type: "partner_rules",
      title: `${partnerPack.name} Partner Rules`,
      content: [
        describePartnerSupport(input.tradingPartner),
        partnerPack.notes ?? "",
        "",
        "Certification checklist:",
        ...getPartnerChecklist(partnerPack),
        "",
        "Active rules:",
        ...getPartnerQuestions(partnerPack, input.projectTransactions).map((q) => `• ${q.question}`),
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      type: "edi_sample_compare",
      title: "Sample EDI Compare",
      content: formatEdiCompareArtifact(ediCompare),
    },
    {
      type: "edi_compare_csv",
      title: "Sample EDI Compare (CSV)",
      content: formatEdiCompareCsv(ediCompare),
    },
    {
      type: "erp_profile",
      title: "ERP Source Profile",
      content: [
        describeErpSupport(input.erpSystem),
        erpProfile.schemaNotes ?? "",
        `Profile: ${erpProfile.name} (${erpProfile.vendor})`,
        erpProfile.id === "custom"
          ? "Tip: Select a named ERP when creating the implementation, or upload your exact field list CSV."
          : `${Object.keys(erpProfile.fieldAliases).length} EDI target keys enriched with ${erpProfile.name} field aliases.`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      type: "handoff_summary",
      title: "Translator Handoff Summary",
      content: [
        describeTransactionCoverage(input.projectTransactions),
        `Targets analyzed: ${mappings.length}`,
        `Source fields available: ${uniqueSources.length}`,
        `Segments detected: ${[...segments].join(", ") || "none"}`,
        `Open questions: ${mergedQuestions.length}`,
        `Low-confidence mappings: ${lowConfidence.length}`,
        "",
        testCoverage.summary,
        "",
        ediCompare.messagesAnalyzed > 0 ? ediCompare.summary : "Upload sample EDI to run compare.",
        "",
        "Test scenarios:",
        ...testCoverage.scenarios.slice(0, 8).map((s) => `• [${s.source}] ${s.name}`),
      ].join("\n"),
    },
  ];

  return {
    mappings,
    openQuestions: mergedQuestions,
    assumptions,
    artifacts,
    testCoverage,
    ediCompare,
    summary: `${describeTransactionCoverage(input.projectTransactions)} ${describePartnerSupport(input.tradingPartner)} ${describeErpSupport(input.erpSystem)} Analyzed ${mappings.length} target fields against ${uniqueSources.length} source fields. ${testCoverage.summary}${ediCompare.messagesAnalyzed > 0 ? ` ${ediCompare.summary}` : ""}`,
  };
}
