import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateLayoutFields } from "../erp-layout/validate-layout";

describe("validateLayoutFields", () => {
  it("passes when positional fields have Rec/Start/Width", () => {
    const result = validateLayoutFields([
      {
        fieldName: "PO_NUMBER",
        interfaceColumn: "PO_NUMBER",
        interfaceStyle: "positional",
        recNumber: 1,
        startPosition: 10,
        charLimit: 20,
      },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.missingPositionCount, 0);
  });

  it("warns when positional fields are incomplete", () => {
    const result = validateLayoutFields([
      {
        fieldName: "PO_NUMBER",
        interfaceColumn: "PO_NUMBER",
        interfaceStyle: "positional",
        recNumber: 1,
      },
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.missingPositionCount, 1);
    assert.match(result.warnings[0] ?? "", /Start Column/);
  });
});
