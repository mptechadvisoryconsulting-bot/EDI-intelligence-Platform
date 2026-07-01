import type { ParsedTestScenario } from "@/lib/types/parsing";

const SECTION_HEADERS =
  /^(test\s*(scenarios?|cases?|scripts?)|certification\s*(tests?|scenarios?)?|validation\s*(tests?|scenarios?)?|qa\s*tests?|acceptance\s*tests?|testing\s*requirements?)\s*:?\s*$/i;

const SCENARIO_LINE =
  /^(?:scenario|test\s*case|test)\s*[#:]?\s*(\d+|[A-Z0-9-]+)\s*[:\-.]\s*(.+)$/i;

const NUMBERED_LINE = /^(\d+)[.)]\s+(.+)$/;

const TRANSACTION_HINT = /\b(846|850|855|856|810|832|214|997)\b/;

const SEGMENT_HINT = /\b([A-Z]{2,3})[\*\.](\d{2,3})\b/g;

function extractSegments(text: string): string[] {
  const segments = new Set<string>();
  for (const match of text.matchAll(SEGMENT_HINT)) {
    segments.add(`${match[1]}.${match[2]}`);
  }
  return [...segments];
}

function extractTransaction(text: string): string | undefined {
  const match = text.match(TRANSACTION_HINT);
  return match?.[1];
}

function parseScenarioBlock(name: string, body: string): ParsedTestScenario {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let preconditions: string | undefined;
  let expectedOutcome: string | undefined;
  const descLines: string[] = [];

  for (const line of lines) {
    if (/^precondition(s)?\s*:/i.test(line)) {
      preconditions = line.replace(/^precondition(s)?\s*:/i, "").trim();
    } else if (/^expected(\s+result|\s+outcome)?\s*:/i.test(line)) {
      expectedOutcome = line.replace(/^expected(\s+result|\s+outcome)?\s*:/i, "").trim();
    } else if (/^given\s+/i.test(line) && !preconditions) {
      preconditions = line;
    } else if (/^then\s+/i.test(line) && !expectedOutcome) {
      expectedOutcome = line;
    } else {
      descLines.push(line);
    }
  }

  const fullText = [name, body].join(" ");
  return {
    name: name.trim(),
    description: descLines.join(" ").slice(0, 500) || undefined,
    preconditions,
    expectedOutcome,
    transactionCode: extractTransaction(fullText),
    relatedSegments: extractSegments(fullText),
  };
}

export function extractTestScenariosFromText(text: string): ParsedTestScenario[] {
  const scenarios: ParsedTestScenario[] = [];
  const lines = text.split(/\r?\n/);
  let inTestSection = false;
  let currentName: string | null = null;
  let currentBody: string[] = [];

  function flush() {
    if (currentName) {
      scenarios.push(parseScenarioBlock(currentName, currentBody.join("\n")));
      currentName = null;
      currentBody = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (SECTION_HEADERS.test(line)) {
      flush();
      inTestSection = true;
      continue;
    }

    const scenarioMatch = line.match(SCENARIO_LINE);
    if (scenarioMatch) {
      flush();
      currentName = scenarioMatch[2].trim();
      continue;
    }

    const numberedMatch = line.match(NUMBERED_LINE);
    if (inTestSection && numberedMatch && numberedMatch[2].length > 10) {
      flush();
      currentName = numberedMatch[2].trim();
      continue;
    }

    if (/^expected(\s+result|\s+outcome)?\s*:/i.test(line) && currentName) {
      currentBody.push(line);
      continue;
    }

    if (currentName) {
      currentBody.push(line);
    } else if (
      inTestSection &&
      /test|scenario|validate|verify|certification/i.test(line) &&
      line.length > 15
    ) {
      flush();
      currentName = line.replace(/^[-*•]\s*/, "");
    }
  }

  flush();

  if (scenarios.length === 0) {
    const bulletScenarios = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^[-*•]\s*(Test|Scenario|Validate|Verify)/i.test(l));

    for (const bullet of bulletScenarios) {
      const name = bullet.replace(/^[-*•]\s*/, "");
      scenarios.push(parseScenarioBlock(name, ""));
    }
  }

  const seen = new Set<string>();
  return scenarios.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseTestScenariosFromCsv(text: string): ParsedTestScenario[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const nameIdx = headers.findIndex((h) => /scenario|test|name|title/.test(h));
  const descIdx = headers.findIndex((h) => /description|detail|steps/.test(h));
  const expectedIdx = headers.findIndex((h) => /expected|result|outcome/.test(h));
  const precondIdx = headers.findIndex((h) => /precondition|given|setup/.test(h));
  const txIdx = headers.findIndex((h) => /transaction|tx|set/.test(h));

  if (nameIdx < 0) return [];

  const scenarios: ParsedTestScenario[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx];
    if (!name) continue;

    const fullText = cols.join(" ");
    scenarios.push({
      name,
      description: descIdx >= 0 ? cols[descIdx] : undefined,
      preconditions: precondIdx >= 0 ? cols[precondIdx] : undefined,
      expectedOutcome: expectedIdx >= 0 ? cols[expectedIdx] : undefined,
      transactionCode: txIdx >= 0 ? cols[txIdx] : extractTransaction(fullText),
      relatedSegments: extractSegments(fullText),
    });
  }

  return scenarios;
}
