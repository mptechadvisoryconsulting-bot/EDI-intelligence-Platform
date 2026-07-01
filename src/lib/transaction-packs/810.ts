import type { TransactionPack } from "./types";

export const PACK_810: TransactionPack = {
  code: "810",
  name: "Invoice",
  family: "Financial",
  description: "Electronic invoice for goods or services, often tied to PO and ASN references.",
  direction: "outbound",
  commonSegments: ["ISA", "GS", "ST", "BIG", "REF", "N1", "IT1", "TDS", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 810" },
    { segment: "BIG", element: "02", label: "Invoice date", required: true, sourceHints: ["invoice_date", "document_date", "bill_date"] },
    { segment: "BIG", element: "04", label: "Invoice number", required: true, sourceHints: ["invoice_number", "invoice_no", "bill_number"] },
    { segment: "BIG", element: "07", label: "Purchase order number", required: false, sourceHints: ["purchase_order_number", "po_number", "order_number"] },
    { segment: "REF", element: "02", qualifier: "IV", label: "Internal vendor number", required: false, sourceHints: ["vendor_number", "vendor_id", "internal_vendor"] },
    { segment: "N1", element: "02", qualifier: "BT", label: "Bill-to name", required: false, sourceHints: ["bill_to_name", "customer_name", "invoice_to_name"] },
    { segment: "IT1", element: "02", label: "Quantity invoiced", required: true, sourceHints: ["quantity", "qty_invoiced", "invoice_qty"] },
    { segment: "IT1", element: "03", label: "Unit of measure", required: true, sourceHints: ["uom", "unit_of_measure", "uom_code"] },
    { segment: "IT1", element: "04", label: "Unit price", required: true, sourceHints: ["unit_price", "price", "item_price"] },
    { segment: "TDS", element: "01", label: "Total invoice amount", required: true, sourceHints: ["invoice_total", "total_amount", "amount_due"] },
  ],
  setupChecklist: [
    "[ ] Confirm invoice number uniqueness and formatting",
    "[ ] Validate line totals roll up to TDS correctly",
    "[ ] Map tax, freight, and allowance segments if required",
    "[ ] Confirm PO and ASN reference requirements",
    "[ ] Test credit memo / adjustment scenarios if supported",
  ],
  commonQuestions: [
    "Does the partner require PO number on every invoice line or header only?",
    "Are taxes sent in separate TAX segments or embedded in line totals?",
    "What date format is required for invoice and due dates?",
  ],
  testScenarios: [
    "Standard invoice against single PO",
    "Invoice with freight and tax charges",
    "Multi-line invoice with mixed UOM",
  ],
};
