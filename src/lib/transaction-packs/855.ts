import type { TransactionPack } from "./types";

export const PACK_855: TransactionPack = {
  code: "855",
  name: "Purchase Order Acknowledgment",
  family: "Procurement",
  description: "Supplier acknowledgment of a purchase order confirming acceptance, changes, or rejection at header and line level.",
  direction: "outbound",
  commonSegments: ["ISA", "GS", "ST", "BAK", "REF", "N1", "PO1", "ACK", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 855" },
    { segment: "BAK", element: "01", label: "Acknowledgment type", required: true, sourceHints: ["ack_type", "acknowledgment_type", "po_ack_code"] },
    { segment: "BAK", element: "03", label: "Purchase order number", required: true, sourceHints: ["purchase_order_number", "po_number", "order_number"] },
    { segment: "BAK", element: "04", label: "Purchase order date", required: true, sourceHints: ["order_date", "po_date", "document_date"] },
    { segment: "REF", element: "02", qualifier: "VN", label: "Vendor reference number", required: false, sourceHints: ["vendor_reference", "vendor_ref", "vendor_number"] },
    { segment: "N1", element: "02", qualifier: "ST", label: "Ship-to name", required: false, sourceHints: ["ship_to_name", "customer_name", "ship_to_party"] },
    { segment: "PO1", element: "01", label: "Assigned identification", required: false, sourceHints: ["line_number", "po_line_number", "line_id"] },
    { segment: "PO1", element: "07", label: "Buyer's part number", required: false, sourceHints: ["buyer_part_number", "customer_item", "buyer_item"] },
    { segment: "ACK", element: "01", label: "Line item status code", required: true, sourceHints: ["line_status", "ack_line_status", "item_ack_code"] },
    { segment: "ACK", element: "02", label: "Quantity acknowledged", required: true, sourceHints: ["qty_acknowledged", "ack_quantity", "confirmed_qty"] },
    { segment: "ACK", element: "03", label: "Unit of measure", required: true, sourceHints: ["uom", "unit_of_measure", "uom_code"] },
  ],
  setupChecklist: [
    "[ ] Define acknowledgment types (accept, accept with changes, reject)",
    "[ ] Map line status codes to ERP order confirmation states",
    "[ ] Confirm changed quantity/price/date handling on ACK segments",
    "[ ] Validate PO cross-reference to inbound 850",
    "[ ] Test partial acceptance and backorder scenarios",
  ],
  commonQuestions: [
    "Should header BAK status reflect all lines or worst-case line status?",
    "How are price or date changes communicated on the 855?",
    "Is a 855 required for every 850 or only changed orders?",
  ],
  testScenarios: [
    "Full PO acceptance with no changes",
    "Partial line acceptance with backorder",
    "PO rejection at header level",
  ],
};
