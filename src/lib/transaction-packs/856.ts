import type { TransactionPack } from "./types";

export const PACK_856: TransactionPack = {
  code: "856",
  name: "Ship Notice / ASN",
  family: "Fulfillment",
  description: "Advance ship notice communicating shipment contents, packaging, and tracking.",
  direction: "outbound",
  commonSegments: ["ISA", "GS", "ST", "BSN", "HL", "PRF", "MAN", "LIN", "SN1", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 856" },
    { segment: "BSN", element: "02", label: "Shipment identification", required: true, sourceHints: ["shipment_id", "asn_number", "ship_notice_number"] },
    { segment: "BSN", element: "03", label: "Shipment date", required: true, sourceHints: ["ship_date", "shipment_date", "asn_date"] },
    { segment: "BSN", element: "04", label: "Shipment time", required: false, sourceHints: ["ship_time", "shipment_time"] },
    { segment: "PRF", element: "01", label: "Purchase order number", required: true, sourceHints: ["purchase_order_number", "po_number", "order_number"] },
    { segment: "MAN", element: "02", label: "Tracking number", required: false, sourceHints: ["tracking_number", "pro_number", "carrier_tracking"] },
    { segment: "LIN", element: "03", label: "Buyer's part number", required: false, sourceHints: ["buyer_part_number", "customer_item", "buyer_item"] },
    { segment: "SN1", element: "02", label: "Quantity shipped", required: true, sourceHints: ["qty_shipped", "ship_quantity", "quantity_shipped"] },
    { segment: "SN1", element: "03", label: "Unit of measure", required: true, sourceHints: ["uom", "unit_of_measure", "uom_code"] },
  ],
  setupChecklist: [
    "[ ] Define HL hierarchy: shipment / order / pack / item",
    "[ ] Confirm carton vs pallet packaging structure",
    "[ ] Map carrier SCAC and tracking number source",
    "[ ] Validate shipped qty vs ordered qty rules",
    "[ ] Test partial shipment and backorder scenarios",
  ],
  commonQuestions: [
    "What HL structure does the partner require (S-O-P-I vs S-O-I)?",
    "Should MAN segments be sent per carton or per shipment?",
    "How should partial shipments reference the original PO line?",
  ],
  testScenarios: [
    "Full ship against single PO",
    "Partial shipment with multiple cartons",
    "ASN with tracking and carrier details",
  ],
};
