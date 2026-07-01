import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_UPLOAD_BYTES, validateUpload } from "../uploads";

describe("validateUpload", () => {
  it("rejects oversized files", () => {
    const err = validateUpload("guide.pdf", MAX_UPLOAD_BYTES + 1);
    assert.match(err ?? "", /exceeds/);
  });

  it("rejects unknown extensions", () => {
    const err = validateUpload("malware.exe", 100);
    assert.match(err ?? "", /not allowed/);
  });

  it("accepts allowed csv uploads", () => {
    assert.equal(validateUpload("erp-fields.csv", 1024), null);
  });
});
