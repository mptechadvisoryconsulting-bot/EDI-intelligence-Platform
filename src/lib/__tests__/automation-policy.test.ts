import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAutomaticActionAllowed,
  automationDecisionFor,
  isNeverAutonomous,
  mayExecuteAutomatically,
  requiresHumanApproval,
} from "@/lib/business/automation-policy";

test("allows only governed deterministic routine work to execute automatically", () => {
  assert.equal(automationDecisionFor("canonical_sync"), "automatic");
  assert.equal(automationDecisionFor("kpi_refresh"), "automatic");
  assert.equal(automationDecisionFor("invoice_draft_preparation"), "automatic");
  assert.equal(mayExecuteAutomatically("recurring_work_order_generation"), true);
});

test("routes approval-sensitive business actions to a human decision", () => {
  assert.equal(requiresHumanApproval("kpi_definition_confirmation"), true);
  assert.equal(requiresHumanApproval("storefront_publish"), true);
  assert.equal(requiresHumanApproval("uncertain_import_mapping"), true);
  assert.equal(requiresHumanApproval("invoice_finalization"), true);
  assert.equal(requiresHumanApproval("authoritative_edi_mapping_change"), true);
});

test("hard-blocks unsafe autonomous actions", () => {
  assert.equal(isNeverAutonomous("money_movement"), true);
  assert.equal(isNeverAutonomous("cross_tenant_access"), true);
  assert.equal(isNeverAutonomous("finalized_record_rewrite"), true);
  assert.equal(isNeverAutonomous("ai_only_publish_or_mutation"), true);
  assert.equal(isNeverAutonomous("execute_imported_code"), true);
});

test("automatic assertion fails closed for approval and prohibited actions", () => {
  assert.equal(assertAutomaticActionAllowed("canonical_sync"), "canonical_sync");
  assert.throws(() => assertAutomaticActionAllowed("material_pricing_change"), /approval_required/);
  assert.throws(() => assertAutomaticActionAllowed("money_movement"), /never_autonomous/);
});
