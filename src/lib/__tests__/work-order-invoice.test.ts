import assert from "node:assert/strict";
import test from "node:test";
import { deriveWorkOrderInvoiceLines } from "@/lib/business/work-order-invoice";

test("derives part lines and aggregates completed labor minutes", () => {
  const lines = deriveWorkOrderInvoiceLines({
    parts: [
      { description: "Filter", quantity: 2, unitPriceMinor: 1250 },
      { description: "Seal", quantity: 1, unitPriceMinor: 500 },
    ],
    timeEntries: [{ minutes: 30 }, { minutes: 45 }, { minutes: null }],
    laborRateMinorPerHour: 12000,
  });

  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], { description: "Filter", quantity: 2, unitPriceMinor: 1250 });
  assert.deepEqual(lines[1], { description: "Seal", quantity: 1, unitPriceMinor: 500 });
  assert.equal(lines[2]?.description, "Labor (75 minutes)");
  assert.equal(lines[2]?.quantity, 1.25);
  assert.equal(lines[2]?.unitPriceMinor, 12000);
});

test("requires an explicit labor rate when completed labor exists", () => {
  assert.throws(
    () => deriveWorkOrderInvoiceLines({ parts: [], timeEntries: [{ minutes: 60 }] }),
    /Labor rate is required/,
  );
});

test("does not invent billable work when no priced source records exist", () => {
  assert.throws(
    () => deriveWorkOrderInvoiceLines({ parts: [], timeEntries: [{ minutes: null }] }),
    /no billable parts or labor/,
  );
});

test("rejects invalid stored labor durations", () => {
  assert.throws(
    () => deriveWorkOrderInvoiceLines({ parts: [], timeEntries: [{ minutes: -15 }], laborRateMinorPerHour: 10000 }),
    /invalid completed duration/,
  );
});
