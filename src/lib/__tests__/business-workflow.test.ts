import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountSlugForUser } from "../account-context";
import { allowedTransitions, assertWorkflowTransition, canTransition } from "../business/workflow";

describe("governed business workflows", () => {
  it("allows standard product fulfillment progression", () => {
    assert.equal(canTransition("product_order", "requested", "confirmed"), true);
    assert.equal(canTransition("product_order", "confirmed", "picking"), true);
    assert.equal(canTransition("product_order", "packed", "shipped"), true);
    assert.equal(canTransition("product_order", "shipped", "delivered"), true);
  });

  it("rejects impossible product order jumps", () => {
    assert.equal(canTransition("product_order", "requested", "delivered"), false);
    assert.throws(
      () => assertWorkflowTransition("product_order", "requested", "delivered"),
      /Invalid product_order transition/
    );
  });

  it("supports controlled field-service exception paths", () => {
    assert.deepEqual(allowedTransitions("work_order", "scheduled"), [
      "dispatched",
      "in_progress",
      "rescheduled",
      "no_show",
      "cancelled",
    ]);
    assert.equal(canTransition("work_order", "completion_review", "in_progress"), true);
    assert.equal(canTransition("work_order", "completed", "requested"), false);
  });

  it("keeps document status separate from payment status", () => {
    assert.equal(canTransition("invoice", "finalized", "draft"), false);
    assert.equal(canTransition("invoice", "finalized", "sent"), true);
    assert.equal(canTransition("invoice", "sent", "paid"), false);
    assert.equal(canTransition("payment_status", "awaiting_payment", "paid"), true);
    assert.equal(canTransition("payment_status", "paid", "past_due"), false);
  });
});

describe("account tenant slug", () => {
  it("is deterministic and uses complete user identity", () => {
    assert.equal(
      accountSlugForUser({ id: "clx1234567890abcd", username: "  My Business!  " }),
      "my-business-clx1234567890abcd"
    );
  });

  it("does not collide when normalized usernames and trailing id characters match", () => {
    const first = accountSlugForUser({ id: "user-alpha-12345678", username: "Acme" });
    const second = accountSlugForUser({ id: "user-bravo-12345678", username: " acme " });
    assert.notEqual(first, second);
  });
});
