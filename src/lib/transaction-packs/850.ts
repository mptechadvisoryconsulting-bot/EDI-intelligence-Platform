import type { TransactionPack } from "./types";

export const PACK_850: TransactionPack = {
  code: "850",
  name: "Purchase Order",
  family: "Procurement",
  description: "Customer purchase order sent to supplier/vendor for fulfillment.",
  direction: "inbound",
  commonSegments: ["ISA", "GS", "ST", "BEG", "REF", "N1", "PO1", "CTT", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 850" },
    { segment: "BEG", element: "03", label: "Purchase order number", required: true, sourceHints: ["purchase_order_number", "po_number", "order_number", "po_num"] },
    { segment: "BEG", element: "05", label: "Purchase order date", required: true, sourceHints: ["order_date", "po_date", "document_date"] },
    { segment: "REF", element: "02", qualifier: "VN", label: "Vendor reference number", required: false, sourceHints: ["vendor_reference", "vendor_ref", "vendor_number"] },
    { segment: "N1", element: "02", qualifier: "ST", label: "Ship-to name", required: false, sourceHints: ["ship_to_name", "customer_name", "ship_to_party"] },
    { segment: "PO1", element: "02", label: "Quantity ordered", required: true, sourceHints: ["quantity", "order_qty", "qty_ordered"] },
    { segment: "PO1", element: "03", label: "Unit of measure", required: true, sourceHints: ["uom", "unit_of_measure", "uom_code"] },
    { segment: "PO1", element: "04", label: "Unit price", required: false, sourceHints: ["unit_price", "price", "item_price"] },
    { segment: "PO1", element: "07", label: "Buyer's part number", required: false, sourceHints: ["buyer_part_number", "customer_item", "buyer_item"] },
    { segment: "PO1", element: "09", label: "Vendor part number", required: false, sourceHints: ["vendor_part_number", "supplier_item", "sku"] },
  ],
  setupChecklist: [
    "[ ] Confirm 850 PO number source and uniqueness rules",
    "[ ] Validate ship-to vs bill-to party logic",
    "[ ] Confirm line-level UOM normalization to X12 code list 355",
    "[ ] Test partial and changed PO scenarios",
  ],
  commonQuestions: [
    "Should REF*VN be sent on every PO or only for drop-ship orders?",
    "Are line-level dates required or header date only?",
    "Which address source should be used when multiple ship-to locations exist?",
  ],
  testScenarios: [
    "Standard PO with single line item",
    "Multi-line PO with mixed UOM codes",
    "PO with vendor reference qualifier",
  ],
};
