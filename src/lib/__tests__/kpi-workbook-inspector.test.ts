import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { inspectKpiWorkbook } from "../kpi/workbook-inspector";

function workbookBuffer(sheets: Array<{ name: string; rows: unknown[][] }>) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  }
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("KPI workbook structure inspector", () => {
  it("does not mistake a first-position Dashboard sheet for source data", () => {
    const buffer = workbookBuffer([
      {
        name: "Dashboard",
        rows: [
          ["Operations KPI Dashboard"],
          ["Open Errors", 4],
          ["Total Fines", 120],
        ],
      },
      {
        name: "All Data",
        rows: [
          ["Monthly operational history"],
          [],
          ["Month", "Trading Partner", "Transaction Type", "Total Errors", "Open Errors", "Fines"],
          ["2026-01", "Partner A", "850", 12, 3, 50],
          ["2026-02", "Partner B", "810", 8, 2, 25],
          ["2026-03", "Partner A", "855", 5, 1, 0],
        ],
      },
      {
        name: "Automation QA",
        rows: [
          ["Rule", "Result"],
          ["row count", "pass"],
        ],
      },
    ]);

    const inspection = inspectKpiWorkbook(buffer);

    assert.deepEqual(inspection.dashboardSheets, ["Dashboard"]);
    assert.equal(inspection.candidateSourceSheets[0]?.name, "All Data");
    const source = inspection.sheets.find((sheet) => sheet.name === "All Data");
    assert.equal(source?.role, "source_data");
    assert.equal(source?.headerRow, 3);
    assert.deepEqual(source?.headers.slice(0, 3), ["Month", "Trading Partner", "Transaction Type"]);
    assert.ok((source?.sourceScore ?? 0) > 50);
  });

  it("classifies staging/report sheets but ranks strong source data first", () => {
    const buffer = workbookBuffer([
      {
        name: "Import Staging",
        rows: [
          ["Date", "Partner", "Status"],
          ["2026-01-01", "Partner A", "loaded"],
        ],
      },
      {
        name: "Fines Report",
        rows: [
          ["Month", "Partner", "Fine Amount"],
          ["2026-01", "Partner A", 15],
          ["2026-02", "Partner B", 20],
        ],
      },
      {
        name: "Historical Source Data",
        rows: [
          ["Date", "Customer", "Transaction", "Status", "Error Count", "Total Amount"],
          ["2026-01-01", "Customer A", "850", "open", 2, 100],
          ["2026-01-02", "Customer B", "810", "fixed", 1, 75],
          ["2026-01-03", "Customer A", "855", "fixed", 0, 125],
        ],
      },
    ]);

    const inspection = inspectKpiWorkbook(buffer);
    assert.equal(inspection.sheets.find((sheet) => sheet.name === "Import Staging")?.role, "staging");
    assert.equal(inspection.sheets.find((sheet) => sheet.name === "Fines Report")?.role, "report");
    assert.equal(inspection.candidateSourceSheets[0]?.name, "Historical Source Data");
  });

  it("fails safely when no reliable tabular source is present", () => {
    const buffer = workbookBuffer([
      { name: "Dashboard", rows: [["Executive Dashboard"], ["Updated", "Today"]] },
      { name: "Notes", rows: [["This workbook contains presentation notes only"]] },
    ]);

    const inspection = inspectKpiWorkbook(buffer);
    assert.equal(inspection.candidateSourceSheets.length, 0);
    assert.ok(inspection.warnings.some((warning) => warning.includes("No reliable source-data sheet")));
  });
});
