import type { TransactionPack } from "./types";

export const PACK_846: TransactionPack = {
  code: "846",
  name: "Inventory Inquiry / Advice",
  family: "Inventory",
  description: "Inventory balance or availability advice sent to trading partners, common in retail vendor-managed inventory programs.",
  direction: "outbound",
  commonSegments: ["ISA", "GS", "ST", "BIA", "REF", "N1", "LIN", "QTY", "SDQ", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 846" },
    { segment: "BIA", element: "01", label: "Transaction set purpose code", required: true, sourceHints: ["transaction_purpose", "report_type", "inventory_report_type"] },
    { segment: "BIA", element: "02", label: "Report number", required: true, sourceHints: ["report_number", "inventory_report_id", "document_number"] },
    { segment: "BIA", element: "03", label: "Report date", required: true, sourceHints: ["report_date", "inventory_date", "document_date"] },
    { segment: "REF", element: "02", qualifier: "IO", label: "Inventory reference number", required: false, sourceHints: ["inventory_reference", "warehouse_reference", "location_ref"] },
    { segment: "N1", element: "02", qualifier: "WH", label: "Warehouse name", required: false, sourceHints: ["warehouse_name", "location_name", "dc_name"] },
    { segment: "LIN", element: "03", label: "Buyer's part number", required: true, sourceHints: ["buyer_part_number", "customer_item", "buyer_item", "sku"] },
    { segment: "LIN", element: "05", label: "Vendor part number", required: false, sourceHints: ["vendor_part_number", "supplier_item", "vendor_sku"] },
    { segment: "QTY", element: "02", label: "Quantity available", required: true, sourceHints: ["qty_available", "on_hand_qty", "available_quantity", "inventory_qty"] },
    { segment: "QTY", element: "03", label: "Unit of measure", required: true, sourceHints: ["uom", "unit_of_measure", "uom_code"] },
  ],
  setupChecklist: [
    "[ ] Confirm inventory snapshot timing (daily, hourly, on-hand vs available-to-promise)",
    "[ ] Map warehouse/location identifiers per partner program",
    "[ ] Validate SKU / buyer part cross-reference logic",
    "[ ] Confirm zero-quantity and discontinued item handling",
    "[ ] Test multi-warehouse inventory reporting if required",
  ],
  commonQuestions: [
    "Does the partner require on-hand quantity, ATP, or both?",
    "Should inventory be reported at warehouse level or consolidated?",
    "How should discontinued or blocked items be represented?",
  ],
  testScenarios: [
    "Daily inventory snapshot with multiple SKUs",
    "Zero-quantity item reporting",
    "Multi-warehouse inventory advice",
  ],
};
