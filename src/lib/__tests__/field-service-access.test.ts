import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTechnicianStatusChangeAllowed,
  canViewWorkOrder,
  technicianAllowedNextStatuses,
} from "@/lib/business/field-service-access";

test("field technicians only see work assigned to themselves", () => {
  assert.equal(canViewWorkOrder("field_technician", "user-a", "user-a"), true);
  assert.equal(canViewWorkOrder("field_technician", "user-a", "user-b"), false);
  assert.equal(canViewWorkOrder("field_technician", "user-a", null), false);
});

test("dispatch and management field roles can view account work orders", () => {
  assert.equal(canViewWorkOrder("dispatcher", "user-a", "user-b"), true);
  assert.equal(canViewWorkOrder("manager", "user-a", null), true);
});

test("technician status changes stay within the mobile-work subset", () => {
  assert.deepEqual(technicianAllowedNextStatuses("dispatched"), ["in_progress"]);
  assert.deepEqual(technicianAllowedNextStatuses("in_progress"), ["completion_review", "on_hold"]);
  assert.doesNotThrow(() => assertTechnicianStatusChangeAllowed("field_technician", "in_progress", "completion_review"));
  assert.throws(
    () => assertTechnicianStatusChangeAllowed("field_technician", "completion_review", "completed"),
    /cannot perform/,
  );
  assert.doesNotThrow(() => assertTechnicianStatusChangeAllowed("dispatcher", "completion_review", "completed"));
});
