export type ParsedTestScenario = {
  name: string;
  description?: string;
  preconditions?: string;
  expectedOutcome?: string;
  transactionCode?: string;
  relatedSegments: string[];
};

export type ParsedTargetField = {
  segment: string;
  element: string;
  description?: string;
  required?: boolean;
  qualifier?: string;
  loopPath?: string;
  parent?: string;
  usage?: "required" | "optional" | "conditional";
  condition?: string;
  dataType?: string;
  expectedFormat?: string;
  repeats?: string;
  reviewStatus?: "pending" | "confirmed" | "needs_review";
};

export type ParsedSourceField = {
  name: string;
  type?: string;
  table?: string;
  interfaceColumn?: string;
  interfaceStyle?: "positional" | "xml" | "soap" | "rest";
  recNumber?: number;
  startPosition?: number;
  charLimit?: number;
  xpath?: string;
  jsonPath?: string;
  soapPath?: string;
  soapOperation?: string;
};

export type ParsedDocument = {
  kind: string;
  targetFields: ParsedTargetField[];
  sourceFields: ParsedSourceField[];
  segments: string[];
  transactionSets: string[];
  testScenarios: ParsedTestScenario[];
  rawExcerpt: string;
  /** Full raw file text for sample EDI (enables re-compare without re-upload) */
  fullText?: string;
  warnings: string[];
};

export type MappingDraft = {
  targetSegment: string;
  targetElement: string;
  sourceField: string | null;
  transformation: string | null;
  qualifier: string | null;
  confidence: number;
  rationale: string;
  interfaceColumn?: string | null;
  recNumber?: number | null;
  startPosition?: number | null;
  charLimit?: number | null;
};

export type MergedTestScenario = {
  name: string;
  description?: string;
  source: "customer" | "pack" | "mapping";
  transactionCode?: string;
  preconditions?: string;
  expectedOutcome?: string;
  relatedSegments: string[];
  coveredMappings: string[];
  coverageStatus: "covered" | "partial" | "uncovered";
};

export type TestCoverageReport = {
  scenarios: MergedTestScenario[];
  uncoveredMappings: string[];
  summary: string;
};

export type AnalysisResult = {
  mappings: MappingDraft[];
  openQuestions: Array<{ question: string; category: string; priority: string }>;
  assumptions: Array<{ assumption: string; risk: string }>;
  artifacts: Array<{ type: string; title: string; content: string }>;
  testCoverage: TestCoverageReport;
  ediCompare?: import("@/lib/edi-compare/compare").EdiCompareReport;
  summary: string;
};
