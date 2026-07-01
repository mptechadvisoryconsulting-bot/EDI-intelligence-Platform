import type { PartnerPack, PartnerRule } from "./types";

function rule(
  id: string,
  segment: string,
  element: string,
  label: string,
  ruleText: string,
  transactions: string[],
  opts?: { qualifier?: string; required?: boolean; pattern?: string }
): PartnerRule {
  return {
    id,
    segment,
    element,
    qualifier: opts?.qualifier,
    label,
    required: opts?.required ?? true,
    transactions,
    rule: ruleText,
    pattern: opts?.pattern,
  };
}

const RETAIL_TX = ["846", "850", "855", "856", "810"];

export const PARTNER_PACKS: PartnerPack[] = [
  {
    id: "walmart",
    name: "Walmart",
    retailer: "Walmart",
    category: "big_box",
    searchTerms: ["walmart", "wal-mart", "wmt"],
    notes: "Walmart RSX / EDI compliance — verify latest Retail Link spec for your supplier program.",
    certificationChecklist: [
      "[ ] Confirm Walmart vendor number in REF segments",
      "[ ] Validate ship-to / mark-for store logic on 850",
      "[ ] ASN (856) includes SSCC carton labels where required",
      "[ ] Invoice (810) ties to PO and ASN references",
      "[ ] Complete Walmart certification test round in Retail Link",
    ],
    rules: [
      rule("wmt-850-po", "BEG", "03", "Purchase order number", "PO number must match Walmart PO exactly", ["850"], { required: true }),
      rule("wmt-850-date", "BEG", "05", "PO date", "Dates in CCYYMMDD", ["850"], { required: true, pattern: "^\\d{8}$" }),
      rule("wmt-850-shipto", "N1", "02", "Ship-to name", "N1*ST ship-to party required for DSD/direct programs", ["850"], { qualifier: "ST" }),
      rule("wmt-850-po1", "PO1", "02", "Line quantity", "PO1 quantity required on every line", ["850"], { required: true }),
      rule("wmt-850-uom", "PO1", "03", "Unit of measure", "UOM must map to X12 code list 355", ["850"], { required: true }),
      rule("wmt-856-bsn", "BSN", "02", "Shipment ID", "BSN02 shipment identification required on ASN", ["856"], { required: true }),
      rule("wmt-856-hl", "HL", "03", "Hierarchy level", "HL hierarchy for shipment/order/pack/item", ["856"], { required: true }),
      rule("wmt-810-inv", "BIG", "02", "Invoice number", "Invoice must reference Walmart PO", ["810"], { required: true }),
      rule("wmt-846-qty", "QTY", "02", "Available quantity", "846 inventory qty with valid UOM", ["846"], { required: true }),
    ],
  },
  {
    id: "target",
    name: "Target",
    retailer: "Target",
    category: "big_box",
    searchTerms: ["target", "tgt"],
    notes: "Target Partners Online (TPO) EDI — confirm VIC vendor ID and routing.",
    certificationChecklist: [
      "[ ] Vendor ID and routing validated with Target EDI team",
      "[ ] 850 change/cancel scenarios tested",
      "[ ] 856 ASN carton/pallet hierarchy verified",
      "[ ] 810 invoice matches PO line totals",
      "[ ] Sign off Target certification checklist in TPO",
    ],
    rules: [
      rule("tgt-850-po", "BEG", "03", "Purchase order number", "Target PO number in BEG03", ["850"], { required: true }),
      rule("tgt-850-ref", "REF", "02", "Vendor reference", "REF*VN vendor reference when drop-ship", ["850"], { qualifier: "VN" }),
      rule("tgt-850-po1", "PO1", "02", "Line quantity", "Ordered quantity on each PO1", ["850"], { required: true }),
      rule("tgt-855-ack", "BAK", "02", "Acknowledgment type", "855 must acknowledge PO status", ["855"], { required: true }),
      rule("tgt-856-asn", "BSN", "02", "Shipment ID", "ASN shipment ID unique per ship notice", ["856"], { required: true }),
      rule("tgt-810-inv", "BIG", "02", "Invoice number", "810 invoice number required", ["810"], { required: true }),
      rule("tgt-810-date", "BIG", "07", "Invoice date", "Invoice date CCYYMMDD", ["810"], { required: true, pattern: "^\\d{8}$" }),
    ],
  },
  {
    id: "amazon",
    name: "Amazon Vendor Central",
    retailer: "Amazon",
    category: "ecommerce",
    searchTerms: ["amazon", "vendor central", "avc", "amazon retail"],
    notes: "Amazon EDI varies by program (Direct Fulfillment, Retail, 1P). Confirm message guide version.",
    certificationChecklist: [
      "[ ] Confirm Amazon vendor code and AS2/VAN routing",
      "[ ] Test PO acknowledgment (855) within SLA window",
      "[ ] ASN submitted before invoice",
      "[ ] Label and carton SSCC requirements validated",
      "[ ] Complete Amazon EDI self-certification in Vendor Central",
    ],
    rules: [
      rule("amz-850-po", "BEG", "03", "Purchase order number", "Amazon PO number required", ["850"], { required: true }),
      rule("amz-850-po1", "PO1", "02", "Line quantity", "Line quantity on PO1", ["850"], { required: true }),
      rule("amz-855-ack", "BAK", "02", "PO acknowledgment", "855 acknowledgment within program SLA", ["855"], { required: true }),
      rule("amz-856-bsn", "BSN", "02", "Shipment ID", "856 BSN02 required before invoice", ["856"], { required: true }),
      rule("amz-856-ref", "REF", "02", "Amazon reference", "REF with Amazon shipment/PO reference", ["856"], { qualifier: "CN" }),
      rule("amz-810-inv", "BIG", "02", "Invoice number", "810 must reference Amazon PO", ["810"], { required: true }),
      rule("amz-846-inv", "LIN", "02", "Inventory line", "846 line-level inventory status", ["846"], { required: true }),
    ],
  },
  {
    id: "costco",
    name: "Costco",
    retailer: "Costco",
    category: "big_box",
    searchTerms: ["costco"],
    certificationChecklist: [
      "[ ] Costco item/vendor numbers validated",
      "[ ] PO and ASN cross-reference tested",
      "[ ] Invoice totals reconcile to PO",
    ],
    rules: [
      rule("cost-850-po", "BEG", "03", "Purchase order number", "Costco PO in BEG03", ["850"], { required: true }),
      rule("cost-850-po1", "PO1", "02", "Line quantity", "PO1 quantity required", ["850"], { required: true }),
      rule("cost-856-asn", "BSN", "02", "Shipment ID", "856 shipment ID", ["856"], { required: true }),
      rule("cost-810-inv", "BIG", "02", "Invoice number", "810 invoice number", ["810"], { required: true }),
    ],
  },
  {
    id: "homedepot",
    name: "The Home Depot",
    retailer: "The Home Depot",
    category: "big_box",
    searchTerms: ["home depot", "homedepot", "thd"],
    certificationChecklist: [
      "[ ] THD supplier ID confirmed",
      "[ ] Drop-ship REF segments validated",
      "[ ] ASN and invoice certification complete",
    ],
    rules: [
      rule("thd-850-po", "BEG", "03", "Purchase order number", "THD PO number", ["850"], { required: true }),
      rule("thd-850-ref", "REF", "02", "Vendor reference", "REF*VN for vendor account", ["850"], { qualifier: "VN" }),
      rule("thd-856-asn", "BSN", "02", "Shipment ID", "856 ASN required", ["856"], { required: true }),
      rule("thd-810-inv", "BIG", "02", "Invoice number", "810 invoice", ["810"], { required: true }),
    ],
  },
  {
    id: "kroger",
    name: "Kroger",
    retailer: "Kroger",
    category: "grocery",
    searchTerms: ["kroger"],
    certificationChecklist: [
      "[ ] Kroger vendor number on REF segments",
      "[ ] Grocery UOM and catch-weight rules validated",
    ],
    rules: [
      rule("kr-850-po", "BEG", "03", "Purchase order number", "Kroger PO", ["850"], { required: true }),
      rule("kr-850-po1", "PO1", "03", "Unit of measure", "Grocery UOM codes", ["850"], { required: true }),
      rule("kr-856-asn", "BSN", "02", "Shipment ID", "ASN shipment ID", ["856"], { required: true }),
    ],
  },
  {
    id: "lowes",
    name: "Lowe's",
    retailer: "Lowe's",
    category: "big_box",
    searchTerms: ["lowes", "lowe's"],
    certificationChecklist: [
      "[ ] Lowe's vendor ID confirmed in REF segments",
      "[ ] ASN carton hierarchy validated",
      "[ ] 810 invoice ties to PO and ASN",
    ],
    rules: [
      rule("low-850-po", "BEG", "03", "Purchase order number", "Lowe's PO number", ["850"], { required: true }),
      rule("low-850-po1", "PO1", "02", "Line quantity", "PO1 quantity required", ["850"], { required: true }),
      rule("low-856-asn", "BSN", "02", "Shipment ID", "856 ASN required", ["856"], { required: true }),
      rule("low-810-inv", "BIG", "02", "Invoice number", "810 invoice", ["810"], { required: true }),
    ],
  },
  {
    id: "unfi",
    name: "UNFI",
    retailer: "UNFI",
    category: "distribution",
    searchTerms: ["unfi", "united natural foods"],
    certificationChecklist: [
      "[ ] UNFI vendor code on REF segments",
      "[ ] Organic / specialty item identifiers validated",
      "[ ] 846 inventory feed if VMI program",
    ],
    rules: [
      rule("unfi-850-po", "BEG", "03", "Purchase order number", "UNFI PO", ["850"], { required: true }),
      rule("unfi-850-po1", "PO1", "02", "Line quantity", "Case/pack quantity rules", ["850"], { required: true }),
      rule("unfi-856-asn", "BSN", "02", "Shipment ID", "ASN required", ["856"], { required: true }),
      rule("unfi-846-qty", "QTY", "02", "Available quantity", "846 if inventory program", ["846"], { required: false }),
    ],
  },
  {
    id: "cvs",
    name: "CVS Health",
    retailer: "CVS Health",
    category: "pharmacy",
    searchTerms: ["cvs"],
    certificationChecklist: [
      "[ ] CVS vendor number validated",
      "[ ] NDC / item identifier mapping confirmed",
      "[ ] ASN timing before DC receipt",
    ],
    rules: [
      rule("cvs-850-po", "BEG", "03", "Purchase order number", "CVS PO", ["850"], { required: true }),
      rule("cvs-850-po1", "PO1", "07", "Buyer's part number", "NDC or buyer item", ["850"], { required: true }),
      rule("cvs-856-asn", "BSN", "02", "Shipment ID", "856 ASN", ["856"], { required: true }),
      rule("cvs-810-inv", "BIG", "02", "Invoice number", "810 invoice", ["810"], { required: true }),
    ],
  },
  {
    id: "walgreens",
    name: "Walgreens",
    retailer: "Walgreens",
    category: "pharmacy",
    searchTerms: ["walgreens"],
    certificationChecklist: [
      "[ ] Walgreens supplier ID confirmed",
      "[ ] Item and UOM codes validated",
    ],
    rules: [
      rule("wag-850-po", "BEG", "03", "Purchase order number", "Walgreens PO", ["850"], { required: true }),
      rule("wag-856-asn", "BSN", "02", "Shipment ID", "856 ASN", ["856"], { required: true }),
      rule("wag-810-inv", "BIG", "02", "Invoice number", "810 invoice", ["810"], { required: true }),
    ],
  },
  {
    id: "dollargeneral",
    name: "Dollar General",
    retailer: "Dollar General",
    category: "big_box",
    searchTerms: ["dollar general", "dg"],
    certificationChecklist: [
      "[ ] DG vendor number on REF",
      "[ ] Routing guide compliance",
    ],
    rules: [
      rule("dg-850-po", "BEG", "03", "Purchase order number", "DG PO", ["850"], { required: true }),
      rule("dg-856-asn", "BSN", "02", "Shipment ID", "856 ASN", ["856"], { required: true }),
      rule("dg-810-inv", "BIG", "02", "Invoice number", "810 invoice", ["810"], { required: true }),
    ],
  },
  {
    id: "albertsons",
    name: "Albertsons",
    retailer: "Albertsons",
    category: "grocery",
    searchTerms: ["albertsons", "safeway"],
    certificationChecklist: [
      "[ ] Albertsons vendor ID validated",
      "[ ] Grocery UOM and catch-weight rules",
    ],
    rules: [
      rule("alb-850-po", "BEG", "03", "Purchase order number", "Albertsons PO", ["850"], { required: true }),
      rule("alb-856-asn", "BSN", "02", "Shipment ID", "856 ASN", ["856"], { required: true }),
    ],
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    retailer: "Best Buy",
    category: "specialty",
    searchTerms: ["best buy", "bestbuy"],
    certificationChecklist: [
      "[ ] Best Buy vendor ID confirmed",
      "[ ] Serial number / SKU mapping on PO1",
    ],
    rules: [
      rule("bb-850-po", "BEG", "03", "Purchase order number", "Best Buy PO", ["850"], { required: true }),
      rule("bb-850-po1", "PO1", "09", "Vendor part number", "SKU on PO1", ["850"], { required: true }),
      rule("bb-856-asn", "BSN", "02", "Shipment ID", "856 ASN", ["856"], { required: true }),
    ],
  },
  {
    id: "dicks",
    name: "Dick's Sporting Goods",
    retailer: "Dick's Sporting Goods",
    category: "specialty",
    searchTerms: ["dicks", "dick's sporting goods"],
    certificationChecklist: [
      "[ ] Dick's vendor ID validated",
      "[ ] Label and routing requirements",
    ],
    rules: [
      rule("dks-850-po", "BEG", "03", "Purchase order number", "Dick's PO", ["850"], { required: true }),
      rule("dks-856-asn", "BSN", "02", "Shipment ID", "856 ASN", ["856"], { required: true }),
      rule("dks-810-inv", "BIG", "02", "Invoice number", "810 invoice", ["810"], { required: true }),
    ],
  },
  {
    id: "generic_retail",
    name: "Generic Retail Partner",
    retailer: "Any",
    category: "general",
    searchTerms: ["generic", "retail", "partner", "any"],
    notes: "Baseline retail EDI rules — upload partner guide for specifics.",
    certificationChecklist: [
      "[ ] Partner implementation guide uploaded",
      "[ ] Sample EDI compared against mappings",
      "[ ] Certification test scenarios executed",
    ],
    rules: RETAIL_TX.flatMap((tx) => [
      ...(tx === "850"
        ? [
            rule("gen-850-po", "BEG", "03", "Purchase order number", "PO number on 850", ["850"], { required: true }),
            rule("gen-850-po1", "PO1", "02", "Line quantity", "Line quantity on PO1", ["850"], { required: true }),
          ]
        : []),
      ...(tx === "856"
        ? [rule("gen-856-bsn", "BSN", "02", "Shipment ID", "BSN on ASN", ["856"], { required: true })]
        : []),
      ...(tx === "810"
        ? [rule("gen-810-inv", "BIG", "02", "Invoice number", "Invoice number on 810", ["810"], { required: true })]
        : []),
    ]),
  },
];

export function listPartnerPacks() {
  return PARTNER_PACKS.filter((p) => p.id !== "generic_retail");
}

export function getPartnerPackById(id: string): PartnerPack | undefined {
  return PARTNER_PACKS.find((p) => p.id === id);
}

export function resolvePartnerPack(tradingPartner: string): PartnerPack {
  const normalized = tradingPartner.trim().toLowerCase();
  if (!normalized) return getPartnerPackById("generic_retail")!;

  const exact = PARTNER_PACKS.find(
    (p) =>
      p.id === normalized ||
      p.name.toLowerCase() === normalized ||
      p.retailer.toLowerCase() === normalized
  );
  if (exact) return exact;

  const scored = PARTNER_PACKS.map((profile) => {
    let score = 0;
    const nameLower = profile.name.toLowerCase();
    if (normalized.includes(nameLower) || nameLower.includes(normalized)) score += 10;
    for (const term of profile.searchTerms) {
      if (normalized.includes(term)) score += 5;
    }
    return { profile, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.profile ?? getPartnerPackById("generic_retail")!;
}

export function getPartnerRulesForTransactions(pack: PartnerPack, transactions: string): PartnerRule[] {
  const codes = transactions
    .split(/[,;/\s]+/)
    .map((t) => t.trim().replace(/^0+/, "").padStart(3, "0"))
    .filter((t) => /^\d{3}$/.test(t));

  const codeSet = new Set(codes);
  return pack.rules.filter((r) => r.transactions.some((tx) => codeSet.has(tx)));
}

export function getPartnerChecklist(pack: PartnerPack): string[] {
  return pack.certificationChecklist;
}

export function getPartnerQuestions(pack: PartnerPack, transactions: string) {
  const rules = getPartnerRulesForTransactions(pack, transactions);
  return rules
    .filter((r) => r.required)
    .slice(0, 6)
    .map((r) => ({
      question: `[${pack.name}] Confirm ${r.label} (${r.segment}.${r.element}${r.qualifier ? ` ${r.qualifier}` : ""}): ${r.rule}`,
      category: "partner_rule",
      priority: "medium",
    }));
}

export function describePartnerSupport(tradingPartner: string): string {
  const pack = resolvePartnerPack(tradingPartner);
  if (pack.id === "generic_retail") {
    return `Generic partner rules for "${tradingPartner}" — select a named retailer or upload partner guide for stricter validation.`;
  }
  return `${pack.name} partner rule pack active: ${pack.rules.length} rules, ${pack.certificationChecklist.length} certification steps.`;
}
