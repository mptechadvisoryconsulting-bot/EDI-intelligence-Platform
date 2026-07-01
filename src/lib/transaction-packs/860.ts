import type { TransactionPack } from "./types";

export const PACK_860: TransactionPack = {
  code: "860",
  name: "Purchase Order Change",
  family: "Procurement",
  description: "Buyer changes an existing purchase order — quantity, dates, or line cancellations.",
  direction: "inbound",
  commonSegments: ["ISA", "GS", "ST", "BCH", "REF", "POC", "CTT", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 860" },
    { segment: "BCH", element: "01", label: "Transaction set purpose code", required: true, sourceHints: ["change_type", "purpose_code"] },
    { segment: "BCH", element: "03", label: "Purchase order number", required: true, sourceHints: ["purchase_order_number", "po_number", "original_po"] },
    { segment: "BCH", element: "06", label: "Change order date", required: true, sourceHints: ["change_date", "po_change_date"] },
    { segment: "POC", element: "01", label: "Line item change code", required: true, sourceHints: ["line_change_code", "change_action"] },
    { segment: "POC", element: "02", label: "Quantity ordered", required: false, sourceHints: ["quantity", "changed_qty", "order_qty"] },
    { segment: "POC", element: "03", label: "Unit of measure", required: false, sourceHints: ["uom", "unit_of_measure"] },
    { segment: "POC", element: "07", label: "Buyer's part number", required: false, sourceHints: ["buyer_part_number", "customer_item"] },
  ],
  setupChecklist: [
    "[ ] Link 860 to original 850 PO number in ERP",
    "[ ] Handle line cancel vs quantity change vs date change",
    "[ ] Test Home Depot / partner-specific 860 scenarios",
  ],
  commonQuestions: [
    "Does the ERP create a new revision or update in place on PO change?",
    "Are partial line cancellations supported?",
  ],
  testScenarios: [
    "860 quantity increase on existing PO line",
    "860 line cancellation",
    "860 ship date change only",
  ],
};
