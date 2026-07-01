import type { TransactionPack } from "./types";

export const PACK_997: TransactionPack = {
  code: "997",
  name: "Functional Acknowledgment",
  family: "Control",
  description: "Acknowledges receipt and syntactic validity of an EDI interchange or functional group.",
  direction: "both",
  commonSegments: ["ISA", "GS", "ST", "AK1", "AK2", "AK9", "SE"],
  fields: [
    { segment: "ST", element: "01", label: "Transaction set identifier", required: true, sourceHints: [], transformation: "Constant: 997" },
    { segment: "AK1", element: "01", label: "Functional identifier code", required: true, sourceHints: ["functional_id", "gs_functional_code"] },
    { segment: "AK1", element: "02", label: "Group control number", required: true, sourceHints: ["group_control_number", "gs_control_number"] },
    { segment: "AK9", element: "01", label: "Functional group acknowledge code", required: true, sourceHints: ["ack_code", "fa_status"] },
    { segment: "AK9", element: "02", label: "Number of transaction sets included", required: true, sourceHints: ["st_count", "transaction_set_count"] },
    { segment: "AK9", element: "03", label: "Number of received transaction sets", required: true, sourceHints: ["received_st_count"] },
    { segment: "AK9", element: "04", label: "Number of accepted transaction sets", required: true, sourceHints: ["accepted_st_count"] },
  ],
  setupChecklist: [
    "[ ] Configure 997 generation for each inbound document type",
    "[ ] Map AK9 accept/reject codes to monitoring alerts",
    "[ ] Validate group control number matches original GS06",
  ],
  commonQuestions: [
    "Should 997 be sent at functional group level or transaction set level?",
    "What is the partner SLA for FA turnaround?",
  ],
  testScenarios: [
    "Accept FA for valid 850",
    "Reject FA with AK2 error segment for invalid element",
  ],
};
