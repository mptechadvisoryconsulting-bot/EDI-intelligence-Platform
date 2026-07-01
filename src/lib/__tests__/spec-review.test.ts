import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSpecReviewReport } from "../spec-review/feasibility";

describe("buildSpecReviewReport", () => {
  it("marks supported transactions as ready when in project scope", () => {
    const report = buildSpecReviewReport({
      transactions: "850,856",
      tradingPartner: "Walmart",
      translatorTarget: "IBM Sterling",
      erpSystem: "Oracle Fusion",
      customer: "Acme",
      documents: [
        {
          id: "1",
          name: "850-guide.txt",
          type: "guide",
          status: "parsed",
          parsedContent: JSON.stringify({
            kind: "guide",
            targetFields: [{ segment: "BEG", element: "03", required: true }],
            sourceFields: [],
            segments: [],
            transactionSets: ["850"],
            testScenarios: [],
            rawExcerpt: "",
            warnings: [],
          }),
          filePath: null,
          originalFileName: null,
          mimeType: null,
          fileSize: null,
          parseSummary: null,
          parsedAt: null,
          createdAt: new Date(),
          projectId: "p1",
        },
      ],
    });

    assert.equal(report.canProduceNow, true);
    assert.ok(report.transactionFeasibility.some((t) => t.code === "850" && t.status === "ready"));
    assert.match(report.customerFeasibilityEmail, /850/);
  });

  it("flags unsupported transaction codes", () => {
    const report = buildSpecReviewReport({
      transactions: "999",
      tradingPartner: "Test",
      translatorTarget: "IBM Sterling",
      erpSystem: "Oracle",
      customer: "Acme",
      documents: [],
    });

    assert.ok(report.transactionFeasibility.some((t) => t.status === "unsupported"));
    assert.equal(report.canProduceNow, false);
  });
});
