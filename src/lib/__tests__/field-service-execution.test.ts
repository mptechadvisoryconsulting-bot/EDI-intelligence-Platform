import {
  completionReadiness,
  normalizeSignoffInput,
  normalizeWorkOrderChecklist,
  parseStoredChecklist,
} from "@/lib/business/field-service-execution";

describe("field service execution validation", () => {
  test("normalizes a governed checklist and rejects duplicate ids", () => {
    const checklist = normalizeWorkOrderChecklist([
      { id: "arrival", label: "Confirm arrival", required: true, completed: true },
      { id: "photos", label: "Take completion photos", required: false, completed: false, note: "Optional" },
    ]);

    expect(checklist).toHaveLength(2);
    expect(checklist[0]).toEqual({ id: "arrival", label: "Confirm arrival", required: true, completed: true });
    expect(() =>
      normalizeWorkOrderChecklist([
        { id: "same", label: "One", completed: false },
        { id: "same", label: "Two", completed: false },
      ]),
    ).toThrow("Checklist item ids must be unique");
  });

  test("completion requires every required checklist item and customer sign-off", () => {
    const incomplete = completionReadiness(
      [{ id: "required", label: "Required", required: true, completed: false }],
      null,
    );
    expect(incomplete.ready).toBe(false);
    expect(incomplete.blockers).toContain("Required checklist items are incomplete");
    expect(incomplete.blockers).toContain("Customer sign-off is required");

    const complete = completionReadiness(
      [{ id: "required", label: "Required", required: true, completed: true }],
      JSON.stringify({ signerName: "Customer" }),
    );
    expect(complete).toEqual({ ready: true, blockers: [] });
  });

  test("stored malformed checklist fails closed as an empty checklist", () => {
    expect(parseStoredChecklist("not json")).toEqual([]);
  });

  test("sign-off captures the actor and rejects empty signer data", () => {
    const signoff = normalizeSignoffInput(
      { signerName: " Alex Customer ", attestation: " Work completed as described. " },
      "user-1",
    );
    expect(signoff.signerName).toBe("Alex Customer");
    expect(signoff.attestation).toBe("Work completed as described.");
    expect(signoff.capturedByUserId).toBe("user-1");
    expect(Number.isNaN(Date.parse(signoff.acceptedAt))).toBe(false);

    expect(() => normalizeSignoffInput({ signerName: "", attestation: "ok" }, "user-1")).toThrow(
      "Signer name is required",
    );
  });
});
