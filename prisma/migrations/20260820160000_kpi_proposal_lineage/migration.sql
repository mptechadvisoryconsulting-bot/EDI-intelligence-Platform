CREATE TABLE "KpiDashboardProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceType" TEXT NOT NULL DEFAULT 'workbook',
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentSha256" TEXT NOT NULL,
    "sourceSheet" TEXT NOT NULL,
    "headerRow" INTEGER NOT NULL,
    "dimensionContent" TEXT NOT NULL,
    "measureContent" TEXT NOT NULL,
    "sourceEvidence" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "confirmedAt" DATETIME,
    "rejectedAt" DATETIME,
    "reviewedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiDashboardProposal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KpiDashboardProposal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KpiDashboardProposal_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KpiDashboardProposal_accountId_contentSha256_sourceSheet_revision_key"
ON "KpiDashboardProposal"("accountId", "contentSha256", "sourceSheet", "revision");

CREATE INDEX "KpiDashboardProposal_accountId_status_createdAt_idx"
ON "KpiDashboardProposal"("accountId", "status", "createdAt");
