export const AUTOMATION_DECISIONS = ["automatic", "approval_required", "never_autonomous"] as const;

export type AutomationDecision = (typeof AUTOMATION_DECISIONS)[number];

export type AutomationAction =
  | "canonical_sync"
  | "kpi_refresh"
  | "status_propagation"
  | "recurring_work_order_generation"
  | "invoice_draft_preparation"
  | "storefront_downstream_linking"
  | "attention_item_creation"
  | "kpi_definition_confirmation"
  | "storefront_publish"
  | "uncertain_import_mapping"
  | "material_pricing_change"
  | "invoice_finalization"
  | "authoritative_edi_mapping_change"
  | "money_movement"
  | "destructive_history_deletion"
  | "cross_tenant_access"
  | "finalized_record_rewrite"
  | "ai_only_publish_or_mutation"
  | "execute_imported_code";

const POLICY: Readonly<Record<AutomationAction, AutomationDecision>> = {
  canonical_sync: "automatic",
  kpi_refresh: "automatic",
  status_propagation: "automatic",
  recurring_work_order_generation: "automatic",
  invoice_draft_preparation: "automatic",
  storefront_downstream_linking: "automatic",
  attention_item_creation: "automatic",
  kpi_definition_confirmation: "approval_required",
  storefront_publish: "approval_required",
  uncertain_import_mapping: "approval_required",
  material_pricing_change: "approval_required",
  invoice_finalization: "approval_required",
  authoritative_edi_mapping_change: "approval_required",
  money_movement: "never_autonomous",
  destructive_history_deletion: "never_autonomous",
  cross_tenant_access: "never_autonomous",
  finalized_record_rewrite: "never_autonomous",
  ai_only_publish_or_mutation: "never_autonomous",
  execute_imported_code: "never_autonomous",
};

export function automationDecisionFor(action: AutomationAction): AutomationDecision {
  return POLICY[action];
}

export function mayExecuteAutomatically(action: AutomationAction): boolean {
  return automationDecisionFor(action) === "automatic";
}

export function requiresHumanApproval(action: AutomationAction): boolean {
  return automationDecisionFor(action) === "approval_required";
}

export function isNeverAutonomous(action: AutomationAction): boolean {
  return automationDecisionFor(action) === "never_autonomous";
}

export function assertAutomaticActionAllowed(action: AutomationAction) {
  const decision = automationDecisionFor(action);
  if (decision !== "automatic") {
    throw new Error(`Automation action ${action} is ${decision} and cannot execute automatically`);
  }
  return action;
}
