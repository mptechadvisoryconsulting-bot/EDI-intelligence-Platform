import type { ParsedTargetField } from "@/lib/types/parsing";

export type TransactionPackField = {
  segment: string;
  element: string;
  qualifier?: string;
  label: string;
  required: boolean;
  sourceHints: string[];
  transformation?: string;
  notes?: string;
};

export type TransactionPack = {
  code: string;
  name: string;
  family: string;
  description: string;
  direction: "inbound" | "outbound" | "both";
  commonSegments: string[];
  fields: TransactionPackField[];
  setupChecklist: string[];
  commonQuestions: string[];
  testScenarios: string[];
};

export function packFieldToTarget(field: TransactionPackField): ParsedTargetField {
  return {
    segment: field.segment,
    element: field.element,
    qualifier: field.qualifier,
    required: field.required,
    description: field.label,
  };
}

export function buildSourceHintsMap(packs: TransactionPack[]): Record<string, string[]> {
  const map: Record<string, string[]> = {
    "ISA.ISA06": ["sender_id", "isa_sender_id", "interchange_sender", "edi_sender"],
    "ISA.ISA08": ["receiver_id", "isa_receiver_id", "interchange_receiver", "edi_receiver"],
    "GS.GS02": ["application_sender", "gs_sender", "functional_sender"],
    "GS.GS03": ["application_receiver", "gs_receiver", "functional_receiver"],
    "ST.ST01": ["transaction_set", "transaction_type", "edi_transaction"],
  };

  for (const pack of packs) {
    for (const field of pack.fields) {
      const key = `${field.segment}.${field.element}`;
      map[key] = [...new Set([...(map[key] ?? []), ...field.sourceHints])];
    }
  }

  return map;
}

export function getPackChecklist(packs: TransactionPack[]): string[] {
  const items = new Set<string>([
    "[ ] Upload final implementation guide",
    "[ ] Upload ERP/source field list",
    "[ ] Review low-confidence mappings",
    "[ ] Resolve open source-data questions",
    "[ ] QA sign-off before translator configuration",
  ]);

  for (const pack of packs) {
    pack.setupChecklist.forEach((item) => items.add(item));
  }

  return [...items];
}

export function getPackQuestions(packs: TransactionPack[]): Array<{ question: string; category: string; priority: string }> {
  return packs.flatMap((pack) =>
    pack.commonQuestions.map((question) => ({
      question: `[${pack.code}] ${question}`,
      category: "business_rule",
      priority: "medium",
    }))
  );
}
