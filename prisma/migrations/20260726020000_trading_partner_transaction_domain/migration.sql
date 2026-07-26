CREATE TABLE "TradingPartner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "TradingPartner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TradingPartnerTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionCode" TEXT NOT NULL,
    "transactionName" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "businessStream" TEXT NOT NULL DEFAULT 'default',
    "lifecycleState" TEXT NOT NULL DEFAULT 'specification_received',
    "currentVersion" TEXT NOT NULL DEFAULT '1.0',
    "productionVersion" TEXT,
    "legacyProjectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tradingPartnerId" TEXT NOT NULL,
    "interfaceDefinitionId" TEXT,
    CONSTRAINT "TradingPartnerTransaction_tradingPartnerId_fkey" FOREIGN KEY ("tradingPartnerId") REFERENCES "TradingPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradingPartnerTransaction_interfaceDefinitionId_fkey" FOREIGN KEY ("interfaceDefinitionId") REFERENCES "TransactionInterfaceDefinition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TransactionRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "lifecycleState" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "goLiveAt" DATETIME,
    "legacyProjectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "transactionId" TEXT NOT NULL,
    CONSTRAINT "TransactionRevision_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TradingPartnerTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LegacyImplementationLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyProjectId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'source',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionId" TEXT NOT NULL,
    CONSTRAINT "LegacyImplementationLink_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TradingPartnerTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TradingPartner_ownerId_normalizedName_key" ON "TradingPartner"("ownerId", "normalizedName");
CREATE INDEX "TradingPartner_ownerId_status_idx" ON "TradingPartner"("ownerId", "status");
CREATE UNIQUE INDEX "TradingPartnerTransaction_tradingPartnerId_transactionCode_direction_businessStream_key" ON "TradingPartnerTransaction"("tradingPartnerId", "transactionCode", "direction", "businessStream");
CREATE INDEX "TradingPartnerTransaction_legacyProjectId_idx" ON "TradingPartnerTransaction"("legacyProjectId");
CREATE INDEX "TradingPartnerTransaction_tradingPartnerId_lifecycleState_idx" ON "TradingPartnerTransaction"("tradingPartnerId", "lifecycleState");
CREATE UNIQUE INDEX "TransactionRevision_transactionId_version_key" ON "TransactionRevision"("transactionId", "version");
CREATE INDEX "TransactionRevision_legacyProjectId_idx" ON "TransactionRevision"("legacyProjectId");
CREATE UNIQUE INDEX "LegacyImplementationLink_transactionId_legacyProjectId_key" ON "LegacyImplementationLink"("transactionId", "legacyProjectId");
CREATE INDEX "LegacyImplementationLink_legacyProjectId_idx" ON "LegacyImplementationLink"("legacyProjectId");
