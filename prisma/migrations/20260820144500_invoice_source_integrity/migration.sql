-- Prevent duplicate invoicing of the same canonical billable source.
-- SQLite partial unique indexes allow unrelated NULL source columns while
-- enforcing uniqueness whenever an order/work-order source is present.
CREATE UNIQUE INDEX "Invoice_accountId_orderId_unique_source"
ON "Invoice"("accountId", "orderId")
WHERE "orderId" IS NOT NULL;

CREATE UNIQUE INDEX "Invoice_accountId_workOrderId_unique_source"
ON "Invoice"("accountId", "workOrderId")
WHERE "workOrderId" IS NOT NULL;
