/** Industry-standard ANSI X12 transaction sets — retail & supply chain focus */

export type TransactionSetCatalogEntry = {
  code: string;
  name: string;
  direction: "inbound" | "outbound" | "bidirectional";
  category: "retail_core" | "retail_extended" | "warehouse" | "transportation" | "financial" | "general";
  description: string;
  /** Has a full mapping pack in the platform */
  implemented: boolean;
  commonPartners?: string[];
};

export const INDUSTRY_TRANSACTION_SETS: TransactionSetCatalogEntry[] = [
  {
    code: "850",
    name: "Purchase Order",
    direction: "inbound",
    category: "retail_core",
    description: "Customer/buyer sends order — line items, ship-to, dates, PO number.",
    implemented: true,
    commonPartners: ["Walmart", "Target", "Amazon", "Costco", "Kroger", "Home Depot"],
  },
  {
    code: "855",
    name: "Purchase Order Acknowledgment",
    direction: "outbound",
    category: "retail_core",
    description: "Supplier confirms, rejects, or changes the PO.",
    implemented: true,
  },
  {
    code: "856",
    name: "Advance Ship Notice (ASN)",
    direction: "outbound",
    category: "retail_core",
    description: "Ship notice with carton/pallet hierarchy before goods arrive.",
    implemented: true,
  },
  {
    code: "810",
    name: "Invoice",
    direction: "outbound",
    category: "retail_core",
    description: "Electronic invoice tied to PO and shipment.",
    implemented: true,
  },
  {
    code: "846",
    name: "Inventory Inquiry / Advice",
    direction: "bidirectional",
    category: "retail_core",
    description: "Share on-hand and available inventory for VMI or drop-ship.",
    implemented: true,
  },
  {
    code: "997",
    name: "Functional Acknowledgment",
    direction: "bidirectional",
    category: "general",
    description: "Confirms EDI file received and syntactically valid.",
    implemented: true,
  },
  {
    code: "860",
    name: "Purchase Order Change",
    direction: "inbound",
    category: "retail_extended",
    description: "Buyer changes an existing PO — common at Home Depot and others.",
    implemented: true,
  },
  {
    code: "865",
    name: "Purchase Order Change Acknowledgment",
    direction: "outbound",
    category: "retail_extended",
    description: "Supplier response to PO change.",
    implemented: false,
  },
  {
    code: "820",
    name: "Payment Order / Remittance Advice",
    direction: "inbound",
    category: "financial",
    description: "Payment and remittance detail from buyer.",
    implemented: true,
  },
  {
    code: "812",
    name: "Credit / Debit Adjustment",
    direction: "bidirectional",
    category: "financial",
    description: "Deductions, chargebacks, and credit memos.",
    implemented: false,
  },
  {
    code: "832",
    name: "Price / Sales Catalog",
    direction: "outbound",
    category: "retail_extended",
    description: "Item catalog and pricing updates.",
    implemented: false,
  },
  {
    code: "852",
    name: "Product Activity Data",
    direction: "outbound",
    category: "retail_extended",
    description: "Point-of-sale and product movement data.",
    implemented: false,
  },
  {
    code: "867",
    name: "Product Transfer and Resale Report",
    direction: "outbound",
    category: "retail_extended",
    description: "Transfer and resale reporting.",
    implemented: false,
  },
  {
    code: "864",
    name: "Text Message",
    direction: "bidirectional",
    category: "general",
    description: "Free-form business messages between partners.",
    implemented: false,
  },
  {
    code: "940",
    name: "Warehouse Shipping Order",
    direction: "outbound",
    category: "warehouse",
    description: "Request to warehouse to ship goods.",
    implemented: false,
  },
  {
    code: "945",
    name: "Warehouse Shipping Advice",
    direction: "inbound",
    category: "warehouse",
    description: "Warehouse confirms shipment.",
    implemented: false,
  },
  {
    code: "943",
    name: "Warehouse Stock Transfer Shipment Advice",
    direction: "outbound",
    category: "warehouse",
    description: "Stock transfer shipment from warehouse.",
    implemented: false,
  },
  {
    code: "944",
    name: "Warehouse Stock Transfer Receipt Advice",
    direction: "inbound",
    category: "warehouse",
    description: "Warehouse receipt of transferred stock.",
    implemented: false,
  },
  {
    code: "204",
    name: "Motor Carrier Load Tender",
    direction: "outbound",
    category: "transportation",
    description: "Tender load to carrier.",
    implemented: false,
  },
  {
    code: "214",
    name: "Transportation Carrier Shipment Status",
    direction: "inbound",
    category: "transportation",
    description: "Carrier status updates.",
    implemented: false,
  },
  {
    code: "753",
    name: "Request for Routing Instructions",
    direction: "outbound",
    category: "transportation",
    description: "Request routing from buyer.",
    implemented: false,
  },
  {
    code: "754",
    name: "Routing Instructions",
    direction: "inbound",
    category: "transportation",
    description: "Buyer routing guide response.",
    implemented: false,
  },
];

export const RETAIL_CORE_BUNDLE = ["846", "850", "855", "856", "810", "997"];

export function getTransactionCatalogEntry(code: string) {
  const normalized = code.replace(/^0+/, "").padStart(3, "0");
  return INDUSTRY_TRANSACTION_SETS.find((t) => t.code === normalized);
}

export function listImplementedTransactionCodes() {
  return INDUSTRY_TRANSACTION_SETS.filter((t) => t.implemented).map((t) => t.code);
}
