import type { TransactionPack } from "./types";

export const PACK_820: TransactionPack = {
  code: "820",
  name: "Payment Order / Remittance Advice",
  family: "Financial",
  description: "Payment and remittance detail from buyer — ties invoices to payment.",
  direction: "inbound",
  commonSegments: ["ISA", "GS", "ST", "BPR", "TRN", "REF", "RMR", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 820" },
    { segment: "BPR", element: "01", label: "Transaction handling code", required: true, sourceHints: ["payment_handling", "bpr_code"] },
    { segment: "BPR", element: "02", label: "Monetary amount", required: true, sourceHints: ["payment_amount", "remittance_amount", "total_paid"] },
    { segment: "BPR", element: "04", label: "Payment method code", required: false, sourceHints: ["payment_method", "payment_type"] },
    { segment: "TRN", element: "02", label: "Reference identification", required: true, sourceHints: ["payment_reference", "check_number", "trace_number"] },
    { segment: "RMR", element: "01", label: "Reference identification qualifier", required: true, sourceHints: ["ref_qualifier", "invoice_ref_type"] },
    { segment: "RMR", element: "02", label: "Invoice number", required: true, sourceHints: ["invoice_number", "inv_no", "reference_number"] },
    { segment: "RMR", element: "04", label: "Payment amount", required: false, sourceHints: ["line_payment_amount", "invoice_paid_amount"] },
  ],
  setupChecklist: [
    "[ ] Map remittance to open AR invoices in ERP",
    "[ ] Handle deductions and short-pay on RMR segments",
    "[ ] Reconcile 820 totals to bank deposit",
  ],
  commonQuestions: [
    "Are chargebacks sent as 812 or embedded in 820 RMR adjustments?",
    "Which invoice reference qualifier does the partner use?",
  ],
  testScenarios: [
    "Full payment remittance for single invoice",
    "Multi-invoice remittance with short-pay",
  ],
};
