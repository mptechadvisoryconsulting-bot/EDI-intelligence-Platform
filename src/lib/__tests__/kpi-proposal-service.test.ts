import test from "node:test";
import assert from "node:assert/strict";
import { validateProposalSelection } from "@/lib/kpi/proposal-service";
import type { WorkbookInspection, WorkbookSheetPreview } from "@/lib/kpi/workbook-inspector";

function sheet(name: string, role: WorkbookSheetPreview["role"], headers: string[], sourceScore: number): WorkbookSheetPreview {
  return {
    name,
    role,
    headerRow: 1,
    headers,
    rowCount: 25,
    columnCount: headers.length,
    sourceScore,
    confidence: 0.95,
  };
}

const dashboard = sheet("Dashboard", "dashboard", ["Metric", "Value"], 5);
const allData = sheet("All Data", "source_data", ["Month", "Trading Partner", "Total Errors", "Fines"], 92);
const inspection: WorkbookInspection = {
  kind: "kpi_workbook",
  sheets: [dashboard, allData],
  candidateSourceSheets: [allData],
  dashboardSheets: ["Dashboard"],
  reportSheets: [],
  warnings: [],
};

test("KPI proposal accepts explicit fields from a deterministic source candidate", () => {
  const result = validateProposalSelection(
    inspection,
    "All Data",
    ["Month", "Trading Partner", "Month"],
    ["Total Errors", "Fines"]
  );

  assert.equal(result.sheet.name, "All Data");
  assert.deepEqual(result.dimensions, ["Month", "Trading Partner"]);
  assert.deepEqual(result.measures, ["Total Errors", "Fines"]);
});

test("KPI proposal rejects presentation sheets even when they have headers", () => {
  assert.throws(
    () => validateProposalSelection(inspection, "Dashboard", ["Metric"], ["Value"]),
    /not an approved workbook source candidate/
  );
});

test("KPI proposal rejects field names that were not observed in the selected source headers", () => {
  assert.throws(
    () => validateProposalSelection(inspection, "All Data", ["Month"], ["Invented Revenue"]),
    /Unknown KPI field selection/
  );
});

test("KPI proposal requires an explicit dimension or measure selection", () => {
  assert.throws(
    () => validateProposalSelection(inspection, "All Data", [], []),
    /at least one KPI dimension or measure/
  );
});
