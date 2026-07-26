import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDocumentContent } from "@/lib/parsers/document-parser";

describe("structured requirement parsing", () => {
  it("preserves repeated segment elements in different loop contexts", async () => {
    const guide = [
      "850 Purchase Order",
      "Header",
      "REF02 Vendor number required",
      "PO1 Loop (2000)",
      "PO107 UPC required 12 numeric",
      "REF02 Vendor item number conditional when customer item differs",
      "Summary",
      "CTT01 Line count required",
    ].join("\n");

    const parsed = await parseDocumentContent(
      Buffer.from(guide),
      "guide.txt",
      "text/plain",
      "guide"
    );

    const refs = parsed.targetFields.filter(
      (field) => field.segment === "REF" && field.element === "02"
    );
    assert.equal(refs.length, 2);
    assert.deepEqual(
      refs.map((field) => field.loopPath),
      ["Header", "PO1 Loop 2000"]
    );
    assert.equal(
      parsed.targetFields.find((field) => field.segment === "PO1" && field.element === "07")
        ?.expectedFormat,
      "12 numeric"
    );
  });

  it("normalizes hierarchy metadata from requirement CSV files", async () => {
    const csv = [
      "Loop Path,Parent,Segment,Element,Required,Description,Expected Format,Condition",
      "Header,Header,BEG,BEG03,Yes,Purchase Order Number,20 alphanumeric,",
      "PO1 Loop 2000,PO1,REF,REF02,Conditional,Vendor Item Number,30 alphanumeric,When REF01 = VN",
    ].join("\n");

    const parsed = await parseDocumentContent(
      Buffer.from(csv),
      "requirements.csv",
      "text/csv",
      "mapping_sheet"
    );

    assert.equal(parsed.targetFields[0].element, "03");
    assert.equal(parsed.targetFields[0].loopPath, "Header");
    assert.equal(parsed.targetFields[1].usage, "conditional");
    assert.equal(parsed.targetFields[1].parent, "PO1");
  });
});
