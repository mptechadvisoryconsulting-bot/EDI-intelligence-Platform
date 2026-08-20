import assert from "node:assert/strict";
import test from "node:test";
import {
  completionReadiness,
  normalizeSignoffInput,
  normalizeWorkOrderChecklist,
  parseStoredChecklist,
} from "@/lib/business/field-service-execution";

test("normalizes a governed checklist and rejects duplicate ids", () => {
  const checklist = normalizeWorkOrderChecklist([
    { id: "arrival", label: "Confirm arrival", required: true, completed: true },
    { id: "photos", label: "Take completion photos", required: false, completed: false, note: "Optional" },
  ]);

  assert.equal(checklist.length, 2);
  assert.deepEqual(checklist[0], { id: "arrival", label: "Confirm arrival", required: true, completed: true });
  assert.throws(
    () =>
      normalizeWorkOrderChecklist([
        { id: "same", label: "One", completed: false },
        { id: "same", label: "Two", completed: false },
      ]),
    /Checklist item ids must be unique/,
  );
});

test("completion requires every required checklist item and customer sign-off", () => {
  const incomplete = completionReadiness(
    [{ id: "required", label: "Required", required: true, completed: false }],
    null,
  );
  assert.equal(incomplete.ready, false);
  assert.equal(incomplete.blockers.includes("Required checklist items are incomplete"), true);
  assert.equal(incomplete.blockers.includes("Customer sign-off is required"), true);

  const complete = completionReadiness(
    [{ id: "required", label: "Required", required: true, completed: true }],
    JSON.stringify({ signerName: "Customer" }),
  );
  assert.deepEqual(complete, { ready: true, blockers: [] });
});

test("stored malformed checklist fails closed as an empty checklist", () => {
  assert.deepEqual(parseStoredChecklist("not json"), []);
});

test("sign-off captures the actor and rejects empty signer data", () => {
  const signoff = normalizeSignoffInput(
    { signerName: " Alex Customer ", attestation: " Work completed as described. " },
    "user-1",
  );
  assert.equal(signoff.signerName, "Alex Customer");
  assert.equal(signoff.attestation, "Work completed as described.");
  assert.equal(signoff.capturedByUserId, "user-1");
  assert.equal(Number.isNaN(Date.parse(signoff.acceptedAt)), false);

  assert.throws(
    () => normalizeSignoffInput({ signerName: "", attestation: "ok" }, "user-1"),
    /Signer name is required/,
  );
});
