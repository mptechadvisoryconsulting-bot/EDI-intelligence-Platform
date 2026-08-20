CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "businessType" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AccountMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AccountMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StorefrontConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "themeContent" TEXT NOT NULL,
    "sectionContent" TEXT NOT NULL,
    "publishedVersionNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "StorefrontConfig_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StorefrontVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionNumber" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "snapshotContent" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    "storefrontId" TEXT NOT NULL,
    CONSTRAINT "StorefrontVersion_storefrontId_fkey" FOREIGN KEY ("storefrontId") REFERENCES "StorefrontConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "billingAddress" TEXT,
    "serviceAddress" TEXT,
    "externalRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "Customer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'product',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "unitLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "CatalogItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BusinessOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "orderType" TEXT NOT NULL DEFAULT 'product',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "BusinessOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "BusinessOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    CONSTRAINT "BusinessOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BusinessOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessOrderLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trackingRef" TEXT,
    "carrier" TEXT,
    "notes" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    CONSTRAINT "Fulfillment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BusinessOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FulfillmentLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" REAL NOT NULL DEFAULT 0,
    "fulfillmentId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    CONSTRAINT "FulfillmentLine_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FulfillmentLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "BusinessOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FulfillmentLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ServiceAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "recurrenceRule" TEXT NOT NULL,
    "nextRunAt" DATETIME,
    "lastGeneratedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "ServiceAgreement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "serviceAddress" TEXT,
    "scheduledStart" DATETIME,
    "scheduledEnd" DATETIME,
    "arrivalWindow" TEXT,
    "assignedUserId" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "checklistContent" TEXT,
    "signatureContent" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "serviceAgreementId" TEXT,
    CONSTRAINT "WorkOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BusinessOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_serviceAgreementId_fkey" FOREIGN KEY ("serviceAgreementId") REFERENCES "ServiceAgreement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "WorkOrderPart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrderPart_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "WorkTimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "minutes" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT NOT NULL,
    CONSTRAINT "WorkTimeEntry_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issuedAt" DATETIME,
    "dueAt" DATETIME,
    "finalizedAt" DATETIME,
    "finalizedSnapshotContent" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxTotal" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'awaiting_payment',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "workOrderId" TEXT,
    CONSTRAINT "Invoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BusinessOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL DEFAULT 0,
    "invoiceId" TEXT NOT NULL,
    "orderLineId" TEXT,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "BusinessOrderLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AccountAuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'app',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "AccountAuditEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");
CREATE UNIQUE INDEX "AccountMembership_accountId_userId_key" ON "AccountMembership"("accountId", "userId");
CREATE INDEX "AccountMembership_userId_status_idx" ON "AccountMembership"("userId", "status");
CREATE UNIQUE INDEX "StorefrontConfig_accountId_key" ON "StorefrontConfig"("accountId");
CREATE UNIQUE INDEX "StorefrontVersion_storefrontId_versionNumber_key" ON "StorefrontVersion"("storefrontId", "versionNumber");
CREATE INDEX "StorefrontVersion_storefrontId_state_idx" ON "StorefrontVersion"("storefrontId", "state");
CREATE INDEX "Customer_accountId_displayName_idx" ON "Customer"("accountId", "displayName");
CREATE INDEX "Customer_accountId_email_idx" ON "Customer"("accountId", "email");
CREATE UNIQUE INDEX "CatalogItem_accountId_sku_key" ON "CatalogItem"("accountId", "sku");
CREATE INDEX "CatalogItem_accountId_kind_active_idx" ON "CatalogItem"("accountId", "kind", "active");
CREATE UNIQUE INDEX "BusinessOrder_accountId_orderNumber_key" ON "BusinessOrder"("accountId", "orderNumber");
CREATE UNIQUE INDEX "BusinessOrder_accountId_idempotencyKey_key" ON "BusinessOrder"("accountId", "idempotencyKey");
CREATE INDEX "BusinessOrder_accountId_status_requestedAt_idx" ON "BusinessOrder"("accountId", "status", "requestedAt");
CREATE INDEX "BusinessOrder_customerId_requestedAt_idx" ON "BusinessOrder"("customerId", "requestedAt");
CREATE INDEX "BusinessOrderLine_orderId_idx" ON "BusinessOrderLine"("orderId");
CREATE UNIQUE INDEX "Fulfillment_accountId_idempotencyKey_key" ON "Fulfillment"("accountId", "idempotencyKey");
CREATE INDEX "Fulfillment_accountId_status_idx" ON "Fulfillment"("accountId", "status");
CREATE INDEX "Fulfillment_orderId_status_idx" ON "Fulfillment"("orderId", "status");
CREATE UNIQUE INDEX "FulfillmentLine_fulfillmentId_orderLineId_key" ON "FulfillmentLine"("fulfillmentId", "orderLineId");
CREATE INDEX "ServiceAgreement_accountId_status_nextRunAt_idx" ON "ServiceAgreement"("accountId", "status", "nextRunAt");
CREATE UNIQUE INDEX "WorkOrder_accountId_workOrderNumber_key" ON "WorkOrder"("accountId", "workOrderNumber");
CREATE UNIQUE INDEX "WorkOrder_accountId_idempotencyKey_key" ON "WorkOrder"("accountId", "idempotencyKey");
CREATE INDEX "WorkOrder_accountId_status_scheduledStart_idx" ON "WorkOrder"("accountId", "status", "scheduledStart");
CREATE INDEX "WorkOrder_accountId_assignedUserId_scheduledStart_idx" ON "WorkOrder"("accountId", "assignedUserId", "scheduledStart");
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");
CREATE INDEX "WorkTimeEntry_workOrderId_startedAt_idx" ON "WorkTimeEntry"("workOrderId", "startedAt");
CREATE INDEX "WorkTimeEntry_userId_startedAt_idx" ON "WorkTimeEntry"("userId", "startedAt");
CREATE UNIQUE INDEX "Invoice_accountId_invoiceNumber_key" ON "Invoice"("accountId", "invoiceNumber");
CREATE INDEX "Invoice_accountId_status_issuedAt_idx" ON "Invoice"("accountId", "status", "issuedAt");
CREATE INDEX "Invoice_accountId_paymentStatus_dueAt_idx" ON "Invoice"("accountId", "paymentStatus", "dueAt");
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
CREATE INDEX "AccountAuditEvent_accountId_entityType_entityId_createdAt_idx" ON "AccountAuditEvent"("accountId", "entityType", "entityId", "createdAt");
CREATE INDEX "AccountAuditEvent_accountId_createdAt_idx" ON "AccountAuditEvent"("accountId", "createdAt");
