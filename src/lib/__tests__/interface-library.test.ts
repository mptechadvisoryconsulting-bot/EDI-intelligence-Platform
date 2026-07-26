import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runImplementationAnalysis } from "../analysis/engine";
import { parseErpLayoutCsv } from "../erp-layout";

describe("transaction interface library", () => {
  it("preserves record structure, validation, and repeating metadata during import", () => {
    const fields = parseErpLayoutCsv(
      [
        "Record Type,Interface Column,Field Name,Rec Number,Start Column,Width,Data Type,Validation,Repeating",
        "Header,PO_NUMBER,PO Number,1,1,20,String,Required,No",
        "Detail,UPC,UPC,2,21,14,String,Numeric,Yes",
      ].join("\n")
    );

    assert.equal(fields.length, 2);
    assert.equal(fields[0].recordType, "Header");
    assert.equal(fields[0].validationRule, "Required");
    assert.equal(fields[1].recordType, "Detail");
    assert.equal(fields[1].repeating, true);
  });

  it("produces a structure comparison before field-level mapping", () => {
    const analysis = runImplementationAnalysis({
      parsedDocuments: [
        {
          kind: "guide",
          transactionSets: ["850"],
          segments: ["BEG", "PO1", "CTT"],
          sourceFields: [],
          targetFields: [
            { segment: "BEG", element: "03", loopPath: "Header", required: true },
            { segment: "PO1", element: "07", loopPath: "PO1 Loop 2000", required: true },
            { segment: "CTT", element: "01", loopPath: "Summary", required: true },
          ],
          testScenarios: [],
          rawExcerpt: "",
          warnings: [],
        },
      ],
      projectTransactions: "850",
      erpSystem: "Internal",
      tradingPartner: "Walmart",
      accountSourceFields: [
        { name: "PO Number", interfaceColumn: "PO_NUMBER", recordType: "Header" },
        { name: "UPC", interfaceColumn: "UPC", recordType: "Detail", repeating: true },
        { name: "Total Lines", interfaceColumn: "TOTAL_LINES", recordType: "Summary" },
      ],
    });

    const structure = analysis.artifacts.find(
      (artifact) => artifact.type === "interface_structure_comparison"
    );
    assert.ok(structure);
    assert.match(structure.content, /Internal transaction model: Header → Detail → Summary/);
    assert.match(structure.content, /PO1 Loop 2000 → Detail/);
  });
});
