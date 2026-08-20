import assert from "node:assert/strict";
import test from "node:test";
import { buildInvoiceSnapshot } from "@/lib/business/invoice-service";

test("buildInvoiceSnapshot captures stable finalized values", () => {
  const issuedAt = new Date("2026-08-20T14:00:00.000Z");
  const snapshot = buildInvoiceSnapshot({
    account: { id: "acct_1", name: "Example Services" },
    invoice: {
      id: "inv_1",
      invoiceNumber: "INV-1001",
      currency: "USD",
      dueAt: new Date("2026-09-19T14:00:00.000Z"),
      subtotalMinor: 12500,
      taxTotalMinor: 1000,
      totalMinor: 13500,
      paymentStatus: "awaiting_payment",
      notes: "Net 30",
    },
    customer: {
      id: "cust_1",
      displayName: "Jane Customer",
      companyName: "Customer Co",
      email: "jane@example.com",
      billingAddress: "100 Main St",
    },
    order: null,
    workOrder: { id: "wo_1", workOrderNumber: "WO-44" },
    lines: [
      {
        id: "line_1",
        description: "Service visit",
        quantity: 1,
        unitPriceMinor: 12500,
        amountMinor: 12500,
      },
    ],
    issuedAt,
  });

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.invoice.status, "finalized");
  assert.equal(snapshot.invoice.issuedAt, "2026-08-20T14:00:00.000Z");
  assert.equal(snapshot.invoice.totalMinor, 13500);
  assert.equal(snapshot.source.workOrderId, "wo_1");
  assert.equal(snapshot.source.orderId, null);
  assert.deepEqual(snapshot.lines, [
    {
      id: "line_1",
      description: "Service visit",
      quantity: 1,
      unitPriceMinor: 12500,
      amountMinor: 12500,
    },
  ]);
});

test("buildInvoiceSnapshot does not retain mutable input array references", () => {
  const lines = [
    {
      id: "line_1",
      description: "Inspection",
      quantity: 1,
      unitPriceMinor: 5000,
      amountMinor: 5000,
    },
  ];

  const snapshot = buildInvoiceSnapshot({
    account: { id: "acct_1", name: "Example" },
    invoice: {
      id: "inv_1",
      invoiceNumber: "INV-1",
      currency: "USD",
      dueAt: null,
      subtotalMinor: 5000,
      taxTotalMinor: 0,
      totalMinor: 5000,
      paymentStatus: "awaiting_payment",
      notes: null,
    },
    customer: {
      id: "cust_1",
      displayName: "Customer",
      companyName: null,
      email: null,
      billingAddress: null,
    },
    order: { id: "ord_1", orderNumber: "ORD-1" },
    workOrder: null,
    lines,
    issuedAt: new Date("2026-08-20T14:00:00.000Z"),
  });

  lines[0].description = "Changed after snapshot";
  assert.equal(snapshot.lines[0].description, "Inspection");
});
