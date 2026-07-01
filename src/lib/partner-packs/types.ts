export type PartnerRule = {
  id: string;
  segment: string;
  element: string;
  qualifier?: string;
  label: string;
  required: boolean;
  transactions: string[];
  rule: string;
  pattern?: string;
};

export type PartnerPack = {
  id: string;
  name: string;
  retailer: string;
  category: "big_box" | "ecommerce" | "grocery" | "pharmacy" | "distribution" | "specialty" | "general";
  searchTerms: string[];
  rules: PartnerRule[];
  certificationChecklist: string[];
  notes?: string;
};

export type PartnerRuleViolation = {
  ruleId: string;
  label: string;
  severity: "error" | "warning";
  message: string;
};
