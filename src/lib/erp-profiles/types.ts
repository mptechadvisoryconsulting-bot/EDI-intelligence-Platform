export type ErpProfile = {
  id: string;
  name: string;
  vendor: string;
  category: "enterprise" | "midmarket" | "cloud" | "legacy" | "custom";
  /** Maps EDI target keys (SEG.ELEM) to ERP-native field/column names */
  fieldAliases: Record<string, string[]>;
  searchTerms: string[];
  schemaNotes?: string;
};

export type ErpProfileSummary = Pick<ErpProfile, "id" | "name" | "vendor" | "category">;
