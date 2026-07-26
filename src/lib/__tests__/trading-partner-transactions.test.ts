import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  engineeringLane,
  lifecycleStateFromLegacy,
  normalizePartnerName,
} from "../trading-partner-transactions";

describe("Trading Partner Transaction domain", () => {
  it("normalizes partner identity without changing its display name contract", () => {
    assert.equal(normalizePartnerName("  WalMart   Stores  "), "walmart stores");
  });

  it("maps legacy lifecycle states into the canonical transaction lifecycle", () => {
    assert.equal(lifecycleStateFromLegacy("draft", "pending"), "specification_received");
    assert.equal(lifecycleStateFromLegacy("draft", "in_review"), "technical_assessment");
    assert.equal(lifecycleStateFromLegacy("approved", "approved"), "ready_for_go_live");
    assert.equal(lifecycleStateFromLegacy("production", "approved"), "production");
    assert.equal(lifecycleStateFromLegacy("revision", "pending"), "revision");
  });

  it("derives a work queue lane from lifecycle state", () => {
    assert.equal(engineeringLane("technical_assessment"), "technical_review");
    assert.equal(engineeringLane("mapping"), "needs_mapping");
    assert.equal(engineeringLane("customer_testing"), "testing");
    assert.equal(engineeringLane("ready_for_go_live"), "ready_for_go_live");
    assert.equal(engineeringLane("revision"), "production_changes");
    assert.equal(engineeringLane("production"), null);
  });
});
